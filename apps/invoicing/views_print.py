from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404, JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
from django.conf import settings
import json
import os

from .models import Invoice, PrintTemplate, PrintConfiguration, PrintHistory
from ..purchase_orders.models import PurchaseOrder


@login_required
def print_invoice_view(request, invoice_id):
    """Vue pour imprimer une facture"""
    invoice = get_object_or_404(Invoice, id=invoice_id)

    # Vérifier les permissions
    if not (request.user == invoice.created_by or request.user.is_staff):
        raise Http404("Facture non trouvée")

    # Récupérer les paramètres de l'organisation
    from apps.core.models import OrganizationSettings
    org_settings = None
    if request.user.organization:
        org_settings = OrganizationSettings.objects.filter(
            organization=request.user.organization
        ).first()

    # Récupérer le template et la configuration
    # Filtrer par organisation pour éviter de récupérer un template d'une autre organisation
    template_obj = None
    if request.user.organization:
        template_obj = PrintTemplate.objects.filter(
            organization=request.user.organization,
            template_type='invoice',
            is_default=True
        ).first()

    if not template_obj:
        # Créer un template par défaut si aucun n'existe
        # Utiliser les paramètres de l'organisation si disponibles
        # Fallback: utiliser le nom de l'organisation si company_name est vide
        if org_settings and org_settings.company_name:
            header_name = org_settings.company_name
        elif hasattr(request.user, 'organization') and request.user.organization:
            header_name = request.user.organization.name
        else:
            header_name = ""  # Vide au lieu de "ProcureGenius"

        header_address = org_settings.company_address if org_settings and org_settings.company_address else ""
        header_phone = org_settings.company_phone if org_settings and org_settings.company_phone else ""
        header_email = org_settings.company_email if org_settings and org_settings.company_email else ""

        if request.user.organization:
            template_obj = PrintTemplate.objects.create(
                name="Template par défaut",
                template_type='invoice',
                is_default=True,
                organization=request.user.organization,
                header_company_name=header_name,
                header_address=header_address,
                header_phone=header_phone,
                header_email=header_email,
                footer_text="Merci de votre confiance",
                footer_conditions="Paiement à 30 jours. Retard de paiement : intérêts de 1,5% par mois."
            )

        # Si il y a un logo dans org_settings, l'assigner au template
        if org_settings and org_settings.company_logo:
            template_obj.header_logo = org_settings.company_logo
            template_obj.save()

    config = PrintConfiguration.objects.filter(is_default=True).first()
    if not config:
        # Créer une configuration par défaut
        config = PrintConfiguration.objects.create(
            name="Configuration par défaut",
            is_default=True,
            organization=request.user.organization
        )

    # Enregistrer dans l'historique
    PrintHistory.objects.create(
        document_type='invoice',
        document_id=invoice.id,
        document_number=invoice.invoice_number,
        template_used=template_obj,
        configuration_used=config,
        printed_by=request.user
    )

    context = {
        'invoice': invoice,
        'template': template_obj,
        'config': config,
        'org_settings': org_settings,
        'auto_print': request.GET.get('auto_print', 'false') == 'true'
    }

    return render(request, 'invoicing/print_invoice.html', context)


