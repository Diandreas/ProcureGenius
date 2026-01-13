from django.views.generic import DetailView
from .models import Consultation, Prescription
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin


class ConsultationReceiptView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère REÇU thermal pour consultation (petit ticket de caisse)
    """
    model = Consultation
    template_name = 'consultations/pdf_templates/consultation_receipt_thermal.html'

    pdf_attachment = False
    pdf_options = {'pdf_variant': 'pdf/a-3b'}

    def get_pdf_filename(self):
        consultation = self.get_object()
        return f'recu-consultation-{consultation.consultation_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        consultation = self.get_object()

        # Données organisation
        org_data = self._get_organization_data(consultation)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)
        context['paper_size'] = org_data.get('paper_size', 'thermal_80')  # Force thermal

        # QR code
        qr_data = {
            'type': 'consultation_receipt',
            'consultation_id': str(consultation.id),
            'consultation_number': consultation.consultation_number,
            'patient': consultation.patient.get_full_name() if consultation.patient else '',
            'doctor': consultation.doctor.get_full_name() if consultation.doctor else '',
            'date': str(consultation.consultation_date),
        }
        context['qr_code_base64'] = self._generate_qr_code(consultation, qr_data)

        # Données consultation
        context['consultation'] = consultation
        context['patient'] = consultation.patient
        context['doctor'] = consultation.doctor

        return context


class ConsultationReportView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère le rapport de consultation complet (A4)
    """
    model = Consultation
    template_name = 'consultations/pdf_templates/consultation_report.html'
    pdf_attachment = False
    
    def get_pdf_filename(self):
        return f'rapport-{self.get_object().consultation_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        consultation = self.get_object()
        
        org_data = self._get_organization_data(consultation)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)
        
        context['consultation'] = consultation
        context['patient'] = consultation.patient
        context['prescriptions'] = consultation.prescriptions.all()
        # Add lab orders if any linked to visit or patient/date
        
        return context


class PrescriptionPDFView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère l'ordonnance (A4)
    """
    model = Prescription
    template_name = 'consultations/pdf_templates/prescription.html'
    pdf_attachment = False
    
    def get_pdf_filename(self):
        return f'ordonnance-{self.get_object().prescription_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        prescription = self.get_object()
        
        org_data = self._get_organization_data(prescription)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)
        
        # QR code for verification
        qr_data = {
            'type': 'prescription',
            'id': str(prescription.id),
            'number': prescription.prescription_number,
            'patient': prescription.patient.get_full_name(),
            'doctor': prescription.prescriber.get_full_name() if prescription.prescriber else '',
            'date': str(prescription.prescribed_date.date()),
        }
        context['qr_code_base64'] = self._generate_qr_code(prescription, qr_data)
        
        context['prescription'] = prescription
        context['patient'] = prescription.patient
        context['prescriber'] = prescription.prescriber
        context['items'] = prescription.items.all()
        
        return context
