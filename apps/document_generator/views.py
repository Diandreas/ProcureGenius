import os
import base64
import uuid as uuid_module
import threading
from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, render, redirect
from django.http import JsonResponse, FileResponse
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from .models import OrganizationDocument, HealthPackage, DiscountCoupon
from .serializers import OrganizationDocumentSerializer, HealthPackageSerializer
from apps.healthcare.pdf_helpers import HealthcarePDFMixin
from apps.laboratory.models import LabTestCategory, LabTest


# Job store partagé entre workers gunicorn via le cache Django.
# Clé = pdfjob:<uuid>, TTL = 1h.
class _PDF_JOBS_PROXY:
    @staticmethod
    def _k(job_id):
        return f'pdfjob:{job_id}'

    def __setitem__(self, job_id, value):
        cache.set(self._k(job_id), value, timeout=3600)

    def __getitem__(self, job_id):
        v = cache.get(self._k(job_id))
        if v is None:
            raise KeyError(job_id)
        return v

    def get(self, job_id, default=None):
        return cache.get(self._k(job_id), default)

    def update(self, job_id, patch):
        v = cache.get(self._k(job_id)) or {}
        v.update(patch)
        cache.set(self._k(job_id), v, timeout=3600)


_PDF_JOBS = _PDF_JOBS_PROXY()


def _static_image_b64(relative_path):
    """Load a static image from document_generator/static and return a base64 data URL."""
    static_dir = os.path.join(
        settings.BASE_DIR, 'apps', 'document_generator', 'static',
        'document_generator', 'images'
    )
    full_path = os.path.join(static_dir, relative_path)
    if not os.path.exists(full_path):
        return None
    ext = os.path.splitext(full_path)[1].lower()
    mime = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
    }.get(ext, 'image/jpeg')
    with open(full_path, 'rb') as f:
        data = base64.b64encode(f.read()).decode('utf-8')
    return f'data:{mime};base64,{data}'


def _load_centre_images():
    """Return dict of base64 data URLs for image_centre photos."""
    filenames = [
        'acceuil.jpg', 'accueil-reception.jpg', 'cabinet-consultation.jpg',
        'cabinet-gynecologie.jpg', 'consultation-medecin.jpg', 'equipe-medicale.jpg',
        'equipements-centrifugeuse-microscope.jpg', 'equipements-labo-biobase.jpg',
        'poste-analyse-biobase.jpg', 'prelevement-laboratoire.jpg',
        'prise-sang-prelevement.jpg', 'salle-attente-accueil.jpg',
        'salle-laboratoire-vue1.jpg',
        'DJERY-116.jpg', 'DJERY-120.jpg', 'DJERY-33.jpg',
        'FELI (16).jpg', 'FELI (17).jpg', 'JULIA (16).jpg', 'JULIA (23).jpg',
    ]
    result = {}
    for fn in filenames:
        key = fn.replace(' ', '_').replace('(', '').replace(')', '').replace('.jpg', '').replace('-', '_').lower()
        b64 = _static_image_b64(f'image_centre/{fn}')
        if b64:
            result[key] = b64
    return result


def _load_equipment_images():
    """Return dict of base64 data URLs for image_equipements."""
    static_dir = os.path.join(
        settings.BASE_DIR, 'apps', 'document_generator', 'static',
        'document_generator', 'images', 'image_equipements'
    )
    result = {}
    if os.path.isdir(static_dir):
        for fn in os.listdir(static_dir):
            stem = os.path.splitext(fn)[0]
            key = stem.replace('-', ' ').replace('_', ' ').title()
            b64 = _static_image_b64(f'image_equipements/{fn}')
            if b64:
                result[key] = b64
    return result


class HealthPackageViewSet(viewsets.ModelViewSet):
    serializer_class = HealthPackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'owner']:
            return HealthPackage.objects.all()
        elif user.organization:
            return HealthPackage.objects.filter(organization=user.organization)
        return HealthPackage.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(organization=user.organization)


class OrganizationDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'owner']:
            return OrganizationDocument.objects.all()
        elif user.organization:
            return OrganizationDocument.objects.filter(organization=user.organization)
        return OrganizationDocument.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(organization=user.organization)


