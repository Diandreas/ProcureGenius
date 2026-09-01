from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import PregnancyRecord, PrenatalVisit, Delivery, Newborn, PostnatalVisit
from .serializers import (
    PregnancyRecordSerializer, PregnancyRecordListSerializer,
    PrenatalVisitSerializer, DeliverySerializer, NewbornSerializer, PostnatalVisitSerializer,
)
from .invoice_services import MaternityInvoiceService
from apps.hospitalizations.models import Hospitalization


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

    @action(detail=True, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request, pk=None):
        visit = self.get_object()
        try:
            invoice = MaternityInvoiceService.generate_postnatal_visit_invoice(visit, created_by=request.user)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'invoice_id': str(invoice.id), 'invoice_number': invoice.invoice_number})
