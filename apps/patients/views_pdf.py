from django.views.generic import DetailView
from apps.accounts.models import Client as Patient
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin

class PatientSummaryView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère le dossier médical complet du patient (A4)
    Inclut: identité, consultations détaillées (constantes, diagnostic, traitement),
    ordonnances avec médicaments, examens labo avec résultats, dispensations pharmacie,
    soins administrés, visites, documents.
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

        logo_b64 = self._get_logo_base64(org_data)
        context['logo_base64'] = logo_b64

        context['patient'] = patient

        # ── 1. Consultations with full details (vitals, diagnosis, treatment) ──
        consultations = patient.consultations.all().select_related(
            'doctor', 'vitals_taken_by'
        ).order_by('-consultation_date')
        context['all_consultations'] = consultations

        # ── 2. Prescriptions with their items (medications) ──
        try:
            from apps.consultations.models import Prescription
            prescriptions = Prescription.objects.filter(
                patient=patient
            ).select_related(
                'prescriber', 'consultation'
            ).prefetch_related('items__medication').order_by('-prescribed_date')
            context['all_prescriptions'] = prescriptions
        except Exception:
            context['all_prescriptions'] = []

        # ── 3. Lab orders with detailed test results ──
        all_lab_orders = patient.lab_orders.all().select_related(
            'ordered_by', 'results_entered_by', 'results_verified_by'
        ).prefetch_related('items__lab_test').order_by('-order_date')
        context['all_lab_orders'] = all_lab_orders

        # ── 4. Pharmacy dispensings with items ──
        try:
            dispensings = patient.pharmacy_dispensings.all().select_related(
                'dispensed_by'
            ).prefetch_related('items__medication').order_by('-dispensed_at')
            context['all_dispensings'] = dispensings
        except Exception:
            context['all_dispensings'] = []

        # ── 5. Care services (soins administrés) ──
        try:
            from apps.patients.models_care import PatientCareService
            care_services = PatientCareService.objects.filter(
                patient=patient
            ).select_related('provided_by').order_by('-provided_at')
            context['all_care_services'] = care_services
        except Exception:
            context['all_care_services'] = []

        # ── 6. Patient visits ──
        try:
            visits = patient.visits.all().select_related(
                'assigned_doctor', 'registered_by'
            ).order_by('-arrived_at')
            context['all_visits'] = visits
        except Exception:
            context['all_visits'] = []

        # ── 7. Documents ──
        try:
            context['all_documents'] = patient.documents.all().order_by('-uploaded_at')
        except Exception:
            context['all_documents'] = []

        # ── 8. Statistics summary ──
        context['stats'] = {
            'total_consultations': consultations.count(),
            'total_lab_orders': all_lab_orders.count(),
            'total_prescriptions': len(context['all_prescriptions']) if context['all_prescriptions'] else 0,
            'total_dispensings': len(context['all_dispensings']) if context['all_dispensings'] else 0,
            'total_care_services': len(context['all_care_services']) if context['all_care_services'] else 0,
            'total_visits': len(context['all_visits']) if context['all_visits'] else 0,
        }

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

        # Add aliases used by pdf_base.html template
        org_data['name'] = org_data.get('company_name') or ''
        org_data['address'] = org_data.get('company_address') or ''
        org_data['phone'] = org_data.get('company_phone') or ''
        org_data['email'] = org_data.get('company_email') or ''

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