class DocumentRenderView(APIView, HealthcarePDFMixin):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, doc_type, *args, **kwargs):
        organization = request.user.organization

        if not organization:
            return Response({"detail": "Aucune organisation associée."}, status=status.HTTP_400_BAD_REQUEST)

        document = OrganizationDocument.objects.filter(
            organization=organization,
            document_type=doc_type
        ).first()

        # Common images available in all templates
        logo_b64 = _static_image_b64('image1.jpg')
        lab_b64 = _static_image_b64('laboratory-563423_640.jpg')
        healthcare_b64 = _static_image_b64('healthcare-6930827_640.jpg')

        context = {
            'organization': organization,
            'document': document,
            'doc_type': doc_type,
            'logo_b64': logo_b64,
            'lab_b64': lab_b64,
            'healthcare_b64': healthcare_b64,
        }

        template_name = ""

        if doc_type == 'price_list_public':
            template_name = 'document_generator/pdf_templates/price_list.html'
            categories = LabTestCategory.objects.filter(organization=organization, is_active=True).prefetch_related('tests')
            context['categories'] = categories

        elif doc_type == 'price_list_subcontract':
            template_name = 'document_generator/pdf_templates/price_list_subcontract.html'
            categories = LabTestCategory.objects.filter(organization=organization, is_active=True).prefetch_related('tests')
            context['categories'] = categories

        elif doc_type in ('packs_catalog', 'bilans_list'):
            template_name = 'document_generator/pdf_templates/packs_catalog.html'
            packages = HealthPackage.objects.filter(organization=organization, is_active=True).order_by('display_order')
            grouped_packages = {}
            for pkg in packages:
                cat_name = dict(HealthPackage.CATEGORY_CHOICES).get(pkg.category, pkg.category)
                if cat_name not in grouped_packages:
                    grouped_packages[cat_name] = []
                grouped_packages[cat_name].append(pkg)
            context['grouped_packages'] = grouped_packages
            context['packages'] = packages
            context['centre_images'] = _load_centre_images()

        elif doc_type == 'services_list':
            template_name = 'document_generator/pdf_templates/services_list.html'
            from apps.invoicing.models import Product
            context['services'] = Product.objects.filter(
                organization=organization, product_type='service', is_active=True
            ).order_by('name')

        elif doc_type == 'full_catalog':
            template_name = 'document_generator/pdf_templates/full_catalog.html'
            context['categories'] = LabTestCategory.objects.filter(organization=organization, is_active=True).prefetch_related('tests')
            packages = HealthPackage.objects.filter(organization=organization, is_active=True).order_by('display_order')
            context['packages'] = packages
            grouped_packages = {}
            for pkg in packages:
                cat_name = dict(HealthPackage.CATEGORY_CHOICES).get(pkg.category, pkg.category)
                if cat_name not in grouped_packages:
                    grouped_packages[cat_name] = []
                grouped_packages[cat_name].append(pkg)
            context['grouped_packages'] = grouped_packages
            context['centre_images'] = _load_centre_images()
            context['equipment_images'] = _load_equipment_images()

        else:
            return Response({"detail": "Type de document non reconnu."}, status=status.HTTP_400_BAD_REQUEST)

        return self.render_to_pdf(
            template_name=template_name,
            context=context,
            filename=f"Document_{doc_type}_{organization.name}.pdf",
            organization=organization,
            attachment=True,
        )


# ─────────────────────────────────────────────────────────────
# PDF ASYNC — génération en arrière-plan
# ─────────────────────────────────────────────────────────────

