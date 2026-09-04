"""
API Views for Vaccination app
"""
from rest_framework import generics, status, filters, viewsets, permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import Client
from .models import VaccineCategory, VaccineType, VaccinationRecord
from .serializers import VaccineCategorySerializer, VaccineTypeSerializer, VaccinationRecordSerializer
from .invoice_services import VaccinationInvoiceService


VACCINATION_ADMIN_ROLES = ('admin', 'manager')
VACCINATION_WRITE_ROLES = ('admin', 'manager', 'doctor', 'nurse')


class IsAdminOrReadOnly(BasePermission):
    """Admin/manager peut écrire le catalogue ; tout utilisateur authentifié peut lire."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in VACCINATION_ADMIN_ROLES


class IsAdminOrTech(BasePermission):
    """Admin, manager, doctor ou nurse peuvent gérer le catalogue de vaccins."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in VACCINATION_WRITE_ROLES


# =============================================================================
# Catalogue
# =============================================================================

class VaccineCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = VaccineCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering = ['name']

    def get_queryset(self):
        return VaccineCategory.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class VaccineCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VaccineCategorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return VaccineCategory.objects.filter(organization=self.request.user.organization)


class VaccineTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = VaccineTypeSerializer
    permission_classes = [IsAdminOrTech]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'target_population', 'is_billable', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'price', 'category']
    ordering = ['category', 'name']

    def get_queryset(self):
        return VaccineType.objects.filter(
            organization=self.request.user.organization
        ).select_related('category')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class VaccineTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VaccineTypeSerializer
    permission_classes = [IsAdminOrTech]

    def get_queryset(self):
        return VaccineType.objects.filter(
            organization=self.request.user.organization
        ).select_related('category')

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') not in VACCINATION_ADMIN_ROLES:
            return Response(
                {'detail': "Seuls les administrateurs peuvent supprimer un vaccin du catalogue."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


# =============================================================================
# Vaccination records
# =============================================================================

class VaccinationRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VaccinationRecordSerializer

    def get_queryset(self):
        qs = VaccinationRecord.objects.all().select_related(
            'patient', 'vaccine_type', 'administered_by', 'pregnancy'
        )
        user = self.request.user
        if user.role not in ['admin', 'owner'] and user.organization:
            qs = qs.filter(organization=user.organization)
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        pregnancy_id = self.request.query_params.get('pregnancy')
        if pregnancy_id:
            qs = qs.filter(pregnancy_id=pregnancy_id)
        return qs

    def perform_create(self, serializer):
        """
        Quand `pregnancy` est fourni (saisie depuis le dossier de grossesse en
        Maternité), le patient est déduit automatiquement de la grossesse —
        le formulaire côté Maternité n'a jamais besoin de résoudre/envoyer un
        patient séparément, ce qui élimine toute possibilité de mismatch.
        """
        pregnancy = serializer.validated_data.get('pregnancy')
        extra = {'organization': self.request.user.organization}
        if pregnancy:
            extra['patient'] = pregnancy.patient
        if not serializer.validated_data.get('administered_by'):
            extra['administered_by'] = self.request.user
        serializer.save(**extra)

    @action(detail=True, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request, pk=None):
        record = self.get_object()
        try:
            invoice = VaccinationInvoiceService.generate_invoice(record, created_by=request.user)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if invoice is None:
            return Response({'invoice_id': None, 'message': 'Vaccin gratuit — aucune facture générée'})
        return Response({'invoice_id': str(invoice.id), 'invoice_number': invoice.invoice_number})

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') not in VACCINATION_ADMIN_ROLES:
            return Response(
                {'detail': "Seuls les administrateurs peuvent supprimer une vaccination."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class PatientVaccinationHistoryView(APIView):
    """GET /healthcare/vaccination/patient/<patient_id>/history/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, patient_id):
        try:
            patient = Client.objects.get(
                id=patient_id, organization=request.user.organization, client_type__in=['patient', 'both']
            )
        except Client.DoesNotExist:
            return Response({'error': 'Patient introuvable'}, status=status.HTTP_404_NOT_FOUND)

        records = VaccinationRecord.objects.filter(patient=patient).order_by('-administered_date').select_related(
            'vaccine_type', 'administered_by', 'pregnancy'
        )

        return Response({
            'patient_id': str(patient.id),
            'patient_name': patient.name,
            'total_records': records.count(),
            'records': VaccinationRecordSerializer(records, many=True).data,
        })
