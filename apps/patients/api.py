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
from .models_care import PatientCareService
from .serializers import (
    PatientSerializer,
    PatientListSerializer,
    PatientVisitSerializer,
    PatientVisitListSerializer,
    CheckInSerializer,
    PatientCareServiceSerializer,
    LabOrderHistorySerializer,
    PharmacyDispensingHistorySerializer,
    ConsultationHistorySerializer,
)

# Import related models for history
try:
    from apps.laboratory.models import LabOrder
except ImportError:
    LabOrder = None

try:
    from apps.pharmacy.models import PharmacyDispensing
except ImportError:
    PharmacyDispensing = None

try:
    from apps.consultations.models import Consultation
except ImportError:
    Consultation = None


class PatientCareHistoryView(generics.ListAPIView):
    """
    Get complete care service history for a patient
    """
    serializer_class = PatientCareServiceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        patient_id = self.kwargs.get('patient_id')
        return PatientCareService.objects.filter(
            patient_id=patient_id,
            patient__organization=self.request.user.organization
        ).order_by('-provided_at').select_related('provided_by', 'service_product')


class PatientListCreateView(generics.ListCreateAPIView):
    """
    List all patients or create a new patient
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

        # Auto-create consultation for follow-up visits
        if visit.visit_type in ['follow_up', 'follow_up_exam']:
            if Consultation:
                try:
                    consultation = Consultation.objects.create(
                        organization=request.user.organization,
                        patient=patient,
                        visit=visit,
                        doctor=assigned_doctor,
                        created_by=request.user,
                        status='waiting',  # Waiting for nurse to take vitals
                        consultation_date=timezone.now(),
                        # Copy chief complaint and notes from visit
                    )

                    # Add note indicating this is an auto-created follow-up consultation
                    visit.notes = f"{visit.notes}\n[Consultation de suivi créée automatiquement - {consultation.consultation_number}]".strip()
                    visit.status = 'waiting_consultation'
                    visit.save()
                except Exception as e:
                    # Log error but don't fail the visit creation
                    print(f"Error creating auto consultation for follow-up: {e}")

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


class PatientCompleteHistoryView(APIView):
    """
    Get complete unified history for a patient:
    - Consultations
    - Laboratory orders
    - Pharmacy dispensings
    - Care services
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        # Verify patient belongs to organization
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

        history = {}

        # Consultations history
        if Consultation:
            consultations = Consultation.objects.filter(
                patient=patient
            ).select_related('doctor').prefetch_related(
                'prescriptions__items', 'lab_orders__items__lab_test'
            ).order_by('-consultation_date')[:10]
            history['consultations'] = ConsultationHistorySerializer(consultations, many=True).data
        else:
            history['consultations'] = []

        # Laboratory orders history
        if LabOrder:
            lab_orders = LabOrder.objects.filter(
                patient=patient
            ).prefetch_related('items__lab_test').order_by('-order_date')[:10]
            history['lab_orders'] = LabOrderHistorySerializer(lab_orders, many=True).data
        else:
            history['lab_orders'] = []

        # Pharmacy dispensings history
        if PharmacyDispensing:
            dispensings = PharmacyDispensing.objects.filter(
                patient=patient
            ).prefetch_related('items__medication').order_by('-dispensed_at')[:10]
            history['pharmacy_dispensings'] = PharmacyDispensingHistorySerializer(dispensings, many=True).data
        else:
            history['pharmacy_dispensings'] = []

        # Care services history (already exists)
        care_services = PatientCareService.objects.filter(
            patient=patient
        ).select_related('provided_by', 'service_product').order_by('-provided_at')[:10]
        history['care_services'] = PatientCareServiceSerializer(care_services, many=True).data

        return Response(history, status=status.HTTP_200_OK)


