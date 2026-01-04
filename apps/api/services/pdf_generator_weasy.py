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

    def generate_invoice_pdf(self, invoice, template_type='classic', language='fr'):
        """
        Génère un PDF pour une facture donnée en utilisant HTML/CSS et WeasyPrint

        Args:
            invoice: Instance du modèle Invoice
            template_type: Type de template ('classic', 'modern', 'minimal')
            language: Langue pour les traductions ('fr' ou 'en')

        Returns:
            BytesIO: Buffer contenant le PDF généré
        """
        from weasyprint import HTML, CSS

        # Récupérer les données de l'organisation
        org_data = self._get_organization_data(invoice)

        # Générer le QR code
        qr_code_base64 = self._generate_qr_code(invoice)

        # Activer la langue pour les traductions du template
        from django.utils import translation
        translation.activate(language)

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
            'brand_color': org_data.get('brand_color', '#2563eb'),  # Couleur de marque depuis les paramètres
            'language': language,  # Langue pour le template
            'paper_size': org_data.get('paper_size', 'A4'),  # Format de papier
        }

        # Détecter le format thermal et utiliser le template approprié
        paper_size = org_data.get('paper_size', 'A4')
        print(f"\n{'='*80}")
        print(f"[DEBUG] generate_invoice_pdf - Invoice PDF")
        print(f"[DEBUG] paper_size from org_data: '{paper_size}'")
        print(f"[DEBUG] template_type requested: '{template_type}'")
        print(f"[DEBUG] Is thermal? {paper_size in ['thermal_80', 'thermal_58']}")
        print(f"{'='*80}\n")

        # Si format thermique, utiliser le template de ticket
        if paper_size in ['thermal_80', 'thermal_58']:
            template_name = 'invoicing/pdf_templates/invoice_thermal.html'
            print(f"[INFO] ✓ Utilisation du template THERMAL pour facture")
        else:
            # Sinon, utiliser le template spécifié par l'utilisateur
            template_name = f'invoicing/pdf_templates/invoice_{template_type}.html'
            print(f"[INFO] Utilisation du template standard: {template_type}")

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
            print(f"✗ Erreur WeasyPrint: {e}")
            raise

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
            'brand_color': '#2563eb',  # Couleur par défaut
            'paper_size': 'A4',  # Format de papier par défaut
            'paper_orientation': 'portrait',
            'tax_region': 'international',
            'currency': 'CAD',
            'niu': None,
            'rc_number': None,
            'rccm_number': None,
            'tax_number': None,
            'vat_number': None,
            'gst_number': None,
            'qst_number': None,
            'neq': None,
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

                    # Priorité: OrganizationSettings > PrintTemplate
                    # Utiliser toujours company_name de OrganizationSettings
                    if org_settings and org_settings.company_name:
                        org_data['name'] = org_settings.company_name
                    elif print_template and print_template.header_company_name:
                        org_data['name'] = print_template.header_company_name

                    if org_settings and org_settings.company_address:
                        org_data['address'] = org_settings.company_address
                    elif print_template and print_template.header_address:
                        org_data['address'] = print_template.header_address

                    if org_settings and org_settings.company_phone:
                        org_data['phone'] = org_settings.company_phone
                    elif print_template and print_template.header_phone:
                        org_data['phone'] = print_template.header_phone

                    if org_settings and org_settings.company_email:
                        org_data['email'] = org_settings.company_email
                    elif print_template and print_template.header_email:
                        org_data['email'] = print_template.header_email

                    if org_settings and hasattr(org_settings, 'company_website') and org_settings.company_website:
                        org_data['website'] = org_settings.company_website
                    elif print_template and print_template.header_website:
                        org_data['website'] = print_template.header_website

                    # Logo
                    if org_settings and org_settings.company_logo:
                        org_data['logo_path'] = org_settings.company_logo.path
                    elif print_template and print_template.header_logo:
                        org_data['logo_path'] = print_template.header_logo.path

                    # Couleur de marque (brand_color)
                    if org_settings and hasattr(org_settings, 'brand_color') and org_settings.brand_color:
                        org_data['brand_color'] = org_settings.brand_color
                    elif print_template and print_template.primary_color:
                        org_data['brand_color'] = print_template.primary_color

                    # Paramètres d'impression
                    if org_settings:
                        if hasattr(org_settings, 'paper_size') and org_settings.paper_size:
                            org_data['paper_size'] = org_settings.paper_size
                        if hasattr(org_settings, 'paper_orientation') and org_settings.paper_orientation:
                            org_data['paper_orientation'] = org_settings.paper_orientation

                        # Région fiscale et devise
                        if hasattr(org_settings, 'tax_region') and org_settings.tax_region:
                            org_data['tax_region'] = org_settings.tax_region
                        if hasattr(org_settings, 'default_currency') and org_settings.default_currency:
                            org_data['currency'] = org_settings.default_currency

                        # Identifiants fiscaux
                        if hasattr(org_settings, 'company_niu') and org_settings.company_niu:
                            org_data['niu'] = org_settings.company_niu
                        if hasattr(org_settings, 'company_rc_number') and org_settings.company_rc_number:
                            org_data['rc_number'] = org_settings.company_rc_number
                        if hasattr(org_settings, 'company_rccm_number') and org_settings.company_rccm_number:
                            org_data['rccm_number'] = org_settings.company_rccm_number
                        if hasattr(org_settings, 'company_tax_number') and org_settings.company_tax_number:
                            org_data['tax_number'] = org_settings.company_tax_number
                        if hasattr(org_settings, 'company_vat_number') and org_settings.company_vat_number:
                            org_data['vat_number'] = org_settings.company_vat_number
                        if hasattr(org_settings, 'company_gst_number') and org_settings.company_gst_number:
                            org_data['gst_number'] = org_settings.company_gst_number
                        if hasattr(org_settings, 'company_qst_number') and org_settings.company_qst_number:
                            org_data['qst_number'] = org_settings.company_qst_number
                        if hasattr(org_settings, 'company_neq') and org_settings.company_neq:
                            org_data['neq'] = org_settings.company_neq

        except Exception as e:
            print(f"✗ Erreur lors de la récupération des données organisation: {e}")
            import traceback
            traceback.print_exc()

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


