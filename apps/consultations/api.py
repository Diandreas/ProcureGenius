"""
API Views for Consultations app
"""
from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
from .services import ConsultationPDFGenerator

from apps.accounts.models import Client
from apps.patients.models import PatientVisit
from apps.invoicing.models import Product
from apps.laboratory.models import LabTest, LabOrder, LabOrderItem
from .models import Consultation, Prescription, PrescriptionItem
from .serializers import (
    ConsultationSerializer,
    ConsultationListSerializer,
    VitalSignsSerializer,
    PrescriptionSerializer,
    PrescriptionListSerializer,
    PrescriptionCreateSerializer,
)


# =============================================================================
# Consultation Views
# =============================================================================

class ConsultationListCreateView(generics.ListCreateAPIView):
    """List all consultations or create a new one"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'patient', 'follow_up_required']
    search_fields = ['consultation_number', 'patient__name', 'diagnosis', 'chief_complaint']
    ordering_fields = ['consultation_date', 'created_at']
    ordering = ['-consultation_date']

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Creating consultation with data: {request.data}")
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error creating consultation: {str(e)}", exc_info=True)
            raise
    
    def get_queryset(self):
        queryset = Consultation.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'doctor')
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(consultation_date__date=date)
        
        # Today only
        today_only = self.request.query_params.get('today', 'false')
        if today_only.lower() == 'true':
            queryset = queryset.filter(consultation_date__date=timezone.now().date())
        
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ConsultationListSerializer
        return ConsultationSerializer
    
    def perform_create(self, serializer):
        # Auto-assign doctor if current user is a doctor
        doctor = None
        if self.request.user.role == 'doctor':
            doctor = self.request.user
        
        serializer.save(
            organization=self.request.user.organization,
            doctor=doctor,
            created_by=self.request.user
        )


class ConsultationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a consultation"""
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Consultation.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'doctor').prefetch_related('prescriptions')


class UpdateVitalSignsView(APIView):
    """Update only vital signs for a consultation"""
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk):
        try:
            consultation = Consultation.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = VitalSignsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update only provided vital signs
        for field, value in serializer.validated_data.items():
            setattr(consultation, field, value)
        
        consultation.save()
        
        return Response(ConsultationSerializer(consultation).data)


