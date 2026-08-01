"""
API Views for Imaging app
"""
import os
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Case, When, IntegerField
from django.utils import timezone
from django.utils.timezone import now as tz_now
from rest_framework import generics, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import Client
from apps.patients.models import PatientVisit
from apps.laboratory.models import Prescriber, SubcontractorLab, SubcontractorPatient
from .models import ImagingExamCategory, ImagingExamType, ImagingOrder, ImagingOrderItem, ImagingResultFile
from .serializers import (
    ImagingExamCategorySerializer,
    ImagingExamTypeSerializer,
    ImagingOrderSerializer,
    ImagingOrderListSerializer,
    ImagingOrderItemSerializer,
    ImagingOrderCreateSerializer,
    EnterImagingResultsSerializer,
    ImagingResultFileSerializer,
)
from .invoice_services import ImagingOrderInvoiceService


IMAGING_ADMIN_ROLES = ('admin', 'manager')
IMAGING_WRITE_ROLES = ('admin', 'manager', 'lab_tech', 'biologist', 'doctor', 'nurse')


class IsAdminOrReadOnly(BasePermission):
    """Admin/manager peut écrire ; tout utilisateur authentifié peut lire."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in IMAGING_ADMIN_ROLES


class IsAdminOrTech(BasePermission):
    """Admin, manager, lab_tech, biologist, doctor ou nurse peuvent écrire."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in IMAGING_WRITE_ROLES


# =============================================================================
# Catalogue
# =============================================================================

class ImagingExamCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = ImagingExamCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering = ['name']

    def get_queryset(self):
        return ImagingExamCategory.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class ImagingExamCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ImagingExamCategorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return ImagingExamCategory.objects.filter(organization=self.request.user.organization)


class ImagingExamTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = ImagingExamTypeSerializer
    permission_classes = [IsAdminOrTech]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'modality', 'is_active']
    search_fields = ['name', 'exam_code', 'short_name']
    ordering_fields = ['name', 'price', 'category']
    ordering = ['category', 'name']

    def get_queryset(self):
        return ImagingExamType.objects.filter(
            organization=self.request.user.organization
        ).select_related('category')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class ImagingExamTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ImagingExamTypeSerializer
    permission_classes = [IsAdminOrTech]

    def get_queryset(self):
        return ImagingExamType.objects.filter(
            organization=self.request.user.organization
        ).select_related('category')

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') not in IMAGING_ADMIN_ROLES:
            return Response(
                {'detail': "Seuls les administrateurs peuvent supprimer un examen."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


# =============================================================================
# Imaging Orders
# =============================================================================

class ImagingOrderListView(generics.ListAPIView):
    serializer_class = ImagingOrderListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'patient']
    search_fields = ['order_number', 'patient__name', 'patient__patient_number']
    ordering_fields = ['order_date', 'created_at']
    ordering = ['-order_date']

    def get_queryset(self):
        queryset = ImagingOrder.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'subcontractor').prefetch_related('items', 'items__exam_type')

        subcontractor_id = self.request.query_params.get('subcontractor_id')
        if subcontractor_id:
            queryset = queryset.filter(subcontractor_id=subcontractor_id)

        is_subcontracted = self.request.query_params.get('is_subcontracted')
        if is_subcontracted == 'true':
            queryset = queryset.filter(subcontractor__isnull=False)
        elif is_subcontracted == 'false':
            queryset = queryset.filter(subcontractor__isnull=True)

        status_in = self.request.query_params.get('status_in')
        if status_in:
            statuses = [s.strip() for s in status_in.split(',')]
            queryset = queryset.filter(status__in=statuses)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(order_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__date__lte=end_date)

        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(order_date__date=date)

        today_only = self.request.query_params.get('today', 'false')
        if today_only.lower() == 'true':
            queryset = queryset.filter(order_date__date=timezone.now().date())

        pending_only = self.request.query_params.get('pending', 'false')
        if pending_only.lower() == 'true':
            queryset = queryset.exclude(status__in=['results_delivered', 'cancelled'])

        return queryset


class ImagingOrderDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a single imaging order (DELETE admin only)"""
    serializer_class = ImagingOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ImagingOrder.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'ordered_by', 'subcontractor').prefetch_related(
            'items__exam_type', 'items__result_files'
        )

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Suppression réservée aux administrateurs.")
        return super().destroy(request, *args, **kwargs)


class ImagingOrderCreateView(APIView):
    """Create a new imaging order with one or more exam types"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ImagingOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            patient = Client.objects.get(
                id=data['patient_id'],
                organization=request.user.organization,
                client_type__in=['patient', 'both']
            )
        except Client.DoesNotExist:
            return Response({'error': 'Patient introuvable'}, status=status.HTTP_404_NOT_FOUND)

        visit = None
        if data.get('visit_id'):
            visit = PatientVisit.objects.filter(
                id=data['visit_id'], organization=request.user.organization
            ).first()

        exam_types = list(ImagingExamType.objects.filter(
            id__in=data['exam_type_ids'],
            organization=request.user.organization,
            is_active=True
        ))
        if not exam_types:
            return Response({'error': 'Aucun examen valide'}, status=status.HTTP_400_BAD_REQUEST)

        prescriber = None
        if data.get('prescriber_id'):
            prescriber = Prescriber.objects.filter(
                id=data['prescriber_id'], organization=request.user.organization, is_active=True
            ).first()

        subcontractor = None
        if data.get('subcontractor_id'):
            subcontractor = SubcontractorLab.objects.filter(
                id=data['subcontractor_id'], organization=request.user.organization, is_active=True
            ).first()

        order = ImagingOrder.objects.create(
            organization=request.user.organization,
            patient=patient,
            visit=visit,
            priority=data.get('priority', 'routine'),
            clinical_notes=data.get('clinical_notes', ''),
            ordered_by=request.user,
            payment_method=data.get('payment_method', 'cash'),
            prescriber=prescriber,
            subcontractor=subcontractor,
        )

        total_price = Decimal('0')
        total_discount = Decimal('0')
        for exam_type in exam_types:
            item_price = exam_type.price
            item_discount = exam_type.discount or Decimal('0')
            ImagingOrderItem.objects.create(
                imaging_order=order,
                exam_type=exam_type,
                price=item_price,
                discount=item_discount,
            )
            total_price += item_price
            total_discount += item_discount

        order.total_price = total_price
        order.discount = total_discount
        order.save(update_fields=['total_price', 'discount'])

        try:
            order.refresh_from_db()
            ImagingOrderInvoiceService.generate_invoice(order)
        except Exception as e:
            import traceback
            print(f"Error creating imaging invoice: {e}")
            traceback.print_exc()

        order.refresh_from_db()
        return Response(ImagingOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class ImagingOrderStatusUpdateView(APIView):
    """Update imaging order status"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = ImagingOrder.objects.get(id=pk, organization=request.user.organization)
        except ImagingOrder.DoesNotExist:
            return Response({'error': 'Commande introuvable'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')

        if action == 'start_processing':
            order.start_processing()
        elif action == 'mark_results_ready':
            order.mark_results_ready(entered_by=request.user)
        elif action == 'deliver':
            order.mark_delivered()
        elif action == 'cancel':
            order.cancel_order()
        else:
            return Response({'error': f'Action inconnue: {action}'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ImagingOrderSerializer(order).data)


class EnterImagingResultsView(APIView):
    """Enter report text for imaging order items"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = ImagingOrder.objects.get(id=pk, organization=request.user.organization)
        except ImagingOrder.DoesNotExist:
            return Response({'error': 'Commande introuvable'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EnterImagingResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items_data = serializer.validated_data['items']

        updated_items = []
        for item_data in items_data:
            try:
                item = order.items.get(id=item_data['item_id'])
            except ImagingOrderItem.DoesNotExist:
                continue

            if 'report_text' in item_data:
                item.report_text = item_data['report_text']
                item.report_entered_at = timezone.now()
                item.report_entered_by = request.user
            if 'technician_notes' in item_data:
                item.technician_notes = item_data['technician_notes']
            if 'is_urgent_finding' in item_data:
                item.is_urgent_finding = bool(item_data['is_urgent_finding'])

            item.save()
            updated_items.append(item)

        if order.all_results_entered:
            order.mark_results_ready(entered_by=request.user)

        return Response({
            'message': f'{len(updated_items)} résultat(s) mis à jour',
            'order': ImagingOrderSerializer(order).data,
        })


class GenerateImagingOrderInvoiceView(APIView):
    """Generate invoice for an imaging order (manual trigger)"""
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request, pk):
        try:
            order = ImagingOrder.objects.get(id=pk, organization=request.user.organization)
        except ImagingOrder.DoesNotExist:
            return Response({'error': 'Commande introuvable'}, status=status.HTTP_404_NOT_FOUND)

        try:
            invoice = ImagingOrderInvoiceService.generate_invoice(order)
            return Response({
                'message': 'Facture créée avec succès',
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'total_amount': float(invoice.total_amount),
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': f"Erreur lors de la création de facture: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TodayImagingOrdersView(APIView):
    """Dashboard: active imaging orders + today's stats"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_orders = ImagingOrder.objects.filter(
            organization=request.user.organization
        ).select_related('patient', 'subcontractor').prefetch_related('items')

        active_orders = org_orders.exclude(status__in=['results_delivered', 'cancelled'])
        today = timezone.now().date()
        today_orders = org_orders.filter(order_date__date=today)

        result = {
            'total': active_orders.count(),
            'prescribed': active_orders.filter(status='prescribed').count(),
            'in_progress': active_orders.filter(status='in_progress').count(),
            'results_ready': active_orders.filter(status='results_ready').count(),
            'subcontracted': active_orders.filter(subcontractor__isnull=False).count(),
            'today_total': today_orders.count(),
            'today_delivered': today_orders.filter(status='results_delivered').count(),
        }

        active_sorted = active_orders.order_by(
            Case(
                When(priority='stat', then=0),
                When(priority='urgent', then=1),
                default=2,
                output_field=IntegerField(),
            ),
            'order_date'
        )
        result['pending_orders'] = ImagingOrderListSerializer(active_sorted, many=True).data
        return Response(result)


class PatientImagingHistoryView(APIView):
    """Get imaging history for a patient"""
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        try:
            patient = Client.objects.get(
                id=patient_id, organization=request.user.organization, client_type__in=['patient', 'both']
            )
        except Client.DoesNotExist:
            return Response({'error': 'Patient introuvable'}, status=status.HTTP_404_NOT_FOUND)

        orders = ImagingOrder.objects.filter(patient=patient).order_by('-order_date').select_related(
            'ordered_by'
        ).prefetch_related('items__exam_type')

        return Response({
            'patient_id': str(patient.id),
            'patient_name': patient.name,
            'total_orders': orders.count(),
            'orders': ImagingOrderSerializer(orders, many=True).data,
        })


# =============================================================================
# Result files
# =============================================================================

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}


class ImagingResultFileUploadView(APIView):
    """POST /items/<item_id>/files/ — upload one result file (image or PDF)"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, item_id):
        try:
            item = ImagingOrderItem.objects.get(
                id=item_id, imaging_order__organization=request.user.organization
            )
        except ImagingOrderItem.DoesNotExist:
            return Response({'error': 'Examen introuvable'}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'Aucun fichier fourni'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(uploaded_file.name)[1].lower()
        file_type = 'image' if ext in IMAGE_EXTENSIONS else 'pdf'

        result_file = ImagingResultFile.objects.create(
            order_item=item,
            file=uploaded_file,
            file_type=file_type,
            caption=request.data.get('caption', ''),
            uploaded_by=request.user,
        )
        return Response(ImagingResultFileSerializer(result_file).data, status=status.HTTP_201_CREATED)

    def get(self, request, item_id):
        files = ImagingResultFile.objects.filter(
            order_item_id=item_id, order_item__imaging_order__organization=request.user.organization
        )
        return Response(ImagingResultFileSerializer(files, many=True).data)


class ImagingResultFileDetailView(generics.DestroyAPIView):
    """DELETE /files/<pk>/"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ImagingResultFile.objects.filter(
            order_item__imaging_order__organization=self.request.user.organization
        )


# =============================================================================
# Sous-traitance — commande groupée
# =============================================================================

class ImagingSubcontractorBatchOrderView(APIView):
    """
    POST /subcontractors/<uuid>/batch-order/
    Crée plusieurs commandes d'imagerie pour les patients d'un sous-traitant,
    dans UNE SEULE transaction avec la facture consolidée (correction du bug
    rencontré côté labo : là-bas, les commandes étaient créées hors transaction,
    et un échec de création de facture les laissait orphelines sans facture liée).

    Body: {
        rows: [{subcontractor_patient_id, exam_type_ids, priority, clinical_notes}],
        payment_method: 'cash',
        payment_mode: 'immediate' | 'deferred'
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, subcontractor_id):
        from apps.invoicing.models import Invoice, InvoiceItem, Payment

        org = request.user.organization
        try:
            subcontractor = SubcontractorLab.objects.get(id=subcontractor_id, organization=org)
        except SubcontractorLab.DoesNotExist:
            return Response({'error': 'Sous-traitant introuvable'}, status=status.HTTP_404_NOT_FOUND)

        rows = request.data.get('rows', [])
        payment_method = request.data.get('payment_method', 'cash')
        payment_mode = request.data.get('payment_mode', 'deferred')

        if not rows:
            return Response({'error': 'Aucune ligne fournie'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Validation en lecture seule d'abord : on résout tout avant de rien écrire ---
        resolved_rows = []
        errors = []
        for row in rows:
            sub_patient_id = row.get('subcontractor_patient_id')
            exam_type_ids = row.get('exam_type_ids', [])
            if not sub_patient_id or not exam_type_ids:
                continue

            sub_patient = SubcontractorPatient.objects.filter(
                id=sub_patient_id, subcontractor=subcontractor
            ).first()
            if not sub_patient:
                errors.append({'patient': str(sub_patient_id), 'error': 'Patient introuvable'})
                continue

            exam_types = list(ImagingExamType.objects.filter(
                id__in=exam_type_ids, organization=org, is_active=True
            ))
            if not exam_types:
                errors.append({'patient': sub_patient.full_name, 'error': 'Aucun examen valide'})
                continue

            resolved_rows.append({
                'sub_patient': sub_patient,
                'exam_types': exam_types,
                'priority': row.get('priority', 'routine'),
                'clinical_notes': row.get('clinical_notes', ''),
            })

        if not resolved_rows:
            return Response(
                {'error': 'Aucune ligne valide', 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Tout le reste (commandes + facture + paiement) dans UNE transaction ---
        try:
            with transaction.atomic():
                sub_client, _ = Client.objects.get_or_create(
                    organization=org,
                    name=subcontractor.name,
                    client_type='b2b',
                    defaults={'phone': subcontractor.phone or '', 'registration_source': 'external'},
                )

                success = []
                batch_total = Decimal('0')
                invoice_items_data = []
                order_ids = []

                for resolved in resolved_rows:
                    sub_patient = resolved['sub_patient']
                    client = sub_patient.client
                    if not client:
                        client = Client.objects.create(
                            organization=org,
                            name=sub_patient.full_name,
                            phone=sub_patient.phone or '',
                            date_of_birth=sub_patient.date_of_birth,
                            gender=sub_patient.gender or '',
                            client_type='patient',
                            registration_source='external',
                        )
                        SubcontractorPatient.objects.filter(pk=sub_patient.pk).update(client=client)

                    order = ImagingOrder.objects.create(
                        organization=org,
                        patient=client,
                        subcontractor=subcontractor,
                        subcontractor_patient=sub_patient,
                        priority=resolved['priority'],
                        clinical_notes=resolved['clinical_notes'],
                        payment_method=payment_method,
                        ordered_by=request.user,
                    )
                    order_ids.append(order.id)

                    row_total = Decimal('0')
                    for exam_type in resolved['exam_types']:
                        ImagingOrderItem.objects.create(
                            imaging_order=order,
                            exam_type=exam_type,
                            price=exam_type.price,
                            discount=Decimal('0'),
                        )
                        row_total += exam_type.price
                        invoice_items_data.append({
                            'description': f"{sub_patient.full_name} — {exam_type.name}",
                            'unit_price': exam_type.price,
                        })

                    order.total_price = row_total
                    order.save(update_fields=['total_price'])
                    batch_total += row_total

                    success.append({
                        'patient': sub_patient.full_name,
                        'order_number': order.order_number,
                        'order_id': str(order.id),
                        'total': float(row_total),
                    })

                if not invoice_items_data:
                    raise ValueError("Aucune ligne de facturation générée")

                invoice_status = 'paid' if payment_mode == 'immediate' else 'sent'
                batch_invoice = Invoice.objects.create(
                    organization=org,
                    client=sub_client,
                    invoice_type='healthcare_imaging',
                    created_by=request.user,
                    title=f"Sous-traitance Imagerie — {subcontractor.name} — {tz_now().strftime('%d/%m/%Y')}",
                    description=f"Dépôt d'échantillons du {tz_now().strftime('%d/%m/%Y')} — {len(success)} patient(s)",
                    due_date=tz_now().date(),
                    status=invoice_status,
                    currency='XAF',
                    payment_method=payment_method,
                    subtotal=batch_total,
                    tax_amount=Decimal('0'),
                    total_amount=batch_total,
                    is_subcontractor_invoice=True,
                    subcontractor=subcontractor,
                )

                for item in invoice_items_data:
                    InvoiceItem.objects.create(
                        invoice=batch_invoice,
                        description=item['description'],
                        quantity=1,
                        unit_price=item['unit_price'],
                        total_price=item['unit_price'],
                    )

                ImagingOrder.objects.filter(id__in=order_ids).update(imaging_invoice=batch_invoice)

                if payment_mode == 'immediate':
                    Payment.objects.create(
                        invoice=batch_invoice,
                        amount=batch_total,
                        payment_date=tz_now().date(),
                        payment_method=payment_method,
                        created_by=request.user,
                        status='success',
                    )

                return Response({
                    'success': success,
                    'errors': errors,
                    'batch_invoice_id': str(batch_invoice.id),
                    'batch_total': float(batch_total),
                })
        except Exception as e:
            # Rollback complet : aucune ImagingOrder orpheline, contrairement au
            # bug rencontré côté labo (SubcontractorBatchOrderView).
            import logging
            logging.getLogger(__name__).error(
                f"ImagingSubcontractorBatchOrder: échec pour {subcontractor.name}: {e}", exc_info=True
            )
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