def _build_pdf_context(doc_type, organization):
    """Construit le contexte commun pour les templates PDF."""
    logo_b64 = _static_image_b64('image1.jpg')
    lab_b64 = _static_image_b64('laboratory-563423_640.jpg')
    healthcare_b64 = _static_image_b64('healthcare-6930827_640.jpg')

    document = OrganizationDocument.objects.filter(
        organization=organization, document_type=doc_type
    ).first()

    context = {
        'organization': organization,
        'document': document,
        'doc_type': doc_type,
        'logo_b64': logo_b64,
        'lab_b64': lab_b64,
        'healthcare_b64': healthcare_b64,
    }

    if doc_type in ('price_list_public', 'price_list_subcontract', 'services_list'):
        context['categories'] = LabTestCategory.objects.filter(
            organization=organization, is_active=True
        ).prefetch_related('tests')

    if doc_type in ('packs_catalog', 'bilans_list', 'full_catalog'):
        packages = HealthPackage.objects.filter(
            organization=organization, is_active=True
        ).order_by('display_order')
        grouped = {}
        for pkg in packages:
            cat_name = dict(HealthPackage.CATEGORY_CHOICES).get(pkg.category, pkg.category)
            grouped.setdefault(cat_name, []).append(pkg)
        context['packages'] = packages
        context['grouped_packages'] = grouped
        context['centre_images'] = _load_centre_images()

    if doc_type == 'full_catalog':
        context['equipment_images'] = _load_equipment_images()

    if doc_type == 'services_list':
        from apps.invoicing.models import Product
        context['services'] = Product.objects.filter(
            organization=organization,
            product_type='service',
            is_active=True,
        ).order_by('name')

    template_map = {
        'price_list_public': 'document_generator/pdf_templates/price_list.html',
        'price_list_subcontract': 'document_generator/pdf_templates/price_list_subcontract.html',
        'packs_catalog': 'document_generator/pdf_templates/packs_catalog.html',
        'bilans_list': 'document_generator/pdf_templates/packs_catalog.html',
        'full_catalog': 'document_generator/pdf_templates/full_catalog.html',
        'services_list': 'document_generator/pdf_templates/services_list.html',
    }
    template_name = template_map.get(doc_type)
    return context, template_name


def _run_pdf_job(job_id, doc_type, organization_id):
    """Thread worker : génère le PDF et met à jour _PDF_JOBS."""
    from django.template.loader import render_to_string
    from apps.accounts.models import Organization

    _PDF_JOBS.update(job_id, {'status': 'running'})
    try:
        organization = Organization.objects.get(id=organization_id)
        context, template_name = _build_pdf_context(doc_type, organization)

        if not template_name:
            _PDF_JOBS.update(job_id, {'status': 'error', 'error': 'Type non reconnu'})
            return

        html_string = render_to_string(template_name, context)

        # Génère le PDF via WeasyPrint
        from weasyprint import HTML
        out_dir = os.path.join(settings.MEDIA_ROOT, 'pdf_jobs')
        os.makedirs(out_dir, exist_ok=True)
        file_path = os.path.join(out_dir, f'{job_id}.pdf')
        HTML(string=html_string, base_url=settings.BASE_DIR).write_pdf(file_path)

        _PDF_JOBS.update(job_id, {
            'status': 'done',
            'file_path': file_path,
            'filename': f"{doc_type}_{organization.name}.pdf",
        })
    except Exception as e:
        _PDF_JOBS.update(job_id, {'status': 'error', 'error': str(e)})


class DocumentRenderAsyncView(APIView):
    """POST → lance la génération PDF en arrière-plan, retourne un job_id."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, doc_type, *args, **kwargs):
        organization = request.user.organization
        if not organization:
            return Response({'detail': 'Aucune organisation.'}, status=400)

        valid_types = ['price_list_public', 'price_list_subcontract', 'packs_catalog',
                       'bilans_list', 'full_catalog', 'services_list']
        if doc_type not in valid_types:
            return Response({'detail': 'Type de document non reconnu.'}, status=400)

        job_id = str(uuid_module.uuid4())
        _PDF_JOBS[job_id] = {
            'status': 'pending',
            'doc_type': doc_type,
            'organization_id': str(organization.id),
            'created_at': timezone.now().isoformat(),
            'file_path': None,
            'error': None,
        }

        t = threading.Thread(
            target=_run_pdf_job,
            args=(job_id, doc_type, organization.id),
            daemon=True,
        )
        t.start()

        return Response({'job_id': job_id, 'status': 'pending'}, status=202)


class PDFJobStatusView(APIView):
    """GET /documents/jobs/<job_id>/status/ → {status, download_url?}"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id, *args, **kwargs):
        job = _PDF_JOBS.get(job_id)
        if not job:
            return Response({'detail': 'Job introuvable.'}, status=404)

        resp = {'status': job['status'], 'doc_type': job.get('doc_type')}
        if job['status'] == 'done':
            resp['download_url'] = f"/api/v1/documents/jobs/{job_id}/download/"
        if job['status'] == 'error':
            resp['error'] = job.get('error', 'Erreur inconnue')
        return Response(resp)


