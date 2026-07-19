from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import MedicalDocument
from .serializers import MedicalDocumentSerializer
from apps.healthcare.pdf_helpers import HealthcarePDFMixin

TEMPLATE_BY_TYPE = {
    'referral': 'medical_documents/pdf_templates/referral.html',
    'rest_note': 'medical_documents/pdf_templates/rest_note.html',
    'nursing_care': 'medical_documents/pdf_templates/nursing_care.html',
    'referral_counter_referral': 'medical_documents/pdf_templates/referral_counter_referral.html',
}


class MedicalDocumentViewSet(viewsets.ModelViewSet, HealthcarePDFMixin):
    serializer_class = MedicalDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = MedicalDocument.objects.select_related('patient', 'issued_by', 'consultation')
        if user.role in ['admin', 'owner']:
            qs = qs
        elif user.organization:
            qs = qs.filter(organization=user.organization)
        else:
            return MedicalDocument.objects.none()

        document_type = self.request.query_params.get('document_type')
        if document_type:
            qs = qs.filter(document_type=document_type)
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        return qs.order_by('-issue_date', '-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(organization=user.organization, issued_by=user)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        """Génère le PDF du document, selon son type."""
        document = self.get_object()
        template_name = TEMPLATE_BY_TYPE.get(document.document_type)
        if not template_name:
            from rest_framework.response import Response
            return Response({'error': 'Type de document inconnu'}, status=400)

        context = {'document': document}
        return self.render_to_pdf(
            template_name=template_name,
            context=context,
            filename=f"{document.get_document_type_display()}_{document.patient.name}_{document.document_number}.pdf",
            organization=document.organization,
        )
