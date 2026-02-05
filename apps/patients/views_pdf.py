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
        
        print(f"\n{'='*80}")
        print(f"[DEBUG] PatientSummaryView - Generating PDF for patient: {patient.name}")
        print(f"[DEBUG] Patient ID: {patient.id}")
        print(f"[DEBUG] Patient organization: {patient.organization}")
        
        # Get comprehensive organization data (aligned with invoice pattern)
        org_data = self._get_comprehensive_organization_data(patient)
        
        print(f"[DEBUG] Organization data retrieved:")
        print(f"  - company_name: '{org_data.get('company_name')}'")
        print(f"  - company_address: '{org_data.get('company_address')}'")
        print(f"  - company_phone: '{org_data.get('company_phone')}'")
        print(f"  - company_logo: {org_data.get('company_logo')}")
        print(f"  - brand_color: '{org_data.get('brand_color')}'")
        
        # Sanitize brand_color to prevent WeasyPrint errors
        color = org_data.get('brand_color')
        if not color or not isinstance(color, str) or not color.startswith('#'):
            color = '#2563eb'
        org_data['brand_color'] = color
            
        context['organization'] = org_data
        context['brand_color'] = color
        
        logo_b64 = self._get_logo_base64(org_data)
        context['logo_base64'] = logo_b64
        print(f"[DEBUG] Logo base64 generated: {bool(logo_b64)}")
        
        context['patient'] = patient
        
        # Add summary data - Comprehensive History
        context['recent_consultations'] = patient.consultations.all().order_by('-consultation_date')
        context['all_prescriptions'] = patient.prescriptions.all().order_by('-prescribed_date')
        
        # Fetch lab orders with detailed test results
        all_lab_orders = patient.lab_orders.all().order_by('-order_date').prefetch_related('items')
        context['all_lab_orders'] = all_lab_orders
        print(f"[DEBUG] Lab orders count: {all_lab_orders.count()}")
        
        # Fetch nursing care/procedures from invoice items
        from apps.invoicing.models import InvoiceItem, ProductCategory
        
        # Get categories that represent nursing care
        care_categories = ProductCategory.objects.filter(
            organization=patient.organization,
            name__iregex=r'(soin|pansement|vaccination|injection|perfusion)'
        ).values_list('id', flat=True)
        
        context['nursing_care'] = InvoiceItem.objects.filter(
            invoice__organization=patient.organization,
            invoice__client=patient,
            invoice__status='paid',
            product__category__in=care_categories
        ).select_related('product', 'invoice').order_by('-invoice__created_at')
        
        context['all_documents'] = patient.documents.all().order_by('-uploaded_at')
        
        print(f"[DEBUG] Context keys: {list(context.keys())}")
        print(f"{'='*80}\n")
        
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
            # Client model has organization field directly
            if hasattr(patient, 'organization') and patient.organization:
                organization = patient.organization
                
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
    
    def _get_logo_base64(self, org_data):
        """
        Convertit le logo en base64 pour l'inclure dans le HTML
        Aligned with invoice pattern
        """
        import os
        import base64
        
        logo_field = org_data.get('company_logo')
        if not logo_field:
            return None

        try:
            # Get the file path from the ImageField
            if hasattr(logo_field, 'path'):
                logo_path = logo_field.path
            else:
                # Fallback if it's already a string path
                logo_path = str(logo_field)
            
            if os.path.exists(logo_path):
                with open(logo_path, 'rb') as f:
                    logo_data = f.read()
                    logo_base64 = base64.b64encode(logo_data).decode('utf-8')

                    # Detect MIME type
                    ext = os.path.splitext(logo_path)[1].lower()
                    mime_types = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.svg': 'image/svg+xml',
                        '.webp': 'image/webp',
                    }
                    mime_type = mime_types.get(ext, 'image/png')

                    print(f"[INFO] Logo loaded: {os.path.basename(logo_path)} ({mime_type})")
                    return f"data:{mime_type};base64,{logo_base64}"
            else:
                print(f"[WARN] Logo file not found: {logo_path}")
        except Exception as e:
            print(f"[ERROR] Logo conversion error: {e}")
            import traceback
            traceback.print_exc()

        return None

