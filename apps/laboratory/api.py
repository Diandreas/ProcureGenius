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
        ).select_related('patient').prefetch_related('items', 'items__lab_test')
        
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
        
        # Auto-create invoice for lab order
        try:
            from apps.invoicing.models import Invoice, InvoiceItem
            from django.utils import timezone
            from datetime import timedelta
            
            # Create invoice
            invoice = Invoice.objects.create(
                created_by=request.user,
                client=patient,
                title=f"Analyses laboratoire - {order.order_number}",
                description=f"Commande laboratoire #{order.order_number}",
                due_date=timezone.now().date() + timedelta(days=30),
                subtotal=0,
                total_amount=0,
                status='draft',
                currency='XAF',
            )
            
            # Add invoice items from lab tests
            for test in tests:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    service_code=test.test_code or 'LAB',
                    description=test.name,
                    quantity=1,
                    unit_price=test.price,
                    total_price=test.price,
                )
            
            # Recalculate invoice totals
            invoice.recalculate_totals()
            
            # Link invoice to lab order
            order.lab_invoice = invoice
            order.save(update_fields=['lab_invoice'])
            
        except Exception as e:
            # Don't fail the order if invoice creation fails
            print(f"Error creating lab invoice: {e}")
        
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

        # ✅ VALIDATION: Si facture existe et est liée à la commande, elle peut influencer le statut
        # MAIS: Permettre la complétion des résultats même si la facture n'est pas encore payée
        # La gestion de la facture est maintenant manuelle et indépendante
        if action in ['complete', 'verify', 'deliver']:
            # On permet la complétion des résultats indépendamment du statut de paiement
            # La facture peut être générée et payée séparément
            pass  # Validation supprimée pour permettre la complétion indépendante

        if action == 'collect_sample':
            order.collect_sample(collected_by=request.user)
            
            # Auto-deduct stock for linked products
            try:
                from apps.invoicing.models import Product, StockMovement
                for item in order.items.all():
                    if item.lab_test.linked_product:
                        product = item.lab_test.linked_product
                        quantity = 1 # Default 1 unit per test
                        
                        # Create movement
                        StockMovement.objects.create(
                            organization=request.user.organization,
                            product=product,
                            movement_type='out',
                            quantity=quantity,
                            reason=f"Lab Order #{order.order_number} - {item.lab_test.test_code}",
                            performed_by=request.user
                        )
                        
                        # Update stock
                        product.quantity -= quantity
                        product.save()
            except Exception as e:
                print(f"Error deducting stock for lab order {order.order_number}: {e}")
                # Don't fail the request, just log

        elif action == 'start_processing':
            order.start_processing()
        elif action == 'complete':
            order.complete_results(entered_by=request.user)
        elif action == 'verify':
            order.verify_results(verified_by=request.user)
        elif action == 'deliver':
            order.mark_delivered()
        elif action == 'invalidate':
            # Revert to results entered (completed), clearing verification
            order.status = 'completed'
            order.results_verified_by = None
            order.results_verified_at = None
            order.save(update_fields=['status', 'results_verified_by', 'results_verified_at'])
            # We could also log this action
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

        # Update biologist diagnosis if provided
        if 'biologist_diagnosis' in serializer.validated_data:
            order.biologist_diagnosis = serializer.validated_data['biologist_diagnosis']
            order.diagnosed_by = request.user
            order.diagnosed_at = timezone.now()
            order.save(update_fields=['biologist_diagnosis', 'diagnosed_by', 'diagnosed_at'])

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


class LabOrderItemHistoryView(APIView):
    """Get previous results for a specific lab order item"""
    permission_classes = [IsAuthenticated]

    def get(self, request, item_id):
        try:
            item = LabOrderItem.objects.select_related(
                'lab_order__patient',
                'lab_order__organization',
                'lab_test'
            ).get(id=item_id)

            # Verify organization access
            if item.lab_order.organization != request.user.organization:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get previous results using the model method
            previous_results = item.get_previous_results(limit=10)

            # Serialize previous results
            history_data = []
            for prev_item in previous_results:
                history_data.append({
                    'id': str(prev_item.id),
                    'order_number': prev_item.lab_order.order_number,
                    'order_date': prev_item.lab_order.order_date,
                    'result_value': prev_item.result_value,
                    'result_numeric': prev_item.result_numeric,
                    'result_unit': prev_item.result_unit,
                    'is_abnormal': prev_item.is_abnormal,
                    'abnormality_type': prev_item.abnormality_type,
                    'result_entered_at': prev_item.result_entered_at,
                    'reference_range': prev_item.reference_range,
                })

            return Response({
                'item_id': str(item.id),
                'test_name': item.lab_test.name,
                'test_code': item.lab_test.test_code,
                'patient_name': item.lab_order.patient.name,
                'current_result': item.result_value,
                'previous_results': history_data,
                'total_previous': len(history_data)
            })

        except LabOrderItem.DoesNotExist:
            return Response(
                {'error': 'Lab order item not found'},
                status=status.HTTP_404_NOT_FOUND
            )


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
                template_type=request.query_params.get('template', 'report'),
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


class GenerateLabOrderInvoiceView(APIView):
    """Generate invoice for lab order (manual trigger)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from apps.healthcare.invoice_services import LabOrderInvoiceService

        try:
            lab_order = LabOrder.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except LabOrder.DoesNotExist:
            return Response(
                {'error': 'Lab order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            invoice = LabOrderInvoiceService.generate_invoice(lab_order)
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

