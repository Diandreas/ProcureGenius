"""
PDF generation service for Laboratory
"""
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
import base64
import os
import qrcode
import json


class LabResultPDFGenerator:
    """Service to generate Lab Result PDFs using WeasyPrint"""

    def generate_lab_result_pdf(self, order, template_type='classic', language='fr'):
        """
        Generate PDF for a lab order result
        """
        from weasyprint import HTML, CSS
        
        # Get organization data
        org_data = self._get_organization_data(order)
        
        # Activating language
        from django.utils import translation
        translation.activate(language)
        
        # Context
        context = {
            'order': order,
            'items': order.items.all().select_related('lab_test'),
            'patient': order.patient,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': self._generate_qr_code(order),
            'template_type': template_type,
            'brand_color': org_data.get('brand_color', '#2563eb'),
            'language': language,
        }
        
        template_name = f'laboratory/pdf_templates/lab_result_{template_type}.html'
        
        try:
            html_string = render_to_string(template_name, context)
            html = HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
            
        except Exception as e:
            print(f"Error generating Lab PDF: {e}")
            raise

    def _get_organization_data(self, order):
        """Get organization display data"""
        # Retrieve from OrganizationSettings if available
        org = order.organization
        org_data = {
            'name': org.name,
            'address': org.address,
            'phone': org.phone,
            'email': org.email,
            'logo_path': None,
            'brand_color': '#2563eb',
        }
        
        try:
            from apps.core.models import OrganizationSettings
            settings_obj = OrganizationSettings.objects.filter(organization=org).first()
            if settings_obj:
                if settings_obj.company_name: org_data['name'] = settings_obj.company_name
                if settings_obj.company_address: org_data['address'] = settings_obj.company_address
                if settings_obj.company_phone: org_data['phone'] = settings_obj.company_phone
                if settings_obj.company_email: org_data['email'] = settings_obj.company_email
                if settings_obj.company_logo: org_data['logo_path'] = settings_obj.company_logo.path
                if settings_obj.brand_color: org_data['brand_color'] = settings_obj.brand_color
        except Exception:
            pass
            
        return org_data

    def _get_logo_base64(self, org_data):
        if not org_data.get('logo_path') or not os.path.exists(org_data['logo_path']):
            return None
        try:
            with open(org_data['logo_path'], 'rb') as f:
                data = f.read()
                encoded = base64.b64encode(data).decode('utf-8')
                # Simple guess for extension
                ext = os.path.splitext(org_data['logo_path'])[1].lower()
                mime = 'image/png' if ext == '.png' else 'image/jpeg'
                return f"data:{mime};base64,{encoded}"
        except Exception:
            return None

    def _generate_qr_code(self, order):
        try:
            data = {
                'order_id': str(order.id),
                'order_number': order.order_number,
                'patient': order.patient.name,
                'date': str(order.order_date),
                'status': order.status
            }
            qr = qrcode.QRCode(box_size=10, border=1)
            qr.add_data(json.dumps(data))
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
        except Exception:
            return None
