from django.views.generic import DetailView
from apps.accounts.models import Client as Patient
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin

class PatientSummaryView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère le résumé du dossier médical patient (A4)
    """
    model = Patient
    template_name = 'patients/pdf_templates/patient_summary.html'
    pdf_attachment = False
    
    def get_pdf_filename(self):
        return f'dossier-medical-{self.get_object().id}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        patient = self.get_object()
        
        # Get comprehensive organization data (aligned with invoice pattern)
        org_data = self._get_comprehensive_organization_data(patient)
        
        # Sanitize brand_color to prevent WeasyPrint errors
        color = org_data.get('brand_color')
        if not color or not isinstance(color, str) or not color.startswith('#'):
            color = '#2563eb'
        org_data['brand_color'] = color
            
        context['organization'] = org_data
        context['brand_color'] = color
        context['logo_base64'] = self._get_logo_base64(org_data)
        
        context['patient'] = patient
        
        # Add summary data - Comprehensive History
        context['recent_consultations'] = patient.consultations.all().order_by('-consultation_date')
        context['all_prescriptions'] = patient.prescriptions.all().order_by('-prescribed_date')
        
        # Fetch lab orders with detailed test results
        context['all_lab_orders'] = patient.lab_orders.all().order_by('-order_date').prefetch_related('items')
        
        context['all_documents'] = patient.documents.all().order_by('-uploaded_at')
        
        return context
    
    def _get_comprehensive_organization_data(self, patient):
        """
        Get comprehensive organization data aligned with invoice pattern.
        Patient model accesses organization via patient.created_by.organization
        """
        from apps.core.models import OrganizationSettings
        from apps.invoicing.models import PrintTemplate
        
        org_data = {
            'company_name': None,
            'company_address': None,
            'company_phone': None,
            'company_email': None,
            'company_website': None,
            'company_logo': None,
            'brand_color': '#2563eb',
            'company_niu': None,
            'company_rc_number': None,
            'gst_number': None,
            'qst_number': None,
        }
        
        try:
            if hasattr(patient, 'created_by') and patient.created_by:
                if hasattr(patient.created_by, 'organization') and patient.created_by.organization:
                    organization = patient.created_by.organization
                    
                    # Try OrganizationSettings first
                    org_settings = OrganizationSettings.objects.filter(
                        organization=organization
                    ).first()
                    
                    if org_settings:
                        org_data['company_name'] = org_settings.company_name or organization.name
                        org_data['company_address'] = org_settings.company_address or ''
                        org_data['company_phone'] = org_settings.company_phone or ''
                        org_data['company_email'] = org_settings.company_email or ''
                        org_data['company_website'] = getattr(org_settings, 'company_website', '') or ''
                        org_data['company_logo'] = org_settings.company_logo
                        org_data['brand_color'] = getattr(org_settings, 'brand_color', '#2563eb') or '#2563eb'
                        org_data['company_niu'] = getattr(org_settings, 'company_niu', '') or ''
                        org_data['company_rc_number'] = getattr(org_settings, 'company_rc_number', '') or ''
                        org_data['gst_number'] = getattr(org_settings, 'company_gst_number', '') or ''
                        org_data['qst_number'] = getattr(org_settings, 'company_qst_number', '') or ''
                    else:
                        # Fallback to organization name
                        org_data['company_name'] = organization.name
        except Exception as e:
            print(f"[ERROR] Error retrieving organization data: {e}")
        
        return org_data

