from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Hospitalization
from .serializers import HospitalizationSerializer
from apps.healthcare.pdf_helpers import HealthcarePDFMixin

class HospitalizationViewSet(viewsets.ModelViewSet, HealthcarePDFMixin):
    serializer_class = HospitalizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admin voit tout, le personnel voit par organisation
        user = self.request.user
        if user.role in ['admin', 'owner']:
            return Hospitalization.objects.all().order_by('-admission_date')
        elif user.organization:
            return Hospitalization.objects.filter(organization=user.organization).order_by('-admission_date')
        return Hospitalization.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            organization=user.organization,
            admitting_doctor=user if user.role in ['doctor', 'admin'] else None
        )

    @action(detail=True, methods=['post'])
    def discharge(self, request, pk=None):
        """Marque le patient comme sorti de l'hôpital"""
        hospitalization = self.get_object()
        
        if hospitalization.status == 'discharged':
            return Response(
                {"detail": "Le patient est déjà marqué comme sorti."},
                status=status.HTTP_400_BAD_REQUEST
            )

        hospitalization.status = 'discharged'
        hospitalization.discharge_date = timezone.now()
        hospitalization.discharging_doctor = request.user
        
        # Update extra fields if provided
        for field in ['discharge_summary', 'follow_up_instructions', 'prescribed_treatment_after', 'next_appointment_date']:
            if field in request.data:
                setattr(hospitalization, field, request.data[field])

        hospitalization.save()
        serializer = self.get_serializer(hospitalization)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='discharge-pdf')
    def generate_discharge_pdf(self, request, pk=None):
        """Génère la fiche de sortie en PDF"""
        hospitalization = self.get_object()

        # admitting_doctor/discharging_doctor peuvent être None (ex: admission par un
        # profil non-médecin, ou patient pas encore sorti) — calculé ici en Python plutôt
        # que via des chaînes {{ x.y|default:x.z }} dans le template : quand x est None,
        # Django essaie quand même de résoudre l'argument du filtre default (x.z), ce qui
        # lève VariableDoesNotExist et fait planter tout le rendu du PDF.
        admitting_doctor_name = (
            hospitalization.admitting_doctor.get_full_name()
            if hospitalization.admitting_doctor else ''
        )
        discharging_doctor_name = (
            hospitalization.discharging_doctor.get_full_name()
            if hospitalization.discharging_doctor
            else (admitting_doctor_name or 'Médecin')
        )

        context = {
            'hospitalization': hospitalization,
            'admitting_doctor_name': admitting_doctor_name or 'Médecin',
            'discharging_doctor_name': discharging_doctor_name,
        }

        return self.render_to_pdf(
            template_name='hospitalizations/pdf_templates/discharge_form.html',
            context=context,
            filename=f"Sortie_Hospit_{hospitalization.patient.name}_{hospitalization.admission_date.strftime('%Y%m%d')}.pdf",
            organization=hospitalization.organization
        )
