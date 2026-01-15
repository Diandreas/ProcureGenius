"""
Vues PDF pour pharmacie: reçus thermal de dispensation
"""
from django.views.generic import DetailView
from .models import PharmacyDispensing
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin


from django.contrib.auth.mixins import LoginRequiredMixin

class PharmacyDispensingReceiptView(LoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère REÇU thermal pour dispensation pharmacie (petit ticket de caisse)
    """
    model = PharmacyDispensing
    template_name = 'pharmacy/pdf_templates/dispensing_receipt_thermal.html'

    pdf_attachment = False
    pdf_options = {'pdf_variant': 'pdf/a-3b'}

    def get_pdf_filename(self):
        dispensing = self.get_object()
        return f'recu-pharmacie-{dispensing.dispensing_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        dispensing = self.get_object()

        # Données organisation
        org_data = self._get_organization_data(dispensing)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)
        context['paper_size'] = org_data.get('paper_size', 'thermal_80')  # Force thermal

        # QR code avec données dispensation
        qr_data = {
            'type': 'pharmacy_receipt',
            'dispensing_id': str(dispensing.id),
            'dispensing_number': dispensing.dispensing_number,
            'patient': dispensing.patient.get_full_name() if dispensing.patient else 'Vente comptoir',
            'date': str(dispensing.dispensed_at) if dispensing.dispensed_at else str(dispensing.created_at),
            'total': str(dispensing.total_amount),
        }
        context['qr_code_base64'] = self._generate_qr_code(dispensing, qr_data)

        # Données pharmacie
        context['dispensing'] = dispensing
        context['items'] = dispensing.items.all()

        return context
