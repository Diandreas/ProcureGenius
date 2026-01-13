"""
API Views for Laboratory (LIMS) app
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
from .services import LabResultPDFGenerator

from apps.accounts.models import Client
from apps.patients.models import PatientVisit
from .models import LabTestCategory, LabTest, LabOrder, LabOrderItem
from .serializers import (
    LabTestCategorySerializer,
    LabTestSerializer,
    LabTestListSerializer,
    LabOrderSerializer,
    LabOrderListSerializer,
    LabOrderItemSerializer,
    LabOrderCreateSerializer,
    EnterResultsSerializer,
)


# =============================================================================
# Lab Test Category Views
# =============================================================================

class LabTestCategoryListCreateView(generics.ListCreateAPIView):
    """List all test categories or create a new one"""
    serializer_class = LabTestCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['display_order', 'name']
    
    def get_queryset(self):
        return LabTestCategory.objects.filter(
            organization=self.request.user.organization
        )
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class LabTestCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a test category"""
    serializer_class = LabTestCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LabTestCategory.objects.filter(
            organization=self.request.user.organization
        )


# =============================================================================
# Lab Test Views
# =============================================================================

class LabTestListCreateView(generics.ListCreateAPIView):
    """List all lab tests or create a new one"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'sample_type', 'is_active', 'fasting_required']
    search_fields = ['name', 'test_code', 'short_name']
    ordering_fields = ['name', 'test_code', 'price', 'category']
    ordering = ['category', 'name']
    
    def get_queryset(self):
        return LabTest.objects.filter(
            organization=self.request.user.organization
        ).select_related('category')
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return LabTestListSerializer
        return LabTestSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class LabTestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a lab test"""
    serializer_class = LabTestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LabTest.objects.filter(
            organization=self.request.user.organization
        ).select_related('category')


# =============================================================================
# Lab Order Views
# =============================================================================

class LabOrderListView(generics.ListAPIView):
    """List all lab orders with filtering"""
    serializer_class = LabOrderListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'patient']
    ordering_fields = ['order_date', 'created_at']
    ordering = ['-order_date']
    
    def get_queryset(self):
        queryset = LabOrder.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient').prefetch_related('items')
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(order_date__date=date)
        
        # Today only
        today_only = self.request.query_params.get('today', 'false')
        if today_only.lower() == 'true':
            queryset = queryset.filter(order_date__date=timezone.now().date())
        
        # Pending only (not completed or cancelled)
        pending_only = self.request.query_params.get('pending', 'false')
        if pending_only.lower() == 'true':
            queryset = queryset.exclude(status__in=['results_delivered', 'cancelled'])
        
        return queryset


class LabOrderDetailView(generics.RetrieveAPIView):
    """Retrieve a single lab order with all items"""
    serializer_class = LabOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LabOrder.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'ordered_by').prefetch_related('items__lab_test')