class PatientMedicalSummaryView(APIView):
    """
    Get a medical summary for a patient
    GET /healthcare/patients/<uuid>/medical-summary/
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
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        summary = {}

        # Medical alerts
        summary['alerts'] = {
            'blood_type': patient.blood_type or '',
            'allergies': patient.allergies or '',
            'chronic_conditions': patient.chronic_conditions or '',
        }

        # Latest vitals: check both visits and consultations, pick the most recent
        from django.db.models import Q

        latest_visit = PatientVisit.objects.filter(
            patient=patient
        ).filter(
            Q(vitals_systolic__isnull=False) |
            Q(vitals_temperature__isnull=False) |
            Q(vitals_weight__isnull=False)
        ).order_by('-arrived_at').first()

        latest_consultation = None
        if Consultation:
            latest_consultation = Consultation.objects.filter(
                patient=patient
            ).filter(
                Q(blood_pressure_systolic__isnull=False) |
                Q(temperature__isnull=False) |
                Q(weight__isnull=False)
            ).order_by('-consultation_date').first()

        # Compare dates to pick the most recent source
        vitals_from_visit = None
        vitals_from_consultation = None

        if latest_visit:
            vitals_from_visit = {
                'date': latest_visit.arrived_at,
                'systolic': latest_visit.vitals_systolic,
                'diastolic': latest_visit.vitals_diastolic,
                'temperature': str(latest_visit.vitals_temperature) if latest_visit.vitals_temperature else None,
                'weight': str(latest_visit.vitals_weight) if latest_visit.vitals_weight else None,
                'height': str(latest_visit.vitals_height) if latest_visit.vitals_height else None,
                'spo2': latest_visit.vitals_spo2,
                'heart_rate': latest_visit.vitals_heart_rate if hasattr(latest_visit, 'vitals_heart_rate') else None,
                'respiratory_rate': latest_visit.vitals_respiratory_rate if hasattr(latest_visit, 'vitals_respiratory_rate') else None,
                'blood_glucose': str(latest_visit.vitals_blood_glucose) if latest_visit.vitals_blood_glucose else None,
            }

        if latest_consultation:
            vitals_from_consultation = {
                'date': latest_consultation.consultation_date,
                'systolic': latest_consultation.blood_pressure_systolic,
                'diastolic': latest_consultation.blood_pressure_diastolic,
                'temperature': str(latest_consultation.temperature) if latest_consultation.temperature else None,
                'weight': str(latest_consultation.weight) if latest_consultation.weight else None,
                'height': str(latest_consultation.height) if latest_consultation.height else None,
                'spo2': latest_consultation.oxygen_saturation,
                'heart_rate': latest_consultation.heart_rate,
                'respiratory_rate': latest_consultation.respiratory_rate,
                'blood_glucose': str(latest_consultation.blood_glucose) if latest_consultation.blood_glucose else None,
            }

        # Pick the most recent one
        if vitals_from_visit and vitals_from_consultation:
            if vitals_from_consultation['date'] >= vitals_from_visit['date']:
                summary['latest_vitals'] = vitals_from_consultation
            else:
                summary['latest_vitals'] = vitals_from_visit
        else:
            summary['latest_vitals'] = vitals_from_consultation or vitals_from_visit

        # Statistics
        from django.db.models import Count
        total_consultations = 0
        if Consultation:
            total_consultations = Consultation.objects.filter(patient=patient).count()

        total_lab = 0
        if LabOrder:
            total_lab = LabOrder.objects.filter(patient=patient).count()

        last_visit = PatientVisit.objects.filter(patient=patient).order_by('-arrived_at').first()
        summary['statistics'] = {
            'total_consultations': total_consultations,
            'total_lab_orders': total_lab,
            'total_visits': PatientVisit.objects.filter(patient=patient).count(),
            'last_visit_date': last_visit.arrived_at if last_visit else None,
        }

        # Recent abnormal lab results
        summary['abnormal_results'] = []
        if LabOrder:
            from apps.laboratory.models import LabOrderItem
            abnormal_items = LabOrderItem.objects.filter(
                lab_order__patient=patient,
                is_abnormal=True,
                result_value__isnull=False,
            ).select_related('lab_test', 'lab_order').order_by('-result_entered_at')[:5]

            for item in abnormal_items:
                summary['abnormal_results'].append({
                    'test_name': item.lab_test.name if item.lab_test else '',
                    'test_code': item.lab_test.test_code if item.lab_test else '',
                    'result_value': item.result_value,
                    'reference_range': item.reference_range or '',
                    'is_critical': item.is_critical,
                    'date': item.result_entered_at or item.lab_order.order_date,
                })

        # Active prescriptions (from recent completed consultations)
        summary['active_prescriptions'] = []
        if Consultation:
            try:
                from apps.consultations.models import Prescription, PrescriptionItem
                recent_prescriptions = Prescription.objects.filter(
                    consultation__patient=patient,
                ).select_related('consultation').prefetch_related('items').order_by('-created_at')[:3]

                for rx in recent_prescriptions:
                    items = []
                    for item in rx.items.all():
                        items.append({
                            'medication_name': item.medication_name,
                            'dosage': item.dosage,
                            'frequency': item.frequency,
                            'duration': item.duration,
                        })
                    summary['active_prescriptions'].append({
                        'date': rx.created_at,
                        'consultation_id': str(rx.consultation.id),
                        'items': items,
                    })
            except (ImportError, Exception):
                pass

        # Last consultation summary
        summary['last_consultation'] = None
        if Consultation:
            last_consult = Consultation.objects.filter(
                patient=patient
            ).select_related('doctor').order_by('-consultation_date').first()
            if last_consult:
                summary['last_consultation'] = {
                    'id': str(last_consult.id),
                    'date': last_consult.consultation_date,
                    'doctor_name': last_consult.doctor.get_full_name() if last_consult.doctor else None,
                    'chief_complaint': last_consult.chief_complaint or '',
                    'diagnosis': last_consult.diagnosis or '',
                    'status': last_consult.status,
                    'status_display': last_consult.get_status_display(),
                }

        return Response(summary)


class PatientTimelineView(APIView):
    """
    Get unified timeline for a patient
    GET /healthcare/patients/<uuid>/timeline/
    Params: ?type=all|consultation|laboratory|pharmacy|care&start_date=&end_date=&page=
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
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        event_type = request.query_params.get('type', 'all')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        page = int(request.query_params.get('page', 1))
        page_size = 20

        events = []

        # Consultations
        if event_type in ('all', 'consultation') and Consultation:
            consultations = Consultation.objects.filter(patient=patient).select_related('doctor')
            if start_date:
                consultations = consultations.filter(consultation_date__date__gte=start_date)
            if end_date:
                consultations = consultations.filter(consultation_date__date__lte=end_date)
            for c in consultations:
                events.append({
                    'id': str(c.id),
                    'type': 'consultation',
                    'date': c.consultation_date.isoformat(),
                    'title': f'Consultation #{c.consultation_number}',
                    'summary': c.chief_complaint or '',
                    'detail': c.diagnosis or '',
                    'status': c.status,
                    'provider': c.doctor.get_full_name() if c.doctor else None,
                    'link': f'/healthcare/consultations/{c.id}',
                })

        # Lab Orders
        if event_type in ('all', 'laboratory') and LabOrder:
            lab_orders = LabOrder.objects.filter(patient=patient).prefetch_related('items__lab_test')
            if start_date:
                lab_orders = lab_orders.filter(order_date__date__gte=start_date)
            if end_date:
                lab_orders = lab_orders.filter(order_date__date__lte=end_date)
            for lo in lab_orders:
                tests = [item.lab_test.name for item in lo.items.all() if item.lab_test]
                events.append({
                    'id': str(lo.id),
                    'type': 'laboratory',
                    'date': lo.order_date.isoformat(),
                    'title': f'Examens Labo #{lo.order_number}',
                    'summary': f'{lo.items.count()} test(s): {", ".join(tests[:3])}{"..." if len(tests) > 3 else ""}',
                    'detail': lo.clinical_notes or '',
                    'status': lo.status,
                    'provider': lo.ordered_by.get_full_name() if lo.ordered_by else None,
                    'link': f'/healthcare/laboratory/{lo.id}',
                })

        # Pharmacy Dispensings
        if event_type in ('all', 'pharmacy') and PharmacyDispensing:
            dispensings = PharmacyDispensing.objects.filter(patient=patient).prefetch_related('items__medication')
            if start_date:
                dispensings = dispensings.filter(dispensed_at__date__gte=start_date)
            if end_date:
                dispensings = dispensings.filter(dispensed_at__date__lte=end_date)
            for d in dispensings:
                meds = [item.medication.name for item in d.items.all() if item.medication]
                events.append({
                    'id': str(d.id),
                    'type': 'pharmacy',
                    'date': d.dispensed_at.isoformat(),
                    'title': f'Dispensation #{d.dispensing_number}',
                    'summary': f'{d.items.count()} médicament(s): {", ".join(meds[:3])}{"..." if len(meds) > 3 else ""}',
                    'detail': '',
                    'status': d.status,
                    'provider': d.dispensed_by.get_full_name() if d.dispensed_by else None,
                    'link': f'/healthcare/pharmacy/dispensing/{d.id}',
                })

        # Care Services
        if event_type in ('all', 'care'):
            care_services = PatientCareService.objects.filter(patient=patient).select_related('provided_by')
            if start_date:
                care_services = care_services.filter(provided_at__date__gte=start_date)
            if end_date:
                care_services = care_services.filter(provided_at__date__lte=end_date)
            for cs in care_services:
                events.append({
                    'id': str(cs.id),
                    'type': 'care',
                    'date': cs.provided_at.isoformat(),
                    'title': cs.service_name,
                    'summary': cs.get_service_type_display(),
                    'detail': cs.notes or '',
                    'status': 'completed',
                    'provider': cs.provided_by.get_full_name() if cs.provided_by else None,
                    'link': None,
                })

        # Sort by date descending
        events.sort(key=lambda x: x['date'], reverse=True)

        # Paginate
        total = len(events)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = events[start:end]

        return Response({
            'events': paginated,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_next': end < total,
        })


