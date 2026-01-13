"""
PDF generation service for Consultations
"""
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
import base64
import os
import qrcode
import json


class ConsultationPDFGenerator:
    """Service to generate Consultation/Prescription PDFs"""

    def generate_prescription_pdf(self, prescription, template_type='classic', language='fr'):
        """Generate PDF for a prescription"""
        from weasyprint import HTML
        
        org_data = self._get_organization_data(prescription.consultation)
        from django.utils import translation
        translation.activate(language)
        
        context = {
            'prescription': prescription,
            'consultation': prescription.consultation,
            'items': prescription.items.all(),
            'patient': prescription.consultation.patient,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': self._generate_qr_code(prescription),
            'template_type': template_type,
            'brand_color': org_data.get('brand_color', '#2563eb'),
        }
        
        template_name = f'consultations/pdf_templates/prescription_{template_type}.html'
        
        html_string = render_to_string(template_name, context)
        html = HTML(string=html_string, base_url=settings.BASE_DIR)
        return BytesIO(html.write_pdf())

    def generate_history_pdf(self, patient, consultations, template_type='classic', language='fr'):
        """Generate PDF for patient medical history"""
        from weasyprint import HTML
        
        # Use organization of the first consultation or current user? Passed context?
        # Assuming Patient is tied to client, organization is from request usually.
        # Here we'll take org from first consultation
        org_data = {}
        if consultations.exists():
            org_data = self._get_organization_data(consultations.first())
            
        from django.utils import translation
        translation.activate(language)
        
        context = {
            'patient': patient,
            'consultations': consultations,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'brand_color': org_data.get('brand_color', '#2563eb'),
        }

        template_name = f'consultations/pdf_templates/history_{template_type}.html'
        html_string = render_to_string(template_name, context)
        html = HTML(string=html_string, base_url=settings.BASE_DIR)
        return BytesIO(html.write_pdf())

    def _get_organization_data(self, obj):
        # ... Reuse logic ...
        org = obj.organization
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
                encoded = base64.b64encode(f.read()).decode('utf-8')
                return f"data:image/jpeg;base64,{encoded}"
        except Exception:
            return None

    def _generate_qr_code(self, obj):
        try:
            # Polymorphic ID?
            data = {'id': str(obj.id), 'type': 'prescription' if hasattr(obj, 'items') else 'consultation'}
            qr = qrcode.QRCode(box_size=10, border=1)
            qr.add_data(json.dumps(data))
            qr.make(fit=True)
            buffer = BytesIO()
            qr.make_image().save(buffer, format='PNG')
            return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
        except Exception:
            return None
