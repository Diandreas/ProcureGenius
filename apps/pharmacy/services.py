"""
PDF generation service for Pharmacy module
"""
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
import base64
import os
import qrcode
import json


class PharmacyPDFGenerator:
    """Service to generate Pharmacy dispensing PDFs using WeasyPrint"""

    def generate_dispensing_pdf(self, dispensing, template_type='receipt', language='fr'):
        """
        Generate PDF for a pharmacy dispensing
        
        Args:
            dispensing: PharmacyDispensing instance
            template_type: Template type ('receipt', 'detailed')
            language: Language for translations ('fr' or 'en')
        
        Returns:
            BytesIO: Buffer containing the PDF
        """
        from weasyprint import HTML
        
        # Get organization data
        org_data = self._get_organization_data(dispensing)
        
        # Activate language
        from django.utils import translation
        translation.activate(language)
        
        # Calculate totals
        items = dispensing.items.all().select_related('medication')
        subtotal = sum(item.total_price for item in items)
        total = subtotal  # Add tax calculation if needed
        
        # Context
        context = {
            'dispensing': dispensing,
            'items': items,
            'patient': dispensing.patient,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': self._generate_qr_code(dispensing),
            'template_type': template_type,
            'brand_color': org_data.get('brand_color', '#2563eb'),
            'language': language,
            'subtotal': subtotal,
            'total': total,
        }
        
        template_name = f'pharmacy/pdf_templates/dispensing_{template_type}.html'
        
        try:
            html_string = render_to_string(template_name, context)
            html = HTML(string=html_string, base_url=str(settings.BASE_DIR))
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
            
        except Exception as e:
            print(f"Error generating Pharmacy PDF: {e}")
            raise

    def _get_organization_data(self, dispensing):
        """Get organization display data"""
        org = dispensing.organization
        org_data = {
            'name': org.name if org else 'Organisation',
            'address': getattr(org, 'address', ''),
            'phone': getattr(org, 'phone', ''),
            'email': getattr(org, 'email', ''),
            'logo_path': None,
            'brand_color': '#2563eb',
        }
        
        try:
            from apps.core.models import OrganizationSettings
            settings_obj = OrganizationSettings.objects.filter(organization=org).first()
            if settings_obj:
                if settings_obj.company_name:
                    org_data['name'] = settings_obj.company_name
                if settings_obj.company_address:
                    org_data['address'] = settings_obj.company_address
                if settings_obj.company_phone:
                    org_data['phone'] = settings_obj.company_phone
                if settings_obj.company_email:
                    org_data['email'] = settings_obj.company_email
                if settings_obj.company_logo:
                    org_data['logo_path'] = settings_obj.company_logo.path
                if hasattr(settings_obj, 'brand_color') and settings_obj.brand_color:
                    org_data['brand_color'] = settings_obj.brand_color
        except Exception:
            pass
            
        return org_data

    def _get_logo_base64(self, org_data):
        """Convert logo to base64 for embedding in HTML"""
        if not org_data.get('logo_path') or not os.path.exists(org_data['logo_path']):
            return None
        try:
            with open(org_data['logo_path'], 'rb') as f:
                data = f.read()
                encoded = base64.b64encode(data).decode('utf-8')
                ext = os.path.splitext(org_data['logo_path'])[1].lower()
                mime_types = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.webp': 'image/webp',
                }
                mime = mime_types.get(ext, 'image/png')
                return f"data:{mime};base64,{encoded}"
        except Exception:
            return None

    def _generate_qr_code(self, dispensing):
        """Generate QR code with dispensing info"""
        try:
            data = {
                'id': str(dispensing.id),
                'number': dispensing.dispensing_number,
                'patient': dispensing.patient.name if dispensing.patient else 'Walk-in',
                'date': str(dispensing.dispensed_at),
                'status': dispensing.status
            }
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=2,
            )
            qr.add_data(json.dumps(data))
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
        except Exception:
            return None