class StartConsultationView(APIView):
    """
    Start a consultation from a patient visit
    Creates the consultation record and updates visit status
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, visit_id):
        try:
            visit = PatientVisit.objects.get(
                id=visit_id,
                organization=request.user.organization
            )
        except PatientVisit.DoesNotExist:
            return Response(
                {'error': 'Visit not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if consultation already exists for this visit
        existing = Consultation.objects.filter(visit=visit).first()
        if existing:
            return Response(
                {'error': 'Consultation already exists for this visit', 
                 'consultation_id': str(existing.id)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create consultation
        doctor = request.user if request.user.role == 'doctor' else None
        
        consultation = Consultation.objects.create(
            organization=request.user.organization,
            patient=visit.patient,
            visit=visit,
            doctor=doctor,
            chief_complaint=visit.chief_complaint,
        )
        
        # Update visit status
        visit.start_consultation(doctor=doctor)
        
        return Response(
            ConsultationSerializer(consultation).data,
            status=status.HTTP_201_CREATED
        )


class EndConsultationView(APIView):
    """End consultation and update visit status"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            consultation = Consultation.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # ✅ VALIDATION: Si facture existe, elle doit être payée avant de terminer
        if consultation.consultation_invoice:
            if consultation.consultation_invoice.status != 'paid':
                return Response(
                    {
                        'error': 'La facture doit être payée avant de terminer la consultation',
                        'invoice_number': consultation.consultation_invoice.invoice_number,
                        'invoice_status': consultation.consultation_invoice.status,
                        'invoice_id': str(consultation.consultation_invoice.id)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update visit if linked
        if consultation.visit:
            consultation.visit.end_consultation()
            
            # Determine next step based on prescriptions and lab orders
            has_prescriptions = consultation.prescriptions.filter(status='pending').exists()
            has_lab_orders = consultation.visit.lab_orders.exclude(
                status__in=['results_delivered', 'cancelled']
            ).exists()
            
            if has_lab_orders:
                consultation.visit.send_to_lab()
            elif has_prescriptions:
                consultation.visit.send_to_pharmacy()
            else:
                consultation.visit.complete_visit()
        
        # Auto-create invoice for consultation
        if not consultation.consultation_invoice:
            try:
                from apps.invoicing.models import Invoice, InvoiceItem
                from datetime import timedelta
                
                # Default consultation fee (can be configured per organization)
                consultation_fee = 5000  # XAF - default fee
                
                # Create invoice
                invoice = Invoice.objects.create(
                    created_by=request.user,
                    client=consultation.patient,
                    title=f"Consultation médicale - {consultation.consultation_number}",
                    description=f"Consultation du {consultation.consultation_date.strftime('%d/%m/%Y')}",
                    due_date=timezone.now().date() + timedelta(days=30),
                    subtotal=consultation_fee,
                    total_amount=consultation_fee,
                    status='sent',
                    currency='XAF',
                )
                
                # Add consultation as invoice item
                InvoiceItem.objects.create(
                    invoice=invoice,
                    service_code='CONSULT',
                    description=f"Consultation médicale - Dr. {consultation.doctor.get_full_name() if consultation.doctor else 'N/A'}",
                    quantity=1,
                    unit_price=consultation_fee,
                    total_price=consultation_fee,
                )
                
                # Link invoice to consultation
                consultation.consultation_invoice = invoice
                consultation.save(update_fields=['consultation_invoice'])
                
            except Exception as e:
                # Don't fail consultation end if invoice creation fails
                print(f"Error creating consultation invoice: {e}")
        
        return Response(ConsultationSerializer(consultation).data)


class GenerateConsultationInvoiceView(APIView):
    """Generate invoice for consultation (manual trigger)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from apps.healthcare.invoice_services import ConsultationInvoiceService

        try:
            consultation = Consultation.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            invoice = ConsultationInvoiceService.generate_invoice(consultation)
            return Response({
                'message': 'Facture créée avec succès',
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'total_amount': float(invoice.total_amount)
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': f"Erreur lors de la création de facture: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Workflow & Queue Management Views
# =============================================================================

class TakeVitalsView(APIView):
    """
    Infirmier prend les paramètres vitaux d'un patient
    Transitions: waiting -> ready_for_doctor
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            consultation = Consultation.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate user role
        if request.user.role not in ['nurse', 'doctor']:
            return Response(
                {'error': 'Seuls les infirmiers et médecins peuvent prendre les paramètres vitaux'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate vitals data
        serializer = VitalSignsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Take vitals
        consultation.take_vitals(
            nurse_user=request.user,
            vitals_data=serializer.validated_data
        )

        return Response(
            ConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK
        )


class StartConsultationWorkflowView(APIView):
    """
    Médecin démarre la consultation
    Transitions: ready_for_doctor -> in_consultation
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            consultation = Consultation.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate user role
        if request.user.role != 'doctor':
            return Response(
                {'error': 'Seuls les médecins peuvent démarrer une consultation'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Start consultation
        consultation.start_consultation(doctor_user=request.user)

        return Response(
            ConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK
        )


class CompleteConsultationWorkflowView(APIView):
    """
    Terminer la consultation
    Transitions: in_consultation -> completed
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            consultation = Consultation.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Complete consultation
        consultation.complete_consultation()

        return Response(
            ConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK
        )


class ConsultationQueueView(APIView):
    """
    Obtenir la file d'attente des consultations
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_param = request.query_params.get('date')
        if date_param:
            from datetime import datetime
            date = datetime.strptime(date_param, '%Y-%m-%d').date()
        else:
            date = timezone.now().date()

        queue = Consultation.get_queue(
            organization=request.user.organization,
            date=date
        )

        # Group by status
        waiting = queue.filter(status='waiting')
        vitals_pending = queue.filter(status='vitals_pending')
        ready_for_doctor = queue.filter(status='ready_for_doctor')

        return Response({
            'date': date,
            'total_in_queue': queue.count(),
            'waiting': ConsultationListSerializer(waiting, many=True).data,
            'vitals_pending': ConsultationListSerializer(vitals_pending, many=True).data,
            'ready_for_doctor': ConsultationListSerializer(ready_for_doctor, many=True).data,
        })


class NextPatientView(APIView):
    """
    Obtenir le prochain patient à traiter selon le rôle
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.user.role
        if role not in ['nurse', 'doctor']:
            return Response(
                {'error': 'Non autorisé'},
                status=status.HTTP_403_FORBIDDEN
            )

        next_patient = Consultation.get_next_patient(
            organization=request.user.organization,
            for_role=role
        )

        if next_patient:
            return Response(ConsultationSerializer(next_patient).data)
        else:
            return Response(
                {'message': 'Aucun patient en attente'},
                status=status.HTTP_204_NO_CONTENT
            )


# =============================================================================
# Prescription Views
# =============================================================================

class PrescriptionListView(generics.ListAPIView):
    """List all prescriptions"""
    serializer_class = PrescriptionListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'patient', 'prescriber']
    ordering_fields = ['prescribed_date', 'created_at']
    ordering = ['-prescribed_date']
    
    def get_queryset(self):
        queryset = Prescription.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'prescriber').prefetch_related('items')
        
        # Pending prescriptions only (for pharmacy view)
        pending_only = self.request.query_params.get('pending', 'false')
        if pending_only.lower() == 'true':
            queryset = queryset.filter(status__in=['pending', 'partially_filled'])
        
        # Not expired
        valid_only = self.request.query_params.get('valid', 'false')
        if valid_only.lower() == 'true':
            queryset = queryset.filter(valid_until__gte=timezone.now().date())
        
        return queryset


class PrescriptionDetailView(generics.RetrieveAPIView):
    """Retrieve a prescription with all items"""
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Prescription.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'prescriber', 'consultation').prefetch_related('items__medication')


class PrescriptionCreateView(APIView):
    """Create a prescription with items"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PrescriptionCreateSerializer(data=request.data)
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
        
        # Get consultation if provided
        consultation = None
        if data.get('consultation_id'):
            try:
                consultation = Consultation.objects.get(
                    id=data['consultation_id'],
                    organization=request.user.organization
                )
            except Consultation.DoesNotExist:
                pass
        
        # Calculate valid_until
        valid_until = (timezone.now() + timedelta(days=data.get('valid_days', 30))).date()
        
        # Create prescription
        prescription = Prescription.objects.create(
            organization=request.user.organization,
            patient=patient,
            consultation=consultation,
            prescriber=request.user if request.user.role == 'doctor' else None,
            created_user=request.user,
            valid_until=valid_until,
            notes=data.get('notes', ''),
        )
        
        # Create prescription items
        for item_data in data['items']:
            medication = None
            medication_name = item_data.get('medication_name', '')
            
            if item_data.get('medication_id'):
                try:
                    medication = Product.objects.get(
                        id=item_data['medication_id'],
                        organization=request.user.organization
                    )
                    medication_name = medication.name
                except Product.DoesNotExist:
                    pass
            
            PrescriptionItem.objects.create(
                prescription=prescription,
                medication=medication,
                medication_name=medication_name,
                dosage=item_data['dosage'],
                frequency=item_data['frequency'],
                duration=item_data.get('duration', ''),
                route=item_data.get('route', 'oral'),
                quantity_prescribed=item_data['quantity_prescribed'],
                instructions=item_data.get('instructions', ''),
                notes=item_data.get('notes', ''),
            )
        
        return Response(
            PrescriptionSerializer(prescription).data,
            status=status.HTTP_201_CREATED
        )


class PrescriptionCancelView(APIView):
    """Cancel a prescription"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            prescription = Prescription.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Prescription.DoesNotExist:
            return Response(
                {'error': 'Prescription not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if prescription.status not in ['pending', 'partially_filled']:
            return Response(
                {'error': 'Cannot cancel prescription in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        prescription.status = 'cancelled'
        prescription.save()

        return Response(PrescriptionSerializer(prescription).data)


class CreateLabOrderView(APIView):
    """Create a lab order for a consultation"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Create lab order with items
        Expected payload:
        {
            "consultation_id": "uuid",
            "patient_id": "uuid",
            "tests": ["test_id1", "test_id2", ...],
            "priority": "routine",
            "clinical_notes": "..."
        }
        """
        try:
            patient_id = request.data.get('patient_id')
            consultation_id = request.data.get('consultation_id')
            tests = request.data.get('tests', [])
            priority = request.data.get('priority', 'routine')
            clinical_notes = request.data.get('clinical_notes', '')

            if not patient_id or not tests:
                return Response(
                    {'error': 'patient_id and tests are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get patient
            patient = Client.objects.get(
                id=patient_id,
                organization=request.user.organization
            )

            # Get consultation if provided
            consultation = None
            if consultation_id:
                consultation = Consultation.objects.get(
                    id=consultation_id,
                    organization=request.user.organization
                )

            # Create lab order
            lab_order = LabOrder.objects.create(
                organization=request.user.organization,
                patient=patient,
                visit=consultation.visit if consultation else None,
                ordered_by=request.user,
                priority=priority,
                clinical_notes=clinical_notes
            )

            # Create lab order items and calculate total
            total_price = 0
            for test_id in tests:
                try:
                    lab_test = LabTest.objects.get(
                        id=test_id,
                        organization=request.user.organization
                    )
                    LabOrderItem.objects.create(
                        lab_order=lab_order,
                        lab_test=lab_test,
                        price=lab_test.price
                    )
                    total_price += lab_test.price
                except LabTest.DoesNotExist:
                    pass

            # Update total price
            lab_order.total_price = total_price
            lab_order.save()

            # Link to consultation if provided
            if consultation:
                consultation.lab_orders.add(lab_order)

            # Serialize response
            from apps.laboratory.serializers import LabOrderSerializer
            return Response(
                LabOrderSerializer(lab_order).data,
                status=status.HTTP_201_CREATED
            )

        except Client.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# Patient Medical History
# =============================================================================

class PatientMedicalHistoryView(APIView):
    """Get complete medical history for a patient"""
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
        
        # Get consultations
        consultations = Consultation.objects.filter(
            patient=patient
        ).order_by('-consultation_date').select_related('doctor')[:20]
        
        # Get prescriptions
        prescriptions = Prescription.objects.filter(
            patient=patient
        ).order_by('-prescribed_date').prefetch_related('items')[:20]
        
        # Patient allergies and chronic conditions
        patient_info = {
            'id': str(patient.id),
            'name': patient.name,
            'patient_number': patient.patient_number,
            'date_of_birth': patient.date_of_birth,
            'age': patient.get_age(),
            'gender': patient.gender,
            'blood_type': patient.blood_type,
            'allergies': patient.allergies,
            'chronic_conditions': patient.chronic_conditions,
        }
        
        # Statistics
        stats = {
            'total_consultations': Consultation.objects.filter(patient=patient).count(),
            'total_prescriptions': Prescription.objects.filter(patient=patient).count(),
            'total_visits': patient.visits.count() if hasattr(patient, 'visits') else 0,
        }
        
        return Response({
            'patient': patient_info,
            'statistics': stats,
            'recent_consultations': ConsultationListSerializer(consultations, many=True).data,
            'recent_prescriptions': PrescriptionListSerializer(prescriptions, many=True).data,
        })


class TodayConsultationsView(APIView):
    """Get today's consultations summary"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        consultations = Consultation.objects.filter(
            organization=request.user.organization,
            consultation_date__date=today
        ).select_related('patient', 'doctor')
        
        # Group by doctor if user is admin/manager
        by_doctor = {}
        for c in consultations:
            doctor_name = c.doctor.get_full_name() if c.doctor else 'Non assigné'
            if doctor_name not in by_doctor:
                by_doctor[doctor_name] = 0
            by_doctor[doctor_name] += 1
        
        return Response({
            'total': consultations.count(),
            'follow_ups_due': consultations.filter(follow_up_required=True).count(),
            'by_doctor': by_doctor,
            'recent': ConsultationListSerializer(
                consultations.order_by('-consultation_date')[:10],
                many=True
            ).data,
        })


class PrescriptionPDFView(APIView):
    """Generate PDF for prescription"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            prescription = Prescription.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except Prescription.DoesNotExist:
            return Response({'error': 'Prescription not found'}, status=status.HTTP_404_NOT_FOUND)
            
        service = ConsultationPDFGenerator()
        try:
            pdf_buffer = service.generate_prescription_pdf(
                prescription,
                template_type=request.query_params.get('template', 'classic'),
                language=request.query_params.get('lang', 'fr')
            )
            
            filename = f"prescription_{prescription.patient.name}_{prescription.created_at.date()}.pdf"
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            
            if request.query_params.get('download', 'true') == 'false':
                 response['Content-Disposition'] = f'inline; filename="{filename}"'
            else:
                 response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientHistoryPDFView(APIView):
    """Generate PDF for patient medical history"""
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
            
        consultations = Consultation.objects.filter(
            patient=patient
        ).order_by('-consultation_date').select_related('doctor').prefetch_related('prescriptions__items')
        
        service = ConsultationPDFGenerator()
        try:
            pdf_buffer = service.generate_history_pdf(
                patient,
                consultations,
                template_type=request.query_params.get('template', 'classic'),
                language=request.query_params.get('lang', 'fr')
            )
            
            filename = f"medical_history_{patient.patient_number}.pdf"
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            
            if request.query_params.get('download', 'true') == 'false':
                 response['Content-Disposition'] = f'inline; filename="{filename}"'
            else:
                 response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