@login_required
def print_purchase_order_view(request, po_id):
    """Vue pour imprimer un bon de commande"""
    purchase_order = get_object_or_404(PurchaseOrder, id=po_id)

    # Vérifier les permissions
    if not (request.user == purchase_order.created_by or request.user.is_staff):
        raise Http404("Bon de commande non trouvé")

    # Récupérer OrganizationSettings
    org_settings = None
    if hasattr(request.user, 'organization') and request.user.organization:
        org_settings = OrganizationSettings.objects.filter(
            organization=request.user.organization
        ).first()

    # Récupérer le template et la configuration
    # Filtrer par organisation pour éviter de récupérer un template d'une autre organisation
    template_obj = None
    if hasattr(request.user, 'organization') and request.user.organization:
        template_obj = PrintTemplate.objects.filter(
            organization=request.user.organization,
            template_type='purchase_order',
            is_default=True
        ).first()

    if not template_obj:
        # Créer un template par défaut si aucun n'existe
        # Utiliser les paramètres de l'organisation si disponibles
        if org_settings and org_settings.company_name:
            header_name = org_settings.company_name
        elif hasattr(request.user, 'organization') and request.user.organization:
            header_name = request.user.organization.name
        else:
            header_name = ""

        header_address = org_settings.company_address if org_settings and org_settings.company_address else ""
        header_phone = org_settings.company_phone if org_settings and org_settings.company_phone else ""
        header_email = org_settings.company_email if org_settings and org_settings.company_email else ""

        if hasattr(request.user, 'organization') and request.user.organization:
            template_obj = PrintTemplate.objects.create(
                name="Template BC par défaut",
                template_type='purchase_order',
                is_default=True,
                organization=request.user.organization,
                header_company_name=header_name,
                header_address=header_address,
                header_phone=header_phone,
                header_email=header_email,
                footer_text="Merci de confirmer la réception de cette commande",
            footer_conditions="Livraison selon les termes convenus. Retard de livraison à signaler immédiatement."
        )

    config = PrintConfiguration.objects.filter(is_default=True).first()
    if not config:
        # Créer une configuration par défaut
        config = PrintConfiguration.objects.create(
            name="Configuration par défaut",
            is_default=True
        )

    # Enregistrer dans l'historique
    PrintHistory.objects.create(
        document_type='purchase_order',
        document_id=purchase_order.id,
        document_number=purchase_order.po_number,
        template_used=template_obj,
        configuration_used=config,
        printed_by=request.user
    )

    context = {
        'purchase_order': purchase_order,
        'template': template_obj,
        'config': config,
        'org_settings': org_settings,
        'auto_print': request.GET.get('auto_print', 'false') == 'true'
    }

    return render(request, 'purchase_orders/print_purchase_order.html', context)


@login_required
def print_preview_invoice(request, invoice_id):
    """Aperçu d'impression pour facture"""
    return print_invoice_view(request, invoice_id)


@login_required
def print_preview_purchase_order(request, po_id):
    """Aperçu d'impression pour bon de commande"""
    return print_purchase_order_view(request, po_id)


