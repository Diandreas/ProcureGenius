"""
PDF generation service for Laboratory
"""
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
from decimal import Decimal
import base64
import os
import qrcode
import json


class LabResultPDFGenerator:
    """Service to generate Lab Result PDFs using WeasyPrint"""

    def generate_lab_result_pdf(self, order, template_type=None, language='fr'):
        """
        Generate PDF for a lab order result
        """
        from weasyprint import HTML, CSS
        
        # Get organization data
        org_data = self._get_organization_data(order)
        
        # Use default template from settings if not explicitly provided
        if not template_type or template_type == 'classic': # 'classic' is the default arg in many places
            template_type = org_data.get('default_template', 'classic')
        
        # Activating language
        from django.utils import translation
        translation.activate(language)
        
        # Prepare patient age and sex
        patient = order.patient
        patient_age = patient.get_age() if patient else None
        patient_sex = patient.gender if patient else None

        # Prepare items with history and structured parameters
        items_with_history = []
        for item in order.items.all().select_related('lab_test'):
            prev = item.get_previous_results(limit=1).first()
            
            # Build structured parameter groups for compound tests (e.g. NFS)
            parameter_results_grouped = None
            param_results = list(item.parameter_results.select_related('parameter').order_by('parameter__display_order'))
            if param_results:
                groups = {}
                for pv in param_results:
                    group = pv.parameter.group_name or 'Paramètres'
                    if group not in groups:
                        groups[group] = []
                    
                    factor = pv.parameter.conversion_factor or Decimal('1.0')
                    ref_min, ref_max = pv.parameter.get_reference_range(patient_age, patient_sex)
                    
                    # Apply conversion to reference ranges
                    if ref_min is not None: ref_min = ref_min * factor
                    if ref_max is not None: ref_max = ref_max * factor
                    
                    ref_display = ''
                    if ref_min is not None and ref_max is not None:
                        ref_display = f"{ref_min:g} – {ref_max:g}"
                    elif ref_min is not None:
                        ref_display = f"≥ {ref_min:g}"
                    elif ref_max is not None:
                        ref_display = f"≤ {ref_max:g}"
                    
                    # Apply conversion to result value
                    res_num = pv.result_numeric
                    if res_num is not None:
                        res_num = res_num * factor

                    groups[group].append({
                        'code': pv.parameter.code,
                        'name': pv.parameter.name,
                        'result_numeric': res_num,
                        'result_text': pv.result_text,
                        'flag': pv.flag,
                        'unit': pv.parameter.unit,
                        'ref_display': ref_display,
                    })
                parameter_results_grouped = [
                    {'group_name': g, 'parameters': rows}
                    for g, rows in groups.items()
                ]

            items_with_history.append({
                'item': item,
                'previous_result': prev.result_value if prev else None,
                'previous_date': prev.result_entered_at.strftime('%d/%m/%Y') if prev and prev.result_entered_at else None,
                'parameter_results_grouped': parameter_results_grouped
            })

        # Context
        context = {
            'order': order,
            'items': items_with_history, # Use wrapper list
            'patient': patient,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': self._generate_qr_code(order),
            'template_type': template_type,
            'brand_color': org_data.get('brand_color', '#000000'), # Default black/dark for modern look
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
                if settings_obj.default_invoice_template: org_data['default_template'] = settings_obj.default_invoice_template
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
