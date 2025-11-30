"""
Vue PDF pour les factures utilisant django-weasyprint
"""
import os
import sys
import qrcode
import json
import base64
from io import BytesIO
from django.views.generic import DetailView
from django.http import Http404, HttpResponse

from .models import Invoice

# Configurer le PATH pour GTK3 avant d'importer WeasyPrint
def configure_gtk3_path():
    """Ajoute GTK3 au PATH système pour Windows"""
    gtk3_paths = [
        r"C:\Program Files\GTK3-Runtime Win64\bin",
        r"C:\GTK3-Runtime Win64\bin",
        r"C:\Program Files (x86)\GTK3-Runtime Win64\bin",
    ]

    for gtk_path in gtk3_paths:
        if os.path.exists(gtk_path) and gtk_path not in os.environ.get('PATH', ''):
            os.environ['PATH'] = gtk_path + os.pathsep + os.environ.get('PATH', '')
            print(f"[INFO] GTK3 ajoute au PATH: {gtk_path}")
            return True
    return False

# Configurer GTK3
configure_gtk3_path()

# Import de WeasyPrint avec GTK3 configuré
try:
    from django_weasyprint import WeasyTemplateResponseMixin
    from django_weasyprint.views import WeasyTemplateResponse
    WEASYPRINT_AVAILABLE = True
    print("[OK] WeasyPrint charge avec succes!")
except (ImportError, OSError) as e:
    print(f"[ERROR] WeasyPrint non disponible: {e}")
    print("[ERROR] Impossible de charger WeasyPrint. Verifiez l'installation de GTK3.")
    WEASYPRINT_AVAILABLE = False
    WeasyTemplateResponseMixin = object


if not WEASYPRINT_AVAILABLE:
    # Si WeasyPrint n'est pas disponible, créer une vue qui retourne une erreur
    class InvoicePDFView(DetailView):
        """Vue d'erreur si WeasyPrint n'est pas disponible"""
        model = Invoice

        def get(self, request, *args, **kwargs):
            return HttpResponse(
                """
                <html>
                <head><title>Erreur - WeasyPrint non disponible</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px;">
                    <h1 style="color: #e74c3c;">WeasyPrint non disponible</h1>
                    <p>WeasyPrint n'a pas pu être chargé. GTK3 est probablement manquant ou mal configuré.</p>
                    <h2>Solutions :</h2>
                    <ol>
                        <li>Vérifiez que GTK3 est installé dans : <code>C:\\Program Files\\GTK3-Runtime Win64\\bin</code></li>
                        <li>Redémarrez le serveur Django</li>
                        <li>Consultez la documentation : INSTALL_GTK3_WINDOWS.md</li>
                    </ol>
                </body>
                </html>
                """,
                content_type='text/html',
                status=503
            )
