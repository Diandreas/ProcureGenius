from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import PregnancyRecord, PrenatalVisit, Delivery, Newborn, PostnatalVisit
from .serializers import (
    PregnancyRecordSerializer, PregnancyRecordListSerializer,
    PrenatalVisitSerializer, DeliverySerializer, NewbornSerializer, PostnatalVisitSerializer,
)
from .invoice_services import MaternityInvoiceService
from apps.hospitalizations.models import Hospitalization
from apps.consultations.models import Consultation


class OrgScopedViewSet(viewsets.ModelViewSet):
    """Base commune : scope par organisation, admin/owner voient tout."""
    permission_classes = [permissions.IsAuthenticated]

    def get_organization_field(self):
        return 'organization'

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset
        if user.role in ['admin', 'owner']:
            return qs
        if user.organization:
            filter_kwargs = {self.get_organization_field(): user.organization}
            return qs.filter(**filter_kwargs)
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class PregnancyRecordViewSet(OrgScopedViewSet):
    queryset = PregnancyRecord.objects.all().select_related('patient', 'referring_doctor').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return PregnancyRecordListSerializer
        return PregnancyRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(patient__name__icontains=search)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return qs


class PrenatalVisitViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrenatalVisitSerializer

    def get_queryset(self):
        qs = PrenatalVisit.objects.all().select_related('pregnancy', 'doctor')
        user = self.request.user
        if user.role not in ['admin', 'owner'] and user.organization:
            qs = qs.filter(pregnancy__organization=user.organization)
        pregnancy_id = self.request.query_params.get('pregnancy')
        if pregnancy_id:
            qs = qs.filter(pregnancy_id=pregnancy_id)
        return qs

    def perform_create(self, serializer):
        """
        Crée automatiquement une Consultation liée — même principe que
        DeliveryViewSet.perform_create pour Hospitalization : la CPN doit
        apparaître dans l'historique de consultations centralisé du patient,
        pas rester isolée dans un dossier maternité à part.
        """
        pregnancy = serializer.validated_data['pregnancy']
        doctor = serializer.validated_data.get('doctor')
        consultation = Consultation.objects.create(
            organization=pregnancy.organization,
            patient=pregnancy.patient,
            doctor=doctor if doctor else (self.request.user if getattr(self.request.user, 'role', None) == 'doctor' else None),
            created_by=self.request.user,
            chief_complaint="Consultation prénatale (CPN)",
            status='completed',
            consultation_date=serializer.validated_data.get('visit_date') or timezone.now(),
            weight=serializer.validated_data.get('weight'),
            blood_pressure_systolic=serializer.validated_data.get('blood_pressure_systolic'),
            blood_pressure_diastolic=serializer.validated_data.get('blood_pressure_diastolic'),
        )
        serializer.save(consultation=consultation)

    @action(detail=True, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request, pk=None):
        visit = self.get_object()
        try:
            invoice = MaternityInvoiceService.generate_prenatal_visit_invoice(visit, created_by=request.user)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'invoice_id': str(invoice.id), 'invoice_number': invoice.invoice_number})


class DeliveryViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DeliverySerializer

    def get_queryset(self):
        qs = Delivery.objects.all().select_related('pregnancy', 'hospitalization').prefetch_related('newborns')
        user = self.request.user
        if user.role not in ['admin', 'owner'] and user.organization:
            qs = qs.filter(pregnancy__organization=user.organization)
        pregnancy_id = self.request.query_params.get('pregnancy')
        if pregnancy_id:
            qs = qs.filter(pregnancy_id=pregnancy_id)
        return qs

    def perform_create(self, serializer):
        """
        create_linked_stay=true (défaut) : crée automatiquement l'Hospitalization
        liée pour le séjour post-accouchement, sans dupliquer lits/sortie/PDF —
        le module Hospitalisation existant prend le relais ensuite tel quel.
        """
        create_linked_stay = self.request.data.get('create_linked_stay', True)
        delivery = serializer.save()

        if create_linked_stay and not delivery.hospitalization_id:
            pregnancy = delivery.pregnancy
            hosp = Hospitalization.objects.create(
                organization=pregnancy.organization,
                patient=pregnancy.patient,
                admitting_doctor=self.request.user if getattr(self.request.user, 'role', None) in ('doctor', 'admin') else None,
                admission_date=delivery.delivery_date,
                admission_reason="Accouchement",
                bed_number=self.request.data.get('bed_number', ''),
                status='admitted',
            )
            delivery.hospitalization = hosp
            delivery.save(update_fields=['hospitalization'])

        # Mettre à jour le statut de la grossesse
        pregnancy = delivery.pregnancy
        if pregnancy.status != 'delivered':
            pregnancy.status = 'delivered'
            pregnancy.save(update_fields=['status'])

    @action(detail=True, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request, pk=None):
        delivery = self.get_object()
        try:
            invoice = MaternityInvoiceService.generate_delivery_invoice(delivery, created_by=request.user)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'invoice_id': str(invoice.id), 'invoice_number': invoice.invoice_number})


class NewbornViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NewbornSerializer

    def get_queryset(self):
        qs = Newborn.objects.all().select_related('delivery')
        user = self.request.user
        if user.role not in ['admin', 'owner'] and user.organization:
            qs = qs.filter(delivery__pregnancy__organization=user.organization)
        delivery_id = self.request.query_params.get('delivery')
        if delivery_id:
            qs = qs.filter(delivery_id=delivery_id)
        return qs


class PostnatalVisitViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PostnatalVisitSerializer

    def get_queryset(self):
        qs = PostnatalVisit.objects.all().select_related('delivery', 'newborn', 'doctor')
        user = self.request.user
        if user.role not in ['admin', 'owner'] and user.organization:
            qs = qs.filter(delivery__pregnancy__organization=user.organization)
        delivery_id = self.request.query_params.get('delivery')
        if delivery_id:
            qs = qs.filter(delivery_id=delivery_id)
        return qs

    def perform_create(self, serializer):
        """Crée automatiquement une Consultation liée (mère) — voir PrenatalVisitViewSet."""
        delivery = serializer.validated_data['delivery']
        pregnancy = delivery.pregnancy
        doctor = serializer.validated_data.get('doctor')
        consultation = Consultation.objects.create(
            organization=pregnancy.organization,
            patient=pregnancy.patient,
            doctor=doctor if doctor else (self.request.user if getattr(self.request.user, 'role', None) == 'doctor' else None),
            created_by=self.request.user,
            chief_complaint="Suivi post-natal",
            status='completed',
            consultation_date=serializer.validated_data.get('visit_date') or timezone.now(),
            weight=serializer.validated_data.get('mother_weight'),
            blood_pressure_systolic=serializer.validated_data.get('mother_blood_pressure_systolic'),
            blood_pressure_diastolic=serializer.validated_data.get('mother_blood_pressure_diastolic'),
        )
        serializer.save(consultation=consultation)

    @action(detail=True, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request, pk=None):
        visit = self.get_object()
        try:
            invoice = MaternityInvoiceService.generate_postnatal_visit_invoice(visit, created_by=request.user)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'invoice_id': str(invoice.id), 'invoice_number': invoice.invoice_number})


class PatientMaternityInfoView(APIView):
    """
    GET /healthcare/maternity/patient/<patient_id>/info/
    Résumé maternité pour la fiche patient : ses propres dossiers de grossesse
    (si c'est une mère), et — si ce patient est lui-même enregistré comme
    nouveau-né d'un accouchement (Newborn.patient_record) — un lien vers la mère.
    Permet d'associer une patiente à son enfant (et réciproquement) depuis
    n'importe quel dossier patient, pas seulement depuis le module Maternité.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, patient_id):
        user = request.user
        pregnancies_qs = PregnancyRecord.objects.filter(patient_id=patient_id)
        if user.role not in ('admin', 'owner') and user.organization:
            pregnancies_qs = pregnancies_qs.filter(organization=user.organization)

        pregnancies_data = PregnancyRecordListSerializer(pregnancies_qs.order_by('-created_at'), many=True).data

        as_child = None
        newborn = Newborn.objects.filter(patient_record_id=patient_id).select_related(
            'delivery__pregnancy__patient'
        ).first()
        if newborn:
            mother = newborn.delivery.pregnancy.patient
            as_child = {
                'newborn_id': str(newborn.id),
                'mother_patient_id': str(mother.id),
                'mother_name': mother.name,
                'pregnancy_id': str(newborn.delivery.pregnancy_id),
            }

        return Response({'pregnancies': pregnancies_data, 'as_child_of': as_child})