@login_required
def configure_print_template(request):
    """Configuration des templates d'impression"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            template_type = data.get('template_type')
            template_data = data.get('template_data', {})

            # Récupérer ou créer le template
            template_obj, created = PrintTemplate.objects.get_or_create(
                template_type=template_type,
                is_default=True,
                defaults={
                    'name': f"Template {template_type} par défaut",
                    **template_data
                }
            )

            if not created:
                # Mettre à jour le template existant
                for key, value in template_data.items():
                    if hasattr(template_obj, key):
                        setattr(template_obj, key, value)
                template_obj.save()

            return JsonResponse({
                'success': True,
                'message': 'Template configuré avec succès'
            })

        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Erreur lors de la configuration: {str(e)}'
            })

    # GET - Retourner les templates existants
    templates = PrintTemplate.objects.all()
    configs = PrintConfiguration.objects.all()

    context = {
        'templates': templates,
        'configs': configs
    }

    return render(request, 'invoicing/configure_print.html', context)


@login_required
def print_history_view(request):
    """Historique des impressions"""
    history = PrintHistory.objects.filter(
        printed_by=request.user
    ).order_by('-printed_at')[:50]  # Dernières 50 impressions

    context = {
        'history': history
    }

    return render(request, 'invoicing/print_history.html', context)


@login_required
def download_invoice_pdf(request, invoice_id):
    """Télécharger la facture en PDF"""
    try:
        # Importer weasyprint ou reportlab selon la disponibilité
        try:
            from weasyprint import HTML, CSS
            USE_WEASYPRINT = True
        except ImportError:
            try:
                from reportlab.pdfgen import canvas
                from reportlab.lib.pagesizes import letter
                USE_WEASYPRINT = False
            except ImportError:
                return HttpResponse(
                    "Aucune bibliothèque PDF disponible. Installez weasyprint ou reportlab.",
                    status=500
                )

        invoice = get_object_or_404(Invoice, id=invoice_id)

        # Vérifier les permissions
        if not (request.user == invoice.created_by or request.user.is_staff):
            raise Http404("Facture non trouvée")

        if USE_WEASYPRINT:
            # Récupérer les paramètres de l'organisation
            from apps.core.models import OrganizationSettings
            org_settings = None
            if request.user.organization:
                org_settings = OrganizationSettings.objects.filter(
                    organization=request.user.organization
                ).first()

            # Générer le HTML
            html_content = render_to_string('invoicing/print_invoice.html', {
                'invoice': invoice,
                'template': PrintTemplate.objects.filter(
                    template_type='invoice', is_default=True
                ).first(),
                'config': PrintConfiguration.objects.filter(is_default=True).first(),
                'org_settings': org_settings
            }, request=request)

            # Convertir en PDF
            html_doc = HTML(string=html_content, base_url=request.build_absolute_uri())
            pdf_content = html_doc.write_pdf()

            # Retourner la réponse PDF
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="facture_{invoice.invoice_number}.pdf"'

            return response
        else:
            # Fallback avec reportlab (basique)
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="facture_{invoice.invoice_number}.pdf"'

            p = canvas.Canvas(response, pagesize=letter)
            p.drawString(100, 750, f"Facture {invoice.invoice_number}")
            p.drawString(100, 730, f"Total: {invoice.total_amount} {invoice.currency}")
            p.showPage()
            p.save()

            return response

    except Exception as e:
        return HttpResponse(f"Erreur lors de la génération du PDF: {str(e)}", status=500)


@login_required
def download_purchase_order_pdf(request, po_id):
    """Télécharger le bon de commande en PDF"""
    try:
        # Même logique que pour les factures
        try:
            from weasyprint import HTML, CSS
            USE_WEASYPRINT = True
        except ImportError:
            try:
                from reportlab.pdfgen import canvas
                from reportlab.lib.pagesizes import letter
                USE_WEASYPRINT = False
            except ImportError:
                return HttpResponse(
                    "Aucune bibliothèque PDF disponible. Installez weasyprint ou reportlab.",
                    status=500
                )

        purchase_order = get_object_or_404(PurchaseOrder, id=po_id)

        # Vérifier les permissions
        if not (request.user == purchase_order.created_by or request.user.is_staff):
            raise Http404("Bon de commande non trouvé")

        if USE_WEASYPRINT:
            # Générer le HTML
            html_content = render_to_string('purchase_orders/print_purchase_order.html', {
                'purchase_order': purchase_order,
                'template': PrintTemplate.objects.filter(
                    template_type='purchase_order', is_default=True
                ).first(),
                'config': PrintConfiguration.objects.filter(is_default=True).first()
            }, request=request)

            # Convertir en PDF
            html_doc = HTML(string=html_content, base_url=request.build_absolute_uri())
            pdf_content = html_doc.write_pdf()

            # Retourner la réponse PDF
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="bon_commande_{purchase_order.po_number}.pdf"'

            return response
        else:
            # Fallback avec reportlab (basique)
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="bon_commande_{purchase_order.po_number}.pdf"'

            p = canvas.Canvas(response, pagesize=letter)
            p.drawString(100, 750, f"Bon de Commande {purchase_order.po_number}")
            p.drawString(100, 730, f"Total: {purchase_order.total_amount} CAD")
            p.showPage()
            p.save()

            return response

    except Exception as e:
        return HttpResponse(f"Erreur lors de la génération du PDF: {str(e)}", status=500)