class PDFJobDownloadView(APIView):
    """GET /documents/jobs/<job_id>/download/ → téléchargement du PDF."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id, *args, **kwargs):
        job = _PDF_JOBS.get(job_id)
        if not job or job['status'] != 'done':
            return Response({'detail': 'PDF non disponible.'}, status=404)

        file_path = job['file_path']
        if not os.path.exists(file_path):
            return Response({'detail': 'Fichier introuvable.'}, status=404)

        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=job.get('filename', f'{job_id}.pdf'),
            content_type='application/pdf',
        )


# ─────────────────────────────────────────────────────────────
# COUPONS DE RÉDUCTION
# ─────────────────────────────────────────────────────────────

class CouponViewSet(viewsets.ModelViewSet):
    """CRUD coupons — réservé aux admin/owner."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in ['admin', 'owner']:
            return DiscountCoupon.objects.none()
        return DiscountCoupon.objects.filter(organization=user.organization).select_related('created_by')

    def get_serializer_class(self):
        from .serializers import DiscountCouponSerializer
        return DiscountCouponSerializer

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        coupon = self.get_object()
        if coupon.status == 'used':
            return Response({'detail': 'Coupon déjà utilisé, impossible d\'annuler.'}, status=400)
        coupon.status = 'cancelled'
        coupon.save(update_fields=['status', 'updated_at'])
        return Response({'detail': 'Coupon annulé.'})


class CouponValidateView(APIView):
    """Validation d'un coupon depuis la caisse (tous les rôles authentifiés)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        invoice_amount = request.data.get('invoice_amount', 0)

        if not code:
            return Response({'valid': False, 'error': 'Code requis.'}, status=400)

        try:
            coupon = DiscountCoupon.objects.get(code=code)
        except DiscountCoupon.DoesNotExist:
            return Response({'valid': False, 'error': 'Code coupon introuvable.'}, status=404)

        if not coupon.is_valid:
            reason = 'Coupon expiré.' if coupon.expires_at and timezone.now() > coupon.expires_at else \
                     'Coupon déjà utilisé.' if coupon.uses_count >= coupon.max_uses else \
                     f'Coupon {coupon.get_status_display()}.'
            return Response({'valid': False, 'error': reason, 'status': coupon.status})

        try:
            amount = Decimal(str(invoice_amount))
        except Exception:
            amount = Decimal('0')

        if coupon.min_amount and amount < coupon.min_amount:
            return Response({
                'valid': False,
                'error': f"Montant minimum requis : {int(coupon.min_amount):,} FCFA.".replace(',', ' '),
            })

        discount = coupon.calculate_discount(amount) if amount > 0 else None

        return Response({
            'valid': True,
            'coupon_id': str(coupon.id),
            'code': coupon.code,
            'label': coupon.label or coupon.get_discount_display(),
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'discount_amount': float(discount) if discount is not None else None,
            'uses_remaining': coupon.max_uses - coupon.uses_count,
        })


class CouponApplyView(APIView):
    """Applique un coupon à une facture existante."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.invoicing.models import Invoice

        code = request.data.get('code', '').strip().upper()
        invoice_id = request.data.get('invoice_id')

        if not code or not invoice_id:
            return Response({'detail': 'code et invoice_id requis.'}, status=400)

        try:
            coupon = DiscountCoupon.objects.get(code=code, organization=request.user.organization)
        except DiscountCoupon.DoesNotExist:
            return Response({'detail': 'Code coupon introuvable.'}, status=404)

        try:
            invoice = Invoice.objects.get(id=invoice_id, organization=request.user.organization)
        except Invoice.DoesNotExist:
            return Response({'detail': 'Facture introuvable.'}, status=404)

        if invoice.status == 'cancelled':
            return Response({'detail': 'Impossible d\'appliquer un coupon sur une facture annulée.'}, status=400)

        # Cas idempotent : coupon déjà lié à cette facture → ré-appliquer sans incrémenter uses_count
        already_applied = coupon.applied_invoices.filter(pk=invoice.pk).exists()
        if already_applied:
            discount_amount = coupon.calculate_discount(invoice.subtotal)
        else:
            try:
                discount_amount = coupon.apply_to_invoice(invoice, user=request.user)
            except ValueError as e:
                return Response({'detail': str(e)}, status=400)

        # Appliquer la remise sur la facture
        invoice.global_discount_type = coupon.discount_type
        invoice.global_discount_value = coupon.discount_value
        invoice.global_discount_label = f"Coupon {coupon.code}" + (f" — {coupon.label}" if coupon.label else "")
        invoice.save(update_fields=['global_discount_type', 'global_discount_value', 'global_discount_label', 'updated_at'])

        # Recalculer les totaux (global_discount_amount + total_amount)
        if hasattr(invoice, 'recalculate_totals'):
            invoice.recalculate_totals()

        return Response({
            'detail': 'Coupon appliqué avec succès.',
            'discount_amount': float(discount_amount),
            'invoice_total': float(invoice.total_amount),
            'coupon_label': invoice.global_discount_label,
        })


