"""
Vue PDF pour les bons de commande utilisant django-weasyprint
"""
import os
import sys
import qrcode
import json
import base64
from io import BytesIO
from django.views.generic import DetailView
from django.http import Http404, HttpResponse

from .models import PurchaseOrder

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
    print("[OK] WeasyPrint charge avec succes pour PurchaseOrder!")
except (ImportError, OSError) as e:
    print(f"[ERROR] WeasyPrint non disponible: {e}")
    WEASYPRINT_AVAILABLE = False
    WeasyTemplateResponseMixin = object


if not WEASYPRINT_AVAILABLE:
    # Si WeasyPrint n'est pas disponible, créer une vue qui retourne une erreur
    class PurchaseOrderPDFView(DetailView):
        """Vue d'erreur si WeasyPrint n'est pas disponible"""
        model = PurchaseOrder

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
    class PurchaseOrderPDFView(WeasyTemplateResponseMixin, DetailView):
        """
        Vue pour générer un PDF de bon de commande avec WeasyPrint et django-weasyprint
        """
        model = PurchaseOrder
        template_name = 'purchase_orders/pdf_templates/po_modern.html'

        # Options PDF
        pdf_attachment = False  # Afficher inline au lieu de télécharger
        pdf_options = {
            'pdf_variant': 'pdf/a-3b',  # Variant PDF pour l'archivage
        }

        def get_template_names(self):
            """Sélectionne le template selon le paramètre 'template'"""
            template_type = self.request.GET.get('template', 'modern')

            # Mapping des 4 templates disponibles
            template_map = {
                'classic': 'purchase_orders/pdf_templates/po_classic.html',
                'modern': 'purchase_orders/pdf_templates/po_modern.html',
                'minimal': 'purchase_orders/pdf_templates/po_minimal.html',
                'professional': 'purchase_orders/pdf_templates/po_professional.html',
            }

            return [template_map.get(template_type, template_map['modern'])]

        def get_pdf_filename(self):
            """Génère le nom du fichier PDF dynamiquement"""
            po = self.get_object()
            return f'bon-commande-{po.po_number}.pdf'

        def get_context_data(self, **kwargs):
            """Ajoute les données nécessaires au contexte du template"""
            context = super().get_context_data(**kwargs)
            po = self.get_object()

            # Ajouter l'objet po au contexte
            context['po'] = po

            # Ajouter les données d'organisation
            org_data = self._get_organization_data(po)
            context['organization'] = org_data

            # Ajouter la couleur de marque
            context['brand_color'] = org_data.get('brand_color', '#2563eb')

            # Ajouter les paramètres d'impression
            context['paper_size'] = org_data.get('paper_size', 'A4')
            context['paper_orientation'] = org_data.get('paper_orientation', 'portrait')
            context['print_margins'] = org_data.get('print_margins', 12)

            # Ajouter le QR code en base64
            context['qr_code'] = self._generate_qr_code(po)

            # Ajouter le type de template pour styling conditionnel
            context['template_type'] = self.request.GET.get('template', 'modern')

            return context

        def _generate_qr_code(self, po):
            """
            Génère un QR code contenant les informations du bon de commande

            Returns:
                str: QR code encodé en base64 (data URL)
            """
            try:
                # Données à encoder dans le QR code
                qr_data = {
                    'po_id': str(po.id),
                    'po_number': po.po_number,
                    'total': float(po.total_amount) if po.total_amount else 0,
                    'date': po.created_at.isoformat() if po.created_at else None,
                    'status': po.status,
                    'supplier': po.supplier.name if po.supplier else None,
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

        def _get_organization_data(self, po):
            """Récupère les données de l'organisation"""
            org_data = {
                'name': None,
                'address': None,
                'phone': None,
                'email': None,
                'website': None,
                'logo_path': None,
                'logo_base64': None,
                'brand_color': '#2563eb',
                'paper_size': 'A4',
                'paper_orientation': 'portrait',
                'print_margins': 12,
            }

            try:
                from apps.core.models import OrganizationSettings

                if hasattr(po, 'created_by') and po.created_by:
                    if hasattr(po.created_by, 'organization') and po.created_by.organization:
                        organization = po.created_by.organization

                        # Récupérer OrganizationSettings
                        org_settings = OrganizationSettings.objects.filter(
                            organization=organization
                        ).first()

                        if org_settings:
                            # Récupérer les données seulement si elles ne sont pas vides
                            if org_settings.company_name and org_settings.company_name.strip():
                                org_data['name'] = org_settings.company_name
                            else:
                                # Fallback: utiliser le nom de l'organisation
                                org_data['name'] = organization.name if organization.name else None

                            if org_settings.company_address and org_settings.company_address.strip():
                                org_data['address'] = org_settings.company_address

                            if org_settings.company_phone and org_settings.company_phone.strip():
                                org_data['phone'] = org_settings.company_phone

                            if org_settings.company_email and org_settings.company_email.strip():
                                org_data['email'] = org_settings.company_email

                            if hasattr(org_settings, 'company_website') and org_settings.company_website and org_settings.company_website.strip():
                                org_data['website'] = org_settings.company_website

                            # Logo
                            if org_settings.company_logo:
                                org_data['logo_path'] = org_settings.company_logo.path
                                org_data['logo_base64'] = self._get_logo_base64(org_settings.company_logo.path)

                            # Couleur de marque
                            if hasattr(org_settings, 'brand_color') and org_settings.brand_color:
                                org_data['brand_color'] = org_settings.brand_color

                            # Paramètres d'impression
                            if hasattr(org_settings, 'paper_size') and org_settings.paper_size:
                                org_data['paper_size'] = org_settings.paper_size
                            if hasattr(org_settings, 'paper_orientation') and org_settings.paper_orientation:
                                org_data['paper_orientation'] = org_settings.paper_orientation
                            if hasattr(org_settings, 'print_margins') and org_settings.print_margins:
                                org_data['print_margins'] = org_settings.print_margins
                        else:
                            # Si pas d'OrganizationSettings, utiliser le nom de l'organisation
                            org_data['name'] = organization.name if organization.name else None

            except Exception as e:
                print(f"[ERROR] Erreur lors de la recuperation des donnees organisation: {e}")

            return org_data

        def _get_logo_base64(self, logo_path):
            """
            Convertit le logo en base64 pour l'inclure dans le HTML
            """
            if not logo_path:
                return None

            try:
                if os.path.exists(logo_path):
                    with open(logo_path, 'rb') as f:
                        logo_data = f.read()
                        logo_base64 = base64.b64encode(logo_data).decode('utf-8')

                        # Détecter le type MIME
                        ext = os.path.splitext(logo_path)[1].lower()
                        mime_types = {
                            '.png': 'image/png',
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.gif': 'image/gif',
                            '.svg': 'image/svg+xml',
                            '.webp': 'image/webp',
                            '.bmp': 'image/bmp',
                            '.ico': 'image/x-icon',
                        }
                        mime_type = mime_types.get(ext, 'image/png')

                        print(f"[INFO] Logo charge: {os.path.basename(logo_path)} ({mime_type})")
                        return f"data:{mime_type};base64,{logo_base64}"
                else:
                    print(f"[WARN] Fichier logo introuvable: {logo_path}")
            except Exception as e:
                print(f"[ERROR] Erreur lors de la conversion du logo en base64: {e}")

            return None
