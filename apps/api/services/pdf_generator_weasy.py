# PDF generation service using WeasyPrint (HTML/CSS → PDF)
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
import base64
import os
import qrcode
import json
from datetime import datetime


class InvoiceWeasyPDFGenerator:
    """Service pour générer des PDFs de facture avec WeasyPrint (HTML/CSS)

    WeasyPrint offre un excellent support CSS3, permettant des designs modernes
    et professionnels pour vos factures.
    """

    def generate_invoice_pdf(self, invoice, template_type='classic'):
        """
        Génère un PDF pour une facture donnée en utilisant HTML/CSS et WeasyPrint

        Args:
            invoice: Instance du modèle Invoice
            template_type: Type de template ('classic', 'modern', 'minimal')

        Returns:
            BytesIO: Buffer contenant le PDF généré
        """
        try:
            from weasyprint import HTML, CSS
        except ImportError:
            print("⚠ WeasyPrint non disponible, utilisation de ReportLab fallback")
            from .pdf_generator import generate_invoice_pdf
            return generate_invoice_pdf(invoice, template_type)

        # Récupérer les données de l'organisation
        org_data = self._get_organization_data(invoice)

        # Générer le QR code
        qr_code_base64 = self._generate_qr_code(invoice)

        # Préparer le contexte pour le template
        context = {
            'invoice': invoice,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code_base64,  # Ajouter le QR code au contexte
            'items': invoice.items.all() if hasattr(invoice, 'items') else [],
            'subtotal': getattr(invoice, 'subtotal', 0) or 0,
            'tax_amount': getattr(invoice, 'tax_amount', 0) or 0,
            'total_amount': getattr(invoice, 'total_amount', 0) or 0,
            'issue_date': getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None),
            'due_date': getattr(invoice, 'due_date', None),
            'client': invoice.client if hasattr(invoice, 'client') else None,
            'template_type': template_type,  # Pour le styling conditionnel
        }

        # Sélectionner le template HTML selon le type
        template_name = f'invoicing/pdf_templates/invoice_{template_type}.html'

        try:
            # Rendu HTML
            html_string = render_to_string(template_name, context)

            # Générer le PDF avec WeasyPrint
            html = HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()

            # Convertir en BytesIO pour compatibilité avec l'API existante
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)

            print(f"✓ PDF généré avec WeasyPrint (template: {template_type})")
            return buffer

        except Exception as e:
            print(f"⚠ Erreur WeasyPrint: {e}, utilisation de ReportLab fallback")
            from .pdf_generator import generate_invoice_pdf
            return generate_invoice_pdf(invoice, template_type)

    def _generate_qr_code(self, invoice):
        """
        Génère un QR code contenant les informations de la facture

        Le QR code peut être scanné pour vérifier l'authenticité de la facture
        et accéder rapidement à ses informations.

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
            print(f"✗ Erreur lors de la génération du QR code: {e}")
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
        }

        try:
            from apps.core.models import OrganizationSettings
            from apps.invoicing.models import PrintTemplate

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

        except Exception as e:
            print(f"✗ Erreur lors de la récupération des données organisation: {e}")

        return org_data

    def _get_logo_base64(self, org_data):
        """Convertit le logo en base64 pour l'inclure dans le HTML"""
        if not org_data.get('logo_path'):
            return None

        try:
            logo_path = org_data['logo_path']
            if os.path.exists(logo_path):
                with open(logo_path, 'rb') as f:
                    logo_data = f.read()
                    logo_base64 = base64.b64encode(logo_data).decode('utf-8')

                    # Détecter le type MIME
                    ext = os.path.splitext(logo_path)[1].lower()
                    mime_types = {
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.png': 'image/png',
                        '.gif': 'image/gif',
                        '.svg': 'image/svg+xml',
                    }
                    mime_type = mime_types.get(ext, 'image/jpeg')

                    return f"data:{mime_type};base64,{logo_base64}"
        except Exception as e:
            print(f"✗ Erreur lors de la conversion du logo en base64: {e}")

        return None


def generate_invoice_pdf_weasy(invoice, template_type='classic'):
    """
    Fonction utilitaire pour générer un PDF de facture avec WeasyPrint

    Args:
        invoice: Instance du modèle Invoice
        template_type: Type de template ('classic', 'modern', 'minimal')

    Returns:
        BytesIO: Buffer contenant le PDF
    """
    generator = InvoiceWeasyPDFGenerator()
    return generator.generate_invoice_pdf(invoice, template_type)