class PurchaseOrderWeasyPDFGenerator:
    """Service pour générer des PDFs de bon de commande avec WeasyPrint (HTML/CSS)

    WeasyPrint offre un excellent support CSS3, permettant des designs modernes
    et professionnels pour vos bons de commande.
    """

    def generate_purchase_order_pdf(self, po, template_type='modern', language='fr'):
        """
        Génère un PDF pour un bon de commande donné en utilisant HTML/CSS et WeasyPrint

        Args:
            po: Instance du modèle PurchaseOrder
            template_type: Type de template ('classic', 'modern', 'minimal', 'professional')
            language: Langue pour les traductions ('fr' ou 'en')

        Returns:
            BytesIO: Buffer contenant le PDF généré
        """
        from weasyprint import HTML, CSS

        # Récupérer les données de l'organisation
        org_data = self._get_organization_data(po)

        # Générer le QR code
        qr_code_base64 = self._generate_qr_code(po)

        # Activer la langue pour les traductions du template
        from django.utils import translation
        translation.activate(language)

        # Préparer le contexte pour le template
        context = {
            'po': po,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code_base64,  # Ajouter le QR code au contexte (nom cohérent avec factures)
            'items': po.items.all() if hasattr(po, 'items') else [],
            'total_amount': getattr(po, 'total_amount', 0) or 0,
            'created_date': getattr(po, 'created_at', None),  # Nom cohérent avec le template
            'required_date': getattr(po, 'required_date', None),
            'supplier': po.supplier if hasattr(po, 'supplier') else None,
            'template_type': template_type,  # Pour le styling conditionnel
            'brand_color': org_data.get('brand_color', '#2563eb'),  # Couleur de marque depuis les paramètres
            'language': language,  # Langue pour le template
            'paper_size': org_data.get('paper_size', 'A4'),  # Format de papier
        }

        # Détecter le format thermal et utiliser le template approprié
        paper_size = org_data.get('paper_size', 'A4')
        print(f"\n{'='*80}")
        print(f"[DEBUG] generate_purchase_order_pdf - Purchase Order PDF")
        print(f"[DEBUG] paper_size from org_data: '{paper_size}'")
        print(f"[DEBUG] template_type requested: '{template_type}'")
        print(f"[DEBUG] Is thermal? {paper_size in ['thermal_80', 'thermal_58']}")
        print(f"{'='*80}\n")

        # Si format thermique, utiliser le template de ticket
        if paper_size in ['thermal_80', 'thermal_58']:
            template_name = 'purchase_orders/pdf_templates/po_thermal.html'
            print(f"[INFO] ✓ Utilisation du template THERMAL pour bon de commande")
        else:
            # Sinon, utiliser le template spécifié par l'utilisateur
            template_name = f'purchase_orders/pdf_templates/po_{template_type}.html'
            print(f"[INFO] Utilisation du template standard: {template_type}")

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
            print(f"✗ Erreur WeasyPrint: {e}")
            raise

    def _generate_qr_code(self, po):
        """
        Génère un QR code contenant les informations du bon de commande

        Le QR code peut être scanné pour vérifier l'authenticité du bon de commande
        et accéder rapidement à ses informations.

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
                'status': getattr(po, 'status', 'unknown'),
                'supplier': po.supplier.name if po.supplier and hasattr(po.supplier, 'name') else None,
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

    def _get_organization_data(self, po):
        """Récupère les données de l'organisation"""
        org_data = {
            'name': None,
            'address': None,
            'phone': None,
            'email': None,
            'website': None,
            'logo_path': None,
            'brand_color': '#2563eb',  # Couleur par défaut
        }

        try:
            from apps.core.models import OrganizationSettings
            from apps.invoicing.models import PrintTemplate

            if hasattr(po, 'created_by') and po.created_by:
                if hasattr(po.created_by, 'organization') and po.created_by.organization:
                    organization = po.created_by.organization

                    # Récupérer OrganizationSettings
                    org_settings = OrganizationSettings.objects.filter(
                        organization=organization
                    ).first()

                    # Récupérer le PrintTemplate par défaut
                    print_template = PrintTemplate.objects.filter(
                        organization=organization,
                        template_type='purchase_order',  # Utiliser le template pour les bons de commande
                        is_default=True
                    ).first()

                    # Priorité: OrganizationSettings > PrintTemplate
                    # Utiliser toujours company_name de OrganizationSettings
                    if org_settings and org_settings.company_name:
                        org_data['name'] = org_settings.company_name
                    elif print_template and print_template.header_company_name:
                        org_data['name'] = print_template.header_company_name

                    if org_settings and org_settings.company_address:
                        org_data['address'] = org_settings.company_address
                    elif print_template and print_template.header_address:
                        org_data['address'] = print_template.header_address

                    if org_settings and org_settings.company_phone:
                        org_data['phone'] = org_settings.company_phone
                    elif print_template and print_template.header_phone:
                        org_data['phone'] = print_template.header_phone

                    if org_settings and org_settings.company_email:
                        org_data['email'] = org_settings.company_email
                    elif print_template and print_template.header_email:
                        org_data['email'] = print_template.header_email

                    if org_settings and hasattr(org_settings, 'company_website') and org_settings.company_website:
                        org_data['website'] = org_settings.company_website
                    elif print_template and print_template.header_website:
                        org_data['website'] = print_template.header_website

                    # Logo
                    if org_settings and org_settings.company_logo:
                        org_data['logo_path'] = org_settings.company_logo.path
                    elif print_template and print_template.header_logo:
                        org_data['logo_path'] = print_template.header_logo.path

                    # Couleur de marque (brand_color)
                    if org_settings and hasattr(org_settings, 'brand_color') and org_settings.brand_color:
                        org_data['brand_color'] = org_settings.brand_color
                    elif print_template and print_template.primary_color:
                        org_data['brand_color'] = print_template.primary_color

                    # Paramètres d'impression
                    if org_settings:
                        if hasattr(org_settings, 'paper_size') and org_settings.paper_size:
                            org_data['paper_size'] = org_settings.paper_size
                        if hasattr(org_settings, 'paper_orientation') and org_settings.paper_orientation:
                            org_data['paper_orientation'] = org_settings.paper_orientation

                        # Région fiscale et devise
                        if hasattr(org_settings, 'tax_region') and org_settings.tax_region:
                            org_data['tax_region'] = org_settings.tax_region
                        if hasattr(org_settings, 'default_currency') and org_settings.default_currency:
                            org_data['currency'] = org_settings.default_currency

                        # Identifiants fiscaux
                        if hasattr(org_settings, 'company_niu') and org_settings.company_niu:
                            org_data['niu'] = org_settings.company_niu
                        if hasattr(org_settings, 'company_rc_number') and org_settings.company_rc_number:
                            org_data['rc_number'] = org_settings.company_rc_number
                        if hasattr(org_settings, 'company_rccm_number') and org_settings.company_rccm_number:
                            org_data['rccm_number'] = org_settings.company_rccm_number
                        if hasattr(org_settings, 'company_tax_number') and org_settings.company_tax_number:
                            org_data['tax_number'] = org_settings.company_tax_number
                        if hasattr(org_settings, 'company_vat_number') and org_settings.company_vat_number:
                            org_data['vat_number'] = org_settings.company_vat_number
                        if hasattr(org_settings, 'company_gst_number') and org_settings.company_gst_number:
                            org_data['gst_number'] = org_settings.company_gst_number
                        if hasattr(org_settings, 'company_qst_number') and org_settings.company_qst_number:
                            org_data['qst_number'] = org_settings.company_qst_number
                        if hasattr(org_settings, 'company_neq') and org_settings.company_neq:
                            org_data['neq'] = org_settings.company_neq

        except Exception as e:
            print(f"✗ Erreur lors de la récupération des données organisation: {e}")
            import traceback
            traceback.print_exc()

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


def generate_invoice_pdf_weasy(invoice, template_type='classic', language='fr'):
    """
    Fonction utilitaire pour générer un PDF de facture avec WeasyPrint

    Args:
        invoice: Instance du modèle Invoice
        template_type: Type de template ('classic', 'modern', 'minimal')
        language: Langue pour les traductions ('fr' ou 'en')

    Returns:
        BytesIO: Buffer contenant le PDF
    """
    generator = InvoiceWeasyPDFGenerator()
    return generator.generate_invoice_pdf(invoice, template_type, language=language)


def generate_purchase_order_pdf_weasy(po, template_type='modern', language='fr'):
    """
    Fonction utilitaire pour générer un PDF de bon de commande avec WeasyPrint

    Args:
        po: Instance du modèle PurchaseOrder
        template_type: Type de template ('classic', 'modern', 'minimal', 'professional')
        language: Langue pour les traductions ('fr' ou 'en')

    Returns:
        BytesIO: Buffer contenant le PDF
    """
    generator = PurchaseOrderWeasyPDFGenerator()
    return generator.generate_purchase_order_pdf(po, template_type, language=language)
