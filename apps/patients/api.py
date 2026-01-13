"""
API Views for Patients app
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Client
from .models import PatientVisit
# Import the new model to register it
from .models_documents import PatientDocument
from .serializers import (
    PatientSerializer,
    PatientListSerializer,
    PatientVisitSerializer,
    PatientVisitListSerializer,
    CheckInSerializer,
)


class PatientListCreateView(generics.ListCreateAPIView):
    """
    List all patients or create a new patient
    
    GET: List patients with search and filtering
    POST: Create a new patient
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'patient_number', 'email']
    ordering_fields = ['name', 'created_at', 'patient_number']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Client.objects.filter(
            organization=user.organization,
            client_type__in=['patient', 'both']
        )
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by gender
        gender = self.request.query_params.get('gender')
        if gender:
            queryset = queryset.filter(gender=gender)
        
        # Filter by registration source
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(registration_source=source)
        
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PatientListSerializer
        return PatientSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            client_type='patient'
        )


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a patient
    """
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Client.objects.filter(
            organization=self.request.user.organization,
            client_type__in=['patient', 'both']
        )


class PatientSearchView(APIView):
    """
    Quick search for patients by name, phone, or patient number
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response({'results': []})
        
        patients = Client.objects.filter(
            organization=request.user.organization,
            client_type__in=['patient', 'both']
        ).filter(
            Q(name__icontains=query) |
            Q(phone__icontains=query) |
            Q(patient_number__icontains=query) |
            Q(email__icontains=query)
        )[:10]
        
        serializer = PatientListSerializer(patients, many=True)
        return Response({'results': serializer.data})


class PatientVisitListCreateView(generics.ListCreateAPIView):
    """
    List all visits or create a new visit
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'visit_type', 'priority', 'patient']
    ordering_fields = ['arrived_at', 'created_at']
    ordering = ['-arrived_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = PatientVisit.objects.filter(
            organization=user.organization
        ).select_related('patient', 'assigned_doctor', 'registered_by')
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(arrived_at__date=date)
        
        # Today's visits by default
        today_only = self.request.query_params.get('today', 'false')
        if today_only.lower() == 'true':
            queryset = queryset.filter(arrived_at__date=timezone.now().date())
        
        # Active visits only
        active_only = self.request.query_params.get('active', 'false')
        if active_only.lower() == 'true':
            queryset = queryset.exclude(status__in=['completed', 'cancelled', 'no_show'])
        
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PatientVisitListSerializer
        return PatientVisitSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            registered_by=self.request.user
        )


class PatientVisitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a visit
    """
    serializer_class = PatientVisitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PatientVisit.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'assigned_doctor', 'registered_by')


class CheckInView(APIView):
    """
    Quick check-in for a patient
    Creates a new visit and optionally creates a consultation invoice
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get patient
        try:
            patient = Client.objects.get(
                id=data['patient_id'],
                organization=request.user.organization,
                client_type__in=['patient', 'both']
            )
        except Client.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get assigned doctor if provided
        assigned_doctor = None
        if data.get('assigned_doctor_id'):
            from apps.accounts.models import CustomUser
            try:
                assigned_doctor = CustomUser.objects.get(
                    id=data['assigned_doctor_id'],
                    organization=request.user.organization,
                    role='doctor'
                )
            except CustomUser.DoesNotExist:
                pass
        
        # Create visit
        visit = PatientVisit.objects.create(
            organization=request.user.organization,
            patient=patient,
            visit_type=data.get('visit_type', 'consultation'),
            priority=data.get('priority', 'routine'),
            chief_complaint=data.get('chief_complaint', ''),
            notes=data.get('notes', ''),
            assigned_doctor=assigned_doctor,
            registered_by=request.user,
            status='registered'
        )
        
        # If consultation, move to waiting_consultation
        if visit.visit_type == 'consultation':
            visit.status = 'waiting_consultation'
            visit.save()
        
        return Response(
            PatientVisitSerializer(visit).data,
            status=status.HTTP_201_CREATED
        )


class VisitStatusUpdateView(APIView):
    """
    Update visit status with specific transitions
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            visit = PatientVisit.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except PatientVisit.DoesNotExist:
            return Response(
                {'error': 'Visit not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        
        if action == 'start_consultation':
            visit.start_consultation(doctor=request.user if request.user.role == 'doctor' else None)
        elif action == 'end_consultation':
            visit.end_consultation()
        elif action == 'send_to_lab':
            visit.send_to_lab()
        elif action == 'send_to_pharmacy':
            visit.send_to_pharmacy()
        elif action == 'complete':
            visit.complete_visit()
        elif action == 'cancel':
            reason = request.data.get('reason', '')
            visit.cancel_visit(reason=reason)
        else:
            return Response(
                {'error': f'Unknown action: {action}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(PatientVisitSerializer(visit).data)


class TodayVisitsView(APIView):
    """
    Get today's visits grouped by status
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        visits = PatientVisit.objects.filter(
            organization=request.user.organization,
            arrived_at__date=today
        ).select_related('patient', 'assigned_doctor')
        
        # Group by status
        result = {
            'total': visits.count(),
            'waiting': visits.filter(status__in=['registered', 'waiting_consultation']).count(),
            'in_consultation': visits.filter(status='in_consultation').count(),
            'at_lab': visits.filter(status__in=['waiting_lab', 'in_lab', 'waiting_results']).count(),
            'at_pharmacy': visits.filter(status__in=['waiting_pharmacy', 'at_pharmacy']).count(),
            'completed': visits.filter(status='completed').count(),
            'cancelled': visits.filter(status__in=['cancelled', 'no_show']).count(),
        }
        
        # Get active visits list
        active_visits = visits.exclude(status__in=['completed', 'cancelled', 'no_show'])
        result['active_visits'] = PatientVisitListSerializer(active_visits, many=True).data
        
        return Response(result)


class PatientHistoryView(APIView):
    """
    Get complete visit history for a patient
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        try:
            patient = Client.objects.get(
                id=patient_id,
                organization=request.user.organization,
                client_type__in=['patient', 'both']
            )
        except Client.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all visits
        visits = PatientVisit.objects.filter(
            patient=patient
        ).order_by('-arrived_at').select_related('assigned_doctor')
        
        # Statistics
        stats = {
            'total_visits': visits.count(),
            'completed_visits': visits.filter(status='completed').count(),
            'cancelled_visits': visits.filter(status='cancelled').count(),
        }
        
        return Response({
            'patient': PatientSerializer(patient).data,
            'statistics': stats,
            'visits': PatientVisitSerializer(visits, many=True).data,
        })


from .models_documents import PatientDocument
from .serializers_documents import PatientDocumentSerializer
from rest_framework.parsers import MultiPartParser, FormParser

class PatientDocumentListCreateView(generics.ListCreateAPIView):
    """
    List or create documents for a patient
    """
    serializer_class = PatientDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        patient_id = self.kwargs.get('patient_id')
        return PatientDocument.objects.filter(
            organization=self.request.user.organization,
            patient_id=patient_id
        )
    
    def perform_create(self, serializer):
        patient_id = self.kwargs.get('patient_id')
        patient = Client.objects.get(id=patient_id, organization=self.request.user.organization)
        serializer.save(
            organization=self.request.user.organization,
            patient=patient
        )

class PatientDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Manage single document
    """
    serializer_class = PatientDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PatientDocument.objects.filter(
            organization=self.request.user.organization
        )