class CreateCareServiceView(APIView):
    """
    Create a care service for a patient
    POST /healthcare/patients/<uuid>/care-services/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id):
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

        service_type = request.data.get('service_type')
        service_name = request.data.get('service_name')
        notes = request.data.get('notes', '')
        quantity = request.data.get('quantity', 1)
        visit_id = request.data.get('visit_id')

        if not service_type or not service_name:
            return Response(
                {'error': 'service_type and service_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Optionally link to a visit
        visit = None
        if visit_id:
            try:
                visit = PatientVisit.objects.get(
                    id=visit_id,
                    organization=request.user.organization
                )
            except PatientVisit.DoesNotExist:
                pass

        care_service = PatientCareService.objects.create(
            patient=patient,
            service_type=service_type,
            service_name=service_name,
            notes=notes,
            quantity=quantity,
            provided_by=request.user,
            visit=visit,
        )

        return Response(
            PatientCareServiceSerializer(care_service).data,
            status=status.HTTP_201_CREATED
        )


class PatientQuickInvoiceView(APIView):
    """
    Create a quick invoice for billable services when creating/updating a patient
    Allows invoicing care services directly from patient form
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id):
        # Verify patient belongs to organization
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

        service_ids = request.data.get('service_ids', [])
        payment_method = request.data.get('payment_method', 'cash')

        if not service_ids:
            return Response(
                {'error': 'No services provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Import Invoice and Product models
        from apps.invoicing.models import Invoice, InvoiceItem, Product
        from decimal import Decimal

        # Get services/products
        try:
            services = Product.objects.filter(
                id__in=service_ids,
                organization=request.user.organization
            )
        except Exception as e:
            return Response(
                {'error': f'Error fetching services: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not services.exists():
            return Response(
                {'error': 'No valid services found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create invoice with retry logic for race conditions
        try:
            from django.db import transaction, IntegrityError
            import logging
            import time
            logger = logging.getLogger(__name__)

            # Calculate subtotal first
            subtotal = Decimal('0')
            for service in services:
                service_price = service.price if service.price else Decimal('0')
                subtotal += service_price

            # Retry logic to handle race conditions on invoice_number
            max_retries = 5
            invoice = None
            last_error = None

            for attempt in range(max_retries):
                try:
                    # Use atomic transaction to ensure all operations succeed or fail together
                    with transaction.atomic():
                        # Create invoice with calculated totals
                        invoice = Invoice.objects.create(
                            organization=request.user.organization,
                            client=patient,
                            invoice_type='healthcare_consultation',
                            title=f"Services - {patient.name}",
                            payment_method=payment_method,
                            created_by=request.user,
                            status='paid',
                            subtotal=subtotal,
                            total_amount=subtotal,
                            tax_amount=Decimal('0')
                        )

                        # Create invoice items
                        for service in services:
                            service_price = service.price if service.price else Decimal('0')
                            InvoiceItem.objects.create(
                                invoice=invoice,
                                product=service,
                                description=service.description or '',
                                quantity=1,
                                unit_price=service_price,
                                total_price=service_price,
                                tax_rate=Decimal('0')
                            )

                    logger.info(f"Invoice {invoice.invoice_number} created successfully for patient {patient.name}")
                    break  # Success, exit retry loop

                except IntegrityError as e:
                    last_error = e
                    if 'invoice_number' in str(e) and attempt < max_retries - 1:
                        # Race condition on invoice number, retry after a short delay
                        wait_time = 0.1 * (attempt + 1)  # Exponential backoff
                        logger.warning(f"Invoice number collision (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        # Max retries reached or different error
                        raise

            if invoice is None:
                # Should not happen, but just in case
                raise last_error if last_error else Exception("Failed to create invoice")

            return Response({
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'total_amount': float(invoice.total_amount),
                'services_count': services.count(),
                'message': 'Facture créée avec succès'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating invoice for patient {patient.id}: {str(e)}")
            logger.error(traceback.format_exc())

            return Response(
                {'error': f'Error creating invoice: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