class LabOrderCreateView(APIView):
    """Create a new lab order with multiple tests"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = LabOrderCreateSerializer(data=request.data)
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
        
        # Get visit if provided
        visit = None
        if data.get('visit_id'):
            try:
                visit = PatientVisit.objects.get(
                    id=data['visit_id'],
                    organization=request.user.organization
                )
            except PatientVisit.DoesNotExist:
                pass
        
        # Get tests
        tests = LabTest.objects.filter(
            id__in=data['test_ids'],
            organization=request.user.organization,
            is_active=True
        )
        
        if not tests.exists():
            return Response(
                {'error': 'No valid tests found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create order
        order = LabOrder.objects.create(
            organization=request.user.organization,
            patient=patient,
            visit=visit,
            priority=data.get('priority', 'routine'),
            clinical_notes=data.get('clinical_notes', ''),
            ordered_by=request.user,
        )
        
        # Create order items for each test
        for test in tests:
            LabOrderItem.objects.create(
                lab_order=order,
                lab_test=test,
            )
        
        # Update visit status if linked
        if visit:
            visit.send_to_lab()
        
        return Response(
            LabOrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class LabOrderStatusUpdateView(APIView):
    """Update lab order status"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            order = LabOrder.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except LabOrder.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        
        if action == 'collect_sample':
            order.collect_sample(collected_by=request.user)
        elif action == 'start_processing':
            order.start_processing()
        elif action == 'complete':
            order.complete_results(entered_by=request.user)
        elif action == 'verify':
            order.verify_results(verified_by=request.user)
        elif action == 'deliver':
            order.mark_delivered()
        elif action == 'cancel':
            order.cancel_order()
        else:
            return Response(
                {'error': f'Unknown action: {action}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(LabOrderSerializer(order).data)


class EnterLabResultsView(APIView):
    """Enter results for lab order items"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            order = LabOrder.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except LabOrder.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = EnterResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        results_data = serializer.validated_data['results']
        updated_items = []
        
        for result in results_data:
            try:
                item = order.items.get(id=result['item_id'])
                
                item.result_value = result['result_value']
                
                if 'result_numeric' in result:
                    item.result_numeric = result['result_numeric']
                if 'interpretation' in result:
                    item.interpretation = result['interpretation']
                if 'technician_notes' in result:
                    item.technician_notes = result['technician_notes']
                if 'is_abnormal' in result:
                    item.is_abnormal = result['is_abnormal']
                if 'abnormality_type' in result:
                    item.abnormality_type = result['abnormality_type']
                if 'is_critical' in result:
                    item.is_critical = result['is_critical']
                
                # Auto-check for abnormality if numeric value provided
                if item.result_numeric:
                    item.check_abnormal()
                
                item.save()
                updated_items.append(item)
                
            except LabOrderItem.DoesNotExist:
                pass
        
        # If all results entered, update order status
        if order.all_results_entered:
            order.complete_results(entered_by=request.user)
        
        return Response({
            'message': f'Updated {len(updated_items)} result(s)',
            'order': LabOrderSerializer(order).data
        })


class TodayLabOrdersView(APIView):
    """Get today's lab orders grouped by status"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        orders = LabOrder.objects.filter(
            organization=request.user.organization,
            order_date__date=today
        ).select_related('patient').prefetch_related('items')
        
        result = {
            'total': orders.count(),
            'pending': orders.filter(status='pending').count(),
            'sample_collected': orders.filter(status='sample_collected').count(),
            'in_progress': orders.filter(status='in_progress').count(),
            'completed': orders.filter(status='completed').count(),
            'results_ready': orders.filter(status='results_ready').count(),
            'delivered': orders.filter(status='results_delivered').count(),
            'cancelled': orders.filter(status='cancelled').count(),
        }
        
        # Get pending orders list
        pending_orders = orders.exclude(status__in=['results_delivered', 'cancelled'])
        result['pending_orders'] = LabOrderListSerializer(pending_orders, many=True).data
        
        return Response(result)


class PatientLabHistoryView(APIView):
    """Get lab history for a patient"""
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
        
        orders = LabOrder.objects.filter(
            patient=patient
        ).order_by('-order_date').select_related('ordered_by').prefetch_related('items__lab_test')
        
        return Response({
            'patient_id': str(patient.id),
            'patient_name': patient.name,
            'total_orders': orders.count(),
            'orders': LabOrderSerializer(orders, many=True).data,
        })


class LabResultPDFView(APIView):
    """Generate PDF for lab results"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            order = LabOrder.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except LabOrder.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generator
        service = LabResultPDFGenerator()
        try:
            pdf_buffer = service.generate_lab_result_pdf(
                order, 
                template_type=request.query_params.get('template', 'classic'),
                language=request.query_params.get('lang', 'fr')
            )
            
            # Response
            filename = f"lab_result_{order.order_number}.pdf"
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # If download=false, show inline
            if request.query_params.get('download', 'true') == 'false':
                 response['Content-Disposition'] = f'inline; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'PDF Generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