# ─────────────────────────────────────────────────────────────
# INTERFACE MOBILE BORIS — génération de coupons
# ─────────────────────────────────────────────────────────────

def coupon_manager_view(request):
    """Interface mobile pour créer et gérer les coupons. Réservée admin/owner."""
    from django.conf import settings as _settings
    from django.http import HttpResponseForbidden

    # Auth par token URL (même pattern que les PDFs) ou session Django
    token = request.GET.get('token') or request.POST.get('token') or request.session.get('coupon_token')
    secret = getattr(_settings, 'PDF_ACCESS_TOKEN', 'csj-secure-pdf-2024')

    if token == secret:
        # Stocker en session pour les POST suivants (formulaire)
        request.session['coupon_token'] = token
        from apps.accounts.models import CustomUser
        # Récupérer l'utilisateur boris par username pour les opérations
        try:
            user = CustomUser.objects.get(username='boris', organization__isnull=False)
        except CustomUser.DoesNotExist:
            # Fallback : premier admin de l'org
            user = CustomUser.objects.filter(role__in=['admin', 'owner']).first()
        if not user:
            return HttpResponseForbidden("Aucun administrateur trouvé.")
    elif request.user.is_authenticated:
        user = request.user
        if user.role not in ['admin', 'owner']:
            return HttpResponseForbidden("Accès réservé à l'administrateur.")
    else:
        return HttpResponseForbidden("Accès non autorisé. Ouvrez ce lien depuis l'application.")

    organization = user.organization
    message = None
    error = None

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'create':
            try:
                label = request.POST.get('label', '').strip()
                discount_type = request.POST.get('discount_type', 'percent')
                discount_value = Decimal(request.POST.get('discount_value', '0'))
                max_uses = int(request.POST.get('max_uses', 1))
                min_amount = Decimal(request.POST.get('min_amount', '0') or '0')
                max_discount = request.POST.get('max_discount_amount', '').strip()
                expires_days = request.POST.get('expires_days', '').strip()

                expires_at = None
                if expires_days:
                    from datetime import timedelta
                    expires_at = timezone.now() + timedelta(days=int(expires_days))

                coupon = DiscountCoupon.objects.create(
                    organization=organization,
                    created_by=user,
                    label=label,
                    discount_type=discount_type,
                    discount_value=discount_value,
                    max_uses=max_uses,
                    min_amount=min_amount,
                    max_discount_amount=Decimal(max_discount) if max_discount else None,
                    expires_at=expires_at,
                )
                message = f"Coupon créé : <strong>{coupon.code}</strong>"
            except Exception as e:
                error = f"Erreur : {e}"

        elif action == 'cancel':
            coupon_id = request.POST.get('coupon_id')
            try:
                c = DiscountCoupon.objects.get(id=coupon_id, organization=organization)
                c.status = 'cancelled'
                c.save(update_fields=['status', 'updated_at'])
                message = f"Coupon {c.code} annulé."
            except DiscountCoupon.DoesNotExist:
                error = "Coupon introuvable."

    coupons = DiscountCoupon.objects.filter(organization=organization).order_by('-created_at')[:50]

    return render(request, 'document_generator/coupon_manager.html', {
        'coupons': coupons,
        'message': message,
        'error': error,
        'organization': organization,
    })