else:
    # WeasyPrint disponible - créer la vue normale
    class InvoicePDFView(WeasyTemplateResponseMixin, DetailView):
        """
        Vue pour générer un PDF de facture avec WeasyPrint et django-weasyprint

        Utilise le système de templates Django avec CSS pour générer des PDF
        de qualité professionnelle avec QR code.
        """
        model = Invoice
        template_name = 'invoicing/pdf_templates/invoice_modern.html'

        # Options PDF
        pdf_attachment = False  # Afficher inline au lieu de télécharger
        pdf_options = {
            'pdf_variant': 'pdf/a-3b',  # Variant PDF pour l'archivage
        }

        def get_template_names(self):
            """Sélectionne le template selon le paramètre 'template'"""
            template_type = self.request.GET.get('template', 'modern')

            # Mapping des 6 templates disponibles
            template_map = {
                'classic': 'invoicing/pdf_templates/invoice_classic.html',
                'modern': 'invoicing/pdf_templates/invoice_modern.html',
                'minimal': 'invoicing/pdf_templates/invoice_minimal.html',
                'professional': 'invoicing/pdf_templates/invoice_professional.html',
                'creative': 'invoicing/pdf_templates/invoice_creative.html',
                'elegant': 'invoicing/pdf_templates/invoice_elegant.html',
            }

            return [template_map.get(template_type, template_map['modern'])]

        def get_pdf_filename(self):
            """Génère le nom du fichier PDF dynamiquement"""
            invoice = self.get_object()
            return f'facture-{invoice.invoice_number}.pdf'

        def get_context_data(self, **kwargs):
            """Ajoute les données nécessaires au contexte du template"""
            context = super().get_context_data(**kwargs)
            invoice = self.get_object()

            # Ajouter les données d'organisation
            org_data = self._get_organization_data(invoice)
            context['organization'] = org_data

            # Ajouter la couleur de marque
            context['brand_color'] = org_data.get('brand_color', '#2563eb')

            # Ajouter le logo en base64
            context['logo_base64'] = self._get_logo_base64(org_data)

            # Ajouter le QR code en base64
            context['qr_code_base64'] = self._generate_qr_code(invoice)

            # Ajouter les items de la facture
            context['items'] = invoice.items.all() if hasattr(invoice, 'items') else []

            # Ajouter les montants
            context['subtotal'] = getattr(invoice, 'subtotal', 0) or 0
            context['tax_amount'] = getattr(invoice, 'tax_amount', 0) or 0
            context['total_amount'] = getattr(invoice, 'total_amount', 0) or 0

            # Ajouter les dates
            context['issue_date'] = getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)
            context['due_date'] = getattr(invoice, 'due_date', None)

            # Ajouter le client
            context['client'] = invoice.client if hasattr(invoice, 'client') else None

            # Ajouter le type de template pour styling conditionnel
            context['template_type'] = self.request.GET.get('template', 'modern')

            return context

        def _generate_qr_code(self, invoice):
            """
            Génère un QR code contenant les informations de la facture

            Returns:
                str: QR code encodé en base64 (data URL)
            """
            try:
                issue_date = getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)

                # Données à encoder dans le QR code
                qr_data = {
                    'invoice_id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'total': float(getattr(invoice, 'total_amount', 0) or 0),
                    'date': issue_date.isoformat() if issue_date else None,
                    'status': getattr(invoice, 'status', 'unknown')
                }

                # Créer le QR code
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=2,
                )
                qr.add_data(json.dumps(qr_data))
                qr.make(fit=True)

                # Générer l'image
                qr_img = qr.make_image(fill_color="black", back_color="white")

                # Convertir en base64
                img_buffer = BytesIO()
                qr_img.save(img_buffer, format='PNG')
                img_buffer.seek(0)

                qr_base64 = base64.b64encode(img_buffer.read()).decode('utf-8')
                return f"data:image/png;base64,{qr_base64}"

            except Exception as e:
                print(f"[ERROR] Erreur lors de la generation du QR code: {e}")
                return None

        def _get_organization_data(self, invoice):
            """Récupère les données de l'organisation"""
            org_data = {
                'name': None,
                'address': None,
                'phone': None,
                'email': None,
                'website': None,
                'logo_path': None,
                'brand_color': '#2563eb',
            }

            try:
                from apps.core.models import OrganizationSettings
                from .models import PrintTemplate

                if hasattr(invoice, 'created_by') and invoice.created_by:
                    if hasattr(invoice.created_by, 'organization') and invoice.created_by.organization:
                        organization = invoice.created_by.organization

                        # Récupérer OrganizationSettings
                        org_settings = OrganizationSettings.objects.filter(
                            organization=organization
                        ).first()

                        # Récupérer le PrintTemplate par défaut
                        print_template = PrintTemplate.objects.filter(
                            organization=organization,
                            template_type='invoice',
                            is_default=True
                        ).first()

                        # Priorité: PrintTemplate > OrganizationSettings
                        if print_template and print_template.header_company_name:
                            org_data['name'] = print_template.header_company_name
                        elif org_settings and org_settings.company_name:
                            org_data['name'] = org_settings.company_name

                        if print_template and print_template.header_address:
                            org_data['address'] = print_template.header_address
                        elif org_settings and org_settings.company_address:
                            org_data['address'] = org_settings.company_address

                        if print_template and print_template.header_phone:
                            org_data['phone'] = print_template.header_phone
                        elif org_settings and org_settings.company_phone:
                            org_data['phone'] = org_settings.company_phone

                        if print_template and print_template.header_email:
                            org_data['email'] = print_template.header_email
                        elif org_settings and org_settings.company_email:
                            org_data['email'] = org_settings.company_email

                        if print_template and print_template.header_website:
                            org_data['website'] = print_template.header_website

                        # Logo
                        if print_template and print_template.header_logo:
                            org_data['logo_path'] = print_template.header_logo.path
                        elif org_settings and org_settings.company_logo:
                            org_data['logo_path'] = org_settings.company_logo.path

                        # Couleur de marque
                        if org_settings and hasattr(org_settings, 'brand_color') and org_settings.brand_color:
                            org_data['brand_color'] = org_settings.brand_color

            except Exception as e:
                print(f"[ERROR] Erreur lors de la recuperation des donnees organisation: {e}")

            return org_data

        def _get_logo_base64(self, org_data):
            """
            Convertit le logo en base64 pour l'inclure dans le HTML

            Support complet des formats d'image: PNG, JPEG, GIF, SVG, WebP
            """
            if not org_data.get('logo_path'):
                return None

            try:
                logo_path = org_data['logo_path']
                if os.path.exists(logo_path):
                    with open(logo_path, 'rb') as f:
                        logo_data = f.read()
                        logo_base64 = base64.b64encode(logo_data).decode('utf-8')

                        # Détecter le type MIME (support complet des formats image)
                        ext = os.path.splitext(logo_path)[1].lower()
                        mime_types = {
                            '.png': 'image/png',  # PNG - Priorité 1
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.gif': 'image/gif',
                            '.svg': 'image/svg+xml',
                            '.webp': 'image/webp',
                            '.bmp': 'image/bmp',
                            '.ico': 'image/x-icon',
                        }
                        mime_type = mime_types.get(ext, 'image/png')  # Défaut PNG

                        print(f"[INFO] Logo charge: {os.path.basename(logo_path)} ({mime_type})")
                        return f"data:{mime_type};base64,{logo_base64}"
                else:
                    print(f"[WARN] Fichier logo introuvable: {logo_path}")
            except Exception as e:
                print(f"[ERROR] Erreur lors de la conversion du logo en base64: {e}")
                import traceback
                traceback.print_exc()

            return None
