"""
API Views for Laboratory (LIMS) app
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Case, When, IntegerField
from django.utils import timezone
from django.http import HttpResponse
from decimal import Decimal, InvalidOperation
from .services import LabResultPDFGenerator

from apps.accounts.models import Client
from apps.patients.models import PatientVisit
from .models import LabTestCategory, LabTest, LabOrder, LabOrderItem, LabTestParameter, LabResultValue, LabTestPanel, Prescriber, SubcontractorLab, SubcontractorPrice, SubcontractorDefaultPrice, SubcontractorPatient
from .serializers import (
    LabTestCategorySerializer,
    LabTestSerializer,
    LabTestListSerializer,
    LabOrderSerializer,
    LabOrderListSerializer,
    LabOrderItemSerializer,
    LabOrderCreateSerializer,
    EnterResultsSerializer,
    LabTestParameterSerializer,
    LabTestPanelSerializer,
    PrescriberSerializer,
    PrescriberListSerializer,
    SubcontractorLabSerializer,
    SubcontractorLabListSerializer,
    SubcontractorPriceSerializer,
    SubcontractorDefaultPriceSerializer,
    SubcontractorPatientSerializer,
    SubcontractorPatientListSerializer,
)


class IsAdminOrReadOnly(BasePermission):
    """Admin (Boris) peut écrire ; tout utilisateur authentifié peut lire."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


# =============================================================================
# Lab Test Category Views
# =============================================================================

class LabTestCategoryListCreateView(generics.ListCreateAPIView):
    """List all test categories or create a new one"""
    serializer_class = LabTestCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
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
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        return LabTestCategory.objects.filter(
            organization=self.request.user.organization
        )


# =============================================================================
# Lab Test Views
# =============================================================================

class LabTestListCreateView(generics.ListCreateAPIView):
    """List all lab tests or create a new one"""
    permission_classes = [IsAdminOrReadOnly]
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
    permission_classes = [IsAdminOrReadOnly]
    
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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'patient']
    search_fields = ['order_number', 'patient__name', 'patient__patient_number']
    ordering_fields = ['order_date', 'created_at']
    ordering = ['-order_date']

    def get_queryset(self):
        from django.db.models import Q

        queryset = LabOrder.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'subcontractor').prefetch_related('items', 'items__lab_test')

        # Filter by subcontractor
        subcontractor_id = self.request.query_params.get('subcontractor_id')
        if subcontractor_id:
            queryset = queryset.filter(subcontractor_id=subcontractor_id)

        # Filter subcontracted orders only
        is_subcontracted = self.request.query_params.get('is_subcontracted')
        if is_subcontracted == 'true':
            queryset = queryset.filter(subcontractor__isnull=False)
        elif is_subcontracted == 'false':
            queryset = queryset.filter(subcontractor__isnull=True)

        # Filter by multiple statuses (status_in parameter)
        status_in = self.request.query_params.get('status_in')
        if status_in:
            statuses = [s.strip() for s in status_in.split(',')]
            queryset = queryset.filter(status__in=statuses)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(order_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__date__lte=end_date)

        # Filter by exact date (legacy support)
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(order_date__date=date)

        # Today only (legacy support)
        today_only = self.request.query_params.get('today', 'false')
        if today_only.lower() == 'true':
            queryset = queryset.filter(order_date__date=timezone.now().date())

        # Pending only (legacy support)
        pending_only = self.request.query_params.get('pending', 'false')
        if pending_only.lower() == 'true':
            queryset = queryset.exclude(status__in=['results_delivered', 'cancelled'])

        return queryset


class LabOrderDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a single lab order (DELETE admin only)"""
    serializer_class = LabOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LabOrder.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'ordered_by').prefetch_related(
            'items__lab_test',
            'items__lab_test__parameters',
            'items__parameter_results__parameter',
        )

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Suppression réservée aux administrateurs.")
        return super().destroy(request, *args, **kwargs)


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
        if data.get('tests_data'):
            test_ids = [item['test_id'] for item in data['tests_data']]
        else:
            test_ids = data.get('test_ids', [])

        tests = LabTest.objects.filter(
            id__in=test_ids,
            organization=request.user.organization,
            is_active=True
        )
        
        if not tests.exists() and not data.get('panels_data'):
            return Response(
                {'error': 'No valid tests found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get prescriber if provided
        prescriber = None
        if data.get('prescriber_id'):
            try:
                prescriber = Prescriber.objects.get(
                    id=data['prescriber_id'],
                    organization=request.user.organization,
                    is_active=True
                )
            except Prescriber.DoesNotExist:
                pass

        # Get subcontractor if provided
        subcontractor = None
        subcontractor_prices = {}
        if data.get('subcontractor_id'):
            try:
                subcontractor = SubcontractorLab.objects.get(
                    id=data['subcontractor_id'],
                    organization=request.user.organization,
                    is_active=True
                )
                # Preload subcontractor prices for fast lookup
                subcontractor_prices = {
                    str(sp.lab_test_id): sp.price
                    for sp in SubcontractorPrice.objects.filter(
                        subcontractor=subcontractor,
                        is_active=True
                    )
                }
            except SubcontractorLab.DoesNotExist:
                pass

        # Create order
        order = LabOrder.objects.create(
            organization=request.user.organization,
            patient=patient,
            visit=visit,
            priority=data.get('priority', 'routine'),
            clinical_notes=data.get('clinical_notes', ''),
            ordered_by=request.user,
            payment_method=data.get('payment_method', 'cash'),
            prescriber=prescriber,
            subcontractor=subcontractor,
        )
        
        # Create order items for each test
        total_order_price = 0
        total_order_discount = 0

        # Handle panels_data (bilans with forfait price)
        if data.get('panels_data'):
            for panel_data in data['panels_data']:
                try:
                    panel = LabTestPanel.objects.get(
                        id=panel_data['panel_id'],
                        organization=request.user.organization,
                        is_active=True,
                    )
                    panel_tests = list(panel.tests.filter(is_active=True))
                    panel_net_price = panel.price - (panel.discount or Decimal('0'))
                    panel_discount_override = panel_data.get('discount')
                    if panel_discount_override is not None:
                        panel_net_price = panel.price - Decimal(str(panel_discount_override))

                    for i, test in enumerate(panel_tests):
                        # First item carries the panel_price; others have price=0
                        LabOrderItem.objects.create(
                            lab_order=order,
                            lab_test=test,
                            price=Decimal('0'),
                            discount=Decimal('0'),
                            panel=panel,
                            panel_price=panel_net_price if i == 0 else None,
                        )

                    total_order_price += panel_net_price
                    # panel discount already factored into net price
                except (LabTestPanel.DoesNotExist, KeyError):
                    continue

        # Handle tests_data (new format with individual discounts)
        if data.get('tests_data'):
            for item_data in data['tests_data']:
                try:
                    test = LabTest.objects.get(
                        id=item_data['test_id'],
                        organization=request.user.organization
                    )
                    # Use subcontractor price if available, else standard price
                    item_price = subcontractor_prices.get(str(test.id), test.price)
                    item_discount = Decimal(str(item_data.get('discount', test.discount or 0)))

                    LabOrderItem.objects.create(
                        lab_order=order,
                        lab_test=test,
                        price=item_price,
                        discount=item_discount,
                    )
                    total_order_price += item_price
                    total_order_discount += item_discount
                except (LabTest.DoesNotExist, KeyError):
                    continue

        # Handle legacy test_ids (simple list)
        elif data.get('test_ids') and not data.get('panels_data'):
            for test in tests:
                # Use subcontractor price if available
                item_price = subcontractor_prices.get(str(test.id), test.price)
                item_discount = test.discount or 0

                LabOrderItem.objects.create(
                    lab_order=order,
                    lab_test=test,
                    price=item_price,
                    discount=item_discount,
                )
                total_order_price += item_price
                total_order_discount += item_discount
        
        # Update order totals
        order.total_price = total_order_price
        order.discount = total_order_discount
        order.save() # Use standard save to ensure everything is committed

        # Update visit status if linked
        if visit:
            visit.send_to_lab()
        
        # Auto-create invoice for lab order using service
        try:
            from apps.healthcare.invoice_services import LabOrderInvoiceService
            # Ensure we have the latest version of the order with its items
            order.refresh_from_db()
            LabOrderInvoiceService.generate_invoice(order)
        except Exception as e:
            # Don't fail the order if invoice creation fails
            import traceback
            print(f"Error creating lab invoice: {e}")
            traceback.print_exc()

        # Refresh order from database to ensure all relationships are loaded
        order.refresh_from_db()

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
        
        # Get patient info for flag computation
        patient = order.patient
        patient_age = patient.get_age() if patient else None
        patient_sex = patient.gender if patient else None

        for result in results_data:
            try:
                item = order.items.get(id=result['item_id'])

                # Always update result_value if provided (global text or comment)
                if 'result_value' in result:
                    item.result_value = result['result_value']

                if 'result_numeric' in result:
                    # Convert to base unit using test's conversion factor
                    try:
                        val = Decimal(str(result['result_numeric'])) if result['result_numeric'] is not None else None
                        if val is not None:
                            factor = item.lab_test.conversion_factor or Decimal('1.0')
                            item.result_numeric = val / factor
                        else:
                            item.result_numeric = None
                    except (InvalidOperation, TypeError):
                        item.result_numeric = None

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

                # Handle structured parameter values (compound tests like NFS)
                parameter_values = result.get('parameter_values', [])
                if parameter_values:
                    any_abnormal = False
                    any_critical = False
                    for pv in parameter_values:
                        try:
                            parameter = LabTestParameter.objects.get(id=pv['parameter_id'])
                            lab_result, _ = LabResultValue.objects.get_or_create(
                                order_item=item,
                                parameter=parameter,
                                defaults={'entered_by': request.user}
                            )
                            if 'result_numeric' in pv:
                                try:
                                    val = Decimal(str(pv['result_numeric'])) if pv['result_numeric'] is not None else None
                                    if val is not None:
                                        factor = parameter.conversion_factor or Decimal('1.0')
                                        lab_result.result_numeric = val / factor
                                    else:
                                        lab_result.result_numeric = None
                                except (InvalidOperation, TypeError):
                                    lab_result.result_numeric = None
                            if 'result_text' in pv:
                                lab_result.result_text = pv['result_text']
                            lab_result.entered_by = request.user
                            # Compute flag based on patient demographics
                            lab_result.compute_flag(patient_age, patient_sex)
                            lab_result.save()
                            if lab_result.flag in ('H', 'L'):
                                any_abnormal = True
                            if lab_result.flag in ('H*', 'L*'):
                                any_critical = True
                        except LabTestParameter.DoesNotExist:
                            pass

                    # Auto-mark item as abnormal if any parameter is out of range
                    if any_critical:
                        item.is_abnormal = True
                        item.is_critical = True
                        item.abnormality_type = 'critical_high'
                    elif any_abnormal:
                        item.is_abnormal = True
                        item.abnormality_type = 'high'

                    # Mark item as having results entered (for workflow)
                    if not item.result_value:
                        item.result_value = 'voir paramètres'

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


class SaveTestTemplateView(APIView):
    """
    POST /healthcare/laboratory/items/<item_id>/save-as-template/
    Saves the result_value as the default result_template for its LabTest.
    Allows passing result_value in body, falls back to item.result_value.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, item_id):
        try:
            item = LabOrderItem.objects.get(
                id=item_id,
                lab_order__organization=request.user.organization
            )
        except LabOrderItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get result from request body or database
        result_value = request.data.get('result_value') or item.result_value

        if not result_value:
            return Response({'error': 'Le résultat est vide, impossible de créer un modèle.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update the parent test's template
        test = item.lab_test
        test.result_template = result_value
        test.save(update_fields=['result_template'])

        return Response({
            'message': 'Modèle mis à jour avec succès',
            'result_template': test.result_template
        })


class TodayLabOrdersView(APIView):
    """Get lab orders dashboard: active orders + today's stats"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_orders = LabOrder.objects.filter(
            organization=request.user.organization
        ).select_related('patient', 'subcontractor').prefetch_related('items')

        # Active orders = all non-delivered, non-cancelled (regardless of date)
        active_orders = org_orders.exclude(status__in=['results_delivered', 'cancelled'])

        # Today's stats for the cards
        today = timezone.now().date()
        today_orders = org_orders.filter(order_date__date=today)

        result = {
            # Stats: active counts (not limited to today)
            'total': active_orders.count(),
            'pending': active_orders.filter(status='pending').count(),
            'sample_collected': active_orders.filter(status='sample_collected').count(),
            'in_progress': active_orders.filter(status='in_progress').count(),
            'completed': active_orders.filter(status='completed').count(),
            'results_ready': active_orders.filter(status='results_ready').count(),
            'subcontracted': active_orders.filter(subcontractor__isnull=False).count(),
            # Today-specific
            'today_total': today_orders.count(),
            'today_delivered': today_orders.filter(status='results_delivered').count(),
        }

        # Active orders list (sorted by priority then date)
        active_sorted = active_orders.order_by(
            Case(
                When(priority='stat', then=0),
                When(priority='urgent', then=1),
                default=2,
                output_field=IntegerField(),
            ),
            'order_date'
        )
        serialized = LabOrderListSerializer(active_sorted, many=True).data

        # Add wait_minutes to each order
        now = timezone.now()
        for order_data in serialized:
            order_date = order_data.get('order_date')
            if order_date:
                try:
                    from django.utils.dateparse import parse_datetime
                    dt = parse_datetime(order_date) if isinstance(order_date, str) else order_date
                    if dt:
                        if timezone.is_naive(dt):
                            dt = timezone.make_aware(dt)
                        delta = now - dt
                        order_data['wait_minutes'] = int(delta.total_seconds() / 60)
                    else:
                        order_data['wait_minutes'] = 0
                except Exception:
                    order_data['wait_minutes'] = 0
            else:
                order_data['wait_minutes'] = 0

        result['pending_orders'] = serialized

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
    """Generate invoice for lab order (manual trigger) — Boris uniquement"""
    permission_classes = [IsAdminOrReadOnly]

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



class LabTestParameterListCreateView(generics.ListCreateAPIView):
    """List all parameters for a lab test, or create a new parameter"""
    serializer_class = LabTestParameterSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return LabTestParameter.objects.filter(
            test__id=self.kwargs['test_id'],
            test__organization=self.request.user.organization
        ).order_by('display_order')

    def perform_create(self, serializer):
        test = LabTest.objects.get(
            id=self.kwargs['test_id'],
            organization=self.request.user.organization
        )
        serializer.save(test=test)


class LabTestParameterDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a lab test parameter"""
    serializer_class = LabTestParameterSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return LabTestParameter.objects.filter(
            test__organization=self.request.user.organization
        )


class LabTestParameterBulkSaveView(APIView):
    """
    POST /healthcare/laboratory/tests/<test_id>/parameters/bulk-save/
    Updates parameters for a test using UPDATE/CREATE/soft-delete to preserve result history.
    Parameters with existing results are never deleted — they are marked is_active=False instead.
    """
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request, test_id):
        try:
            test = LabTest.objects.get(id=test_id, organization=request.user.organization)
        except LabTest.DoesNotExist:
            return Response({'error': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)

        params_data = request.data.get('parameters', [])

        # Build a map of submitted codes → data
        submitted_codes = {p['code']: p for p in params_data if p.get('code')}

        # Build a map of existing parameters by code
        existing_params = {p.code: p for p in test.parameters.filter(is_active=True)}

        # Determine codes to remove (in existing but not in submitted)
        codes_to_remove = set(existing_params.keys()) - set(submitted_codes.keys())

        # Soft-delete or hard-delete parameters no longer in the list
        for code in codes_to_remove:
            param = existing_params[code]
            if param.results.exists():
                # Has historical results: soft-delete only
                param.is_active = False
                param.save(update_fields=['is_active'])
            else:
                param.delete()

        saved = []
        for i, p in enumerate(params_data):
            code = p.get('code', '')
            p['display_order'] = i

            if code in existing_params:
                # UPDATE existing parameter
                instance = existing_params[code]
                serializer = LabTestParameterSerializer(instance, data=p, partial=True)
            else:
                # CREATE new parameter
                serializer = LabTestParameterSerializer(data=p)

            if serializer.is_valid():
                param = serializer.save(test=test, is_active=True)
                saved.append(LabTestParameterSerializer(param).data)
            else:
                return Response({'error': serializer.errors, 'parameter_code': code}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'parameters': saved, 'count': len(saved)}, status=status.HTTP_200_OK)


class GenerateTestCodeView(APIView):
    """
    GET /healthcare/laboratory/tests/generate-code/
    Returns a unique test code for the current organization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.core.services.number_generator import NumberGeneratorService
        code = NumberGeneratorService.generate_number(
            prefix='TST',
            organization=request.user.organization,
            model_class=LabTest,
            field_name='test_code',
        )
        return Response({'test_code': code})


class QuickUpdateConfigView(APIView):
    """
    POST /healthcare/laboratory/quick-update-unit/
    Updates unit, conversion factor, and reference ranges for a test or parameter.
    """
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request):
        test_id = request.data.get('test_id')
        parameter_id = request.data.get('parameter_id')
        unit = request.data.get('unit')
        factor = request.data.get('factor')
        
        # Reference range fields
        ref_fields = [
            'adult_ref_min_male', 'adult_ref_max_male',
            'adult_ref_min_female', 'adult_ref_max_female',
            'adult_ref_min_general', 'adult_ref_max_general',
            'child_ref_min', 'child_ref_max',
            'critical_low', 'critical_high'
        ]

        try:
            if factor is not None:
                factor = Decimal(str(factor))
        except (ValueError, InvalidOperation, TypeError):
            factor = Decimal('1.0')

        if parameter_id:
            try:
                obj = LabTestParameter.objects.get(id=parameter_id, test__organization=request.user.organization)
                if unit is not None: obj.unit = unit
                if factor is not None: obj.conversion_factor = factor
                
                # Update reference fields if provided
                for field in ref_fields:
                    if field in request.data:
                        val = request.data.get(field)
                        try:
                            setattr(obj, field, Decimal(str(val)) if val not in [None, ''] else None)
                        except (ValueError, InvalidOperation):
                            pass
                
                obj.save()
                return Response({'status': 'success', 'type': 'parameter'})
            except LabTestParameter.DoesNotExist:
                return Response({'error': 'Parameter not found'}, status=404)
        
        if test_id:
            try:
                obj = LabTest.objects.get(id=test_id, organization=request.user.organization)
                if unit is not None: obj.unit_of_measurement = unit
                if factor is not None: obj.conversion_factor = factor
                
                # Simple tests have ref ranges as text fields
                simple_ref_fields = ['normal_range_male', 'normal_range_female', 'normal_range_general', 'normal_range_child']
                for field in simple_ref_fields:
                    if field in request.data:
                        setattr(obj, field, request.data.get(field))

                obj.save()
                return Response({'status': 'success', 'type': 'test'})
            except LabTest.DoesNotExist:
                return Response({'error': 'Test not found'}, status=404)

        return Response({'error': 'Missing test_id or parameter_id'}, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# Bilans (Lab Test Panels)
# ─────────────────────────────────────────────────────────────────────────────

class LabTestPanelListCreateView(generics.ListCreateAPIView):
    """
    GET  /healthcare/laboratory/panels/       — List all bilans for the organization
    POST /healthcare/laboratory/panels/       — Create a new bilan
    """
    serializer_class = LabTestPanelSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'description']

    def get_queryset(self):
        qs = LabTestPanel.objects.filter(
            organization=self.request.user.organization
        ).prefetch_related('tests')
        active_only = self.request.query_params.get('active_only', 'false').lower() == 'true'
        if active_only:
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class LabTestPanelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /healthcare/laboratory/panels/<uuid>/   — Get bilan details
    PATCH  /healthcare/laboratory/panels/<uuid>/   — Update bilan
    DELETE /healthcare/laboratory/panels/<uuid>/   — Delete bilan
    """
    serializer_class = LabTestPanelSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return LabTestPanel.objects.filter(
            organization=self.request.user.organization
        ).prefetch_related('tests')


class PrescriberListCreateView(generics.ListCreateAPIView):
    """
    GET  /healthcare/laboratory/prescribers/  — List prescribers (all authenticated)
    POST /healthcare/laboratory/prescribers/  — Create prescriber (admin only)
    """
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'clinic_name', 'specialty']
    ordering_fields = ['last_name', 'commission_rate', 'created_at']
    ordering = ['last_name']

    def get_queryset(self):
        qs = Prescriber.objects.filter(organization=self.request.user.organization)
        if self.request.query_params.get('active_only', '').lower() == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PrescriberListSerializer
        return PrescriberSerializer

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class PrescriberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /healthcare/laboratory/prescribers/<uuid>/  — all authenticated
    PATCH  /healthcare/laboratory/prescribers/<uuid>/  — admin only
    DELETE /healthcare/laboratory/prescribers/<uuid>/  — admin only
    """
    serializer_class = PrescriberSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return Prescriber.objects.filter(organization=self.request.user.organization)


# =============================================================================
# Subcontractor Lab Views
# =============================================================================

class SubcontractorLabListCreateView(generics.ListCreateAPIView):
    """
    GET  /healthcare/laboratory/subcontractors/  — List subcontractor labs
    POST /healthcare/laboratory/subcontractors/  — Create subcontractor lab
    """
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return SubcontractorLabListSerializer
        return SubcontractorLabSerializer

    def get_queryset(self):
        qs = SubcontractorLab.objects.filter(organization=self.request.user.organization)
        if self.request.GET.get('active_only') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class SubcontractorLabDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /healthcare/laboratory/subcontractors/<uuid>/
    """
    serializer_class = SubcontractorLabSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return SubcontractorLab.objects.filter(organization=self.request.user.organization)


class SubcontractorPriceListView(generics.ListAPIView):
    """
    GET /healthcare/laboratory/subcontractors/<uuid>/prices/
    Returns all prices for a subcontractor, enriched with test info.
    """
    serializer_class = SubcontractorPriceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        subcontractor_id = self.kwargs['subcontractor_id']
        return SubcontractorPrice.objects.filter(
            subcontractor_id=subcontractor_id,
            subcontractor__organization=self.request.user.organization,
        ).select_related('lab_test', 'lab_test__category')


class SubcontractorPriceBulkSaveView(APIView):
    """
    POST /healthcare/laboratory/subcontractors/<uuid>/prices/bulk-save/
    Body: [{lab_test_id, price, turnaround_days, is_active, notes}, ...]
    Creates or updates prices in bulk.
    """
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request, subcontractor_id):
        try:
            subcontractor = SubcontractorLab.objects.get(
                id=subcontractor_id,
                organization=request.user.organization
            )
        except SubcontractorLab.DoesNotExist:
            return Response({'error': 'Sous-traitant introuvable'}, status=status.HTTP_404_NOT_FOUND)

        items = request.data if isinstance(request.data, list) else request.data.get('prices', [])
        saved = []
        errors = []

        for item in items:
            test_id = item.get('lab_test_id') or item.get('lab_test')
            price = item.get('price')
            if not test_id or price is None:
                errors.append({'error': 'lab_test_id et price sont obligatoires', 'item': item})
                continue
            try:
                test = LabTest.objects.get(id=test_id, organization=request.user.organization)
                obj, created = SubcontractorPrice.objects.update_or_create(
                    subcontractor=subcontractor,
                    lab_test=test,
                    defaults={
                        'price': price,
                        'turnaround_days': item.get('turnaround_days', 3),
                        'is_active': item.get('is_active', True),
                        'notes': item.get('notes', ''),
                    }
                )
                saved.append(SubcontractorPriceSerializer(obj, context={'request': request}).data)
            except LabTest.DoesNotExist:
                errors.append({'error': f'Examen {test_id} introuvable', 'item': item})

        return Response({'saved': saved, 'errors': errors}, status=status.HTTP_200_OK)


class SubcontractorTestsWithPricesView(APIView):
    """
    GET /healthcare/laboratory/subcontractors/<uuid>/tests/
    Returns all active tests with their subcontractor price (if set).
    Useful for the LabOrderForm to show prices per subcontractor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, subcontractor_id):
        try:
            subcontractor = SubcontractorLab.objects.get(
                id=subcontractor_id,
                organization=request.user.organization,
                is_active=True
            )
        except SubcontractorLab.DoesNotExist:
            return Response({'error': 'Sous-traitant introuvable'}, status=status.HTTP_404_NOT_FOUND)

        tests = LabTest.objects.filter(
            organization=request.user.organization,
            is_active=True
        ).select_related('category')

        # Build price lookup
        prices = {
            sp.lab_test_id: sp
            for sp in SubcontractorPrice.objects.filter(
                subcontractor=subcontractor,
                is_active=True
            )
        }

        result = []
        for test in tests:
            sp = prices.get(test.id)
            result.append({
                'id': str(test.id),
                'test_code': test.test_code,
                'name': test.name,
                'category': test.category.name if test.category else None,
                'standard_price': float(test.price),
                'subcontractor_price': float(sp.price) if sp else None,
                'turnaround_days': sp.turnaround_days if sp else None,
                'has_subcontractor_price': sp is not None,
            })

        return Response({
            'subcontractor': SubcontractorLabListSerializer(subcontractor).data,
            'tests': result,
        })


class SubcontractorDefaultPriceView(APIView):
    """
    GET  /healthcare/laboratory/subcontractors/default-prices/   — List all tests with default subcontractor price
    POST /healthcare/laboratory/subcontractors/default-prices/bulk-save/  — Bulk save default prices
    """
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        org = request.user.organization
        tests = LabTest.objects.filter(
            organization=org, is_active=True
        ).select_related('category').order_by('category__name', 'name')

        defaults = {
            dp.lab_test_id: dp
            for dp in SubcontractorDefaultPrice.objects.filter(organization=org)
        }

        result = []
        for test in tests:
            dp = defaults.get(test.id)
            result.append({
                'id': str(test.id),
                'test_code': test.test_code,
                'name': test.name,
                'category': test.category.name if test.category else None,
                'standard_price': float(test.price),
                'default_price': float(dp.price) if dp else None,
                'is_active': dp.is_active if dp else False,
                'default_price_id': str(dp.id) if dp else None,
            })
        return Response(result)


class SubcontractorDefaultPriceBulkSaveView(APIView):
    """
    POST /healthcare/laboratory/subcontractors/default-prices/bulk-save/
    Body: [{lab_test_id, price, is_active}, ...]
    """
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request):
        org = request.user.organization
        items = request.data if isinstance(request.data, list) else request.data.get('prices', [])
        saved = 0
        for item in items:
            test_id = item.get('lab_test_id') or item.get('id')
            price = item.get('price')
            is_active = item.get('is_active', True)
            if not test_id or price is None:
                continue
            try:
                test = LabTest.objects.get(id=test_id, organization=org)
                SubcontractorDefaultPrice.objects.update_or_create(
                    organization=org, lab_test=test,
                    defaults={'price': price, 'is_active': is_active}
                )
                saved += 1
            except (LabTest.DoesNotExist, Exception):
                continue
        return Response({'saved': saved})


class SubcontractorPriceBulkActivateView(APIView):
    """
    POST /healthcare/laboratory/subcontractors/<uuid>/prices/bulk-activate/
    Body: {test_ids: [...], is_active: true, use_defaults: true}
    When use_defaults=true, copies default prices for selected tests.
    """
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request, subcontractor_id):
        try:
            subcontractor = SubcontractorLab.objects.get(
                id=subcontractor_id, organization=request.user.organization
            )
        except SubcontractorLab.DoesNotExist:
            return Response({'error': 'Sous-traitant introuvable'}, status=status.HTTP_404_NOT_FOUND)

        test_ids = request.data.get('test_ids', [])
        is_active = request.data.get('is_active', True)
        use_defaults = request.data.get('use_defaults', False)
        activate_all = request.data.get('activate_all', False)

        org = request.user.organization
        if activate_all:
            tests = LabTest.objects.filter(organization=org, is_active=True)
        else:
            tests = LabTest.objects.filter(id__in=test_ids, organization=org, is_active=True)

        if not tests.exists():
            return Response({'error': 'Aucun examen trouvé'}, status=status.HTTP_400_BAD_REQUEST)

        # Build default prices map
        defaults_map = {}
        if use_defaults:
            defaults_map = {
                dp.lab_test_id: dp.price
                for dp in SubcontractorDefaultPrice.objects.filter(organization=org, lab_test__in=tests)
            }

        saved = 0
        for test in tests:
            price = defaults_map.get(test.id, test.price)  # Fallback to standard price
            obj, created = SubcontractorPrice.objects.get_or_create(
                subcontractor=subcontractor, lab_test=test,
                defaults={'price': price, 'is_active': is_active}
            )
            if not created:
                obj.is_active = is_active
                if use_defaults and test.id in defaults_map:
                    obj.price = defaults_map[test.id]
                obj.save(update_fields=['is_active', 'price', 'updated_at'])
            saved += 1

        return Response({'saved': saved, 'is_active': is_active})


class SubcontractorPatientListCreateView(generics.ListCreateAPIView):
    """
    GET  /healthcare/laboratory/subcontractors/<uuid>/patients/
    POST /healthcare/laboratory/subcontractors/<uuid>/patients/
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return SubcontractorPatientListSerializer
        return SubcontractorPatientSerializer

    def get_queryset(self):
        subcontractor_id = self.kwargs['subcontractor_id']
        qs = SubcontractorPatient.objects.filter(
            subcontractor_id=subcontractor_id,
            subcontractor__organization=self.request.user.organization
        )
        search = self.request.GET.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(external_id__icontains=search) |
                Q(phone__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        subcontractor_id = self.kwargs['subcontractor_id']
        subcontractor = SubcontractorLab.objects.get(
            id=subcontractor_id,
            organization=self.request.user.organization
        )
        serializer.save(subcontractor=subcontractor)


class SubcontractorPatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /healthcare/laboratory/subcontractors/<uuid>/patients/<uuid>/
    """
    serializer_class = SubcontractorPatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubcontractorPatient.objects.filter(
            subcontractor__organization=self.request.user.organization
        )


class SubcontractorBatchOrderView(APIView):
    """
    POST /healthcare/laboratory/subcontractors/<uuid>/batch-order/
    Crée plusieurs commandes labo pour les patients d'un sous-traitant.
    - Auto-crée un Client interne pour chaque SubcontractorPatient si besoin
    - Status initial = sample_collected (échantillons déjà prélevés)
    - Auto-génère les factures (1 item par examen par patient)

    Body: {
        rows: [{subcontractor_patient_id, test_ids, priority, clinical_notes}],
        payment_method: 'cash',
        payment_mode: 'immediate' | 'deferred'  — défaut: 'immediate'
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, subcontractor_id):
        from apps.accounts.models import Client
        from apps.invoicing.models import Invoice, InvoiceItem, Payment
        from decimal import Decimal
        from django.utils import timezone
        from django.utils.timezone import now as tz_now
        from django.db import transaction

        org = request.user.organization
        try:
            subcontractor = SubcontractorLab.objects.get(id=subcontractor_id, organization=org)
        except SubcontractorLab.DoesNotExist:
            return Response({'error': 'Sous-traitant introuvable'}, status=status.HTTP_404_NOT_FOUND)

        rows = request.data.get('rows', [])
        payment_method = request.data.get('payment_method', 'cash')
        payment_mode = request.data.get('payment_mode', 'immediate')  # 'immediate' | 'deferred'

        if not rows:
            return Response({'error': 'Aucune ligne fournie'}, status=status.HTTP_400_BAD_REQUEST)

        # Build subcontractor price map
        sub_prices = {
            sp.lab_test_id: sp.price
            for sp in SubcontractorPrice.objects.filter(subcontractor=subcontractor, is_active=True)
        }

        # Get or create a B2B Client record for the subcontractor itself (for invoicing)
        sub_client, _ = Client.objects.get_or_create(
            organization=org,
            name=subcontractor.name,
            client_type='b2b',
            defaults={
                'phone': subcontractor.phone or '',
                'registration_source': 'external',
            }
        )

        success = []
        errors = []
        batch_total = Decimal('0')
        invoice_items_data = []  # [{description, unit_price, order_id}]

        for row in rows:
            sub_patient_id = row.get('subcontractor_patient_id')
            test_ids = row.get('test_ids', [])
            priority = row.get('priority', 'routine')
            clinical_notes = row.get('clinical_notes', '')

            if not sub_patient_id or not test_ids:
                continue

            try:
                sub_patient = SubcontractorPatient.objects.get(
                    id=sub_patient_id, subcontractor=subcontractor
                )
            except SubcontractorPatient.DoesNotExist:
                errors.append({'patient': str(sub_patient_id), 'error': 'Patient introuvable'})
                continue

            # Get or create internal Client for this subcontractor patient
            client = sub_patient.client
            if not client:
                client = Client.objects.create(
                    organization=org,
                    name=sub_patient.full_name,
                    phone=sub_patient.phone or '',
                    date_of_birth=sub_patient.date_of_birth,
                    gender=sub_patient.gender or '',
                    client_type='patient',
                    registration_source='external',
                )
                sub_patient.client = client
                # On sauvegarde directement sans passer par le save() override
                # pour éviter une boucle inutile (le client vient d'être créé)
                SubcontractorPatient.objects.filter(pk=sub_patient.pk).update(client=client)

            # Fetch tests
            tests = list(LabTest.objects.filter(id__in=test_ids, organization=org, is_active=True))
            if not tests:
                errors.append({'patient': sub_patient.full_name, 'error': 'Aucun examen valide'})
                continue

            try:
                order = LabOrder.objects.create(
                    organization=org,
                    patient=client,
                    subcontractor=subcontractor,
                    subcontractor_patient=sub_patient,
                    priority=priority,
                    clinical_notes=clinical_notes,
                    payment_method=payment_method,
                    status='sample_collected',
                    ordered_by=request.user,
                )

                row_total = Decimal('0')
                for test in tests:
                    item_price = sub_prices.get(test.id, test.price)
                    LabOrderItem.objects.create(
                        lab_order=order,
                        lab_test=test,
                        price=item_price,
                        discount=Decimal('0'),
                    )
                    row_total += item_price

                    # 1 ligne de facture par examen par patient
                    invoice_items_data.append({
                        'description': f"{sub_patient.full_name} — {test.name}",
                        'unit_price': item_price,
                        'order_id': str(order.id),
                    })

                order.total_price = row_total
                order.save(update_fields=['total_price'])
                batch_total += row_total

                success.append({
                    'patient': sub_patient.full_name,
                    'order_number': order.order_number,
                    'order_id': str(order.id),
                    'total': float(row_total),
                })

            except Exception as e:
                errors.append({'patient': sub_patient.full_name, 'error': str(e)})

        # Créer ONE batch invoice pour le sous-traitant
        batch_invoice_id = None
        if invoice_items_data:
            try:
                with transaction.atomic():
                    invoice_status = 'paid' if payment_mode == 'immediate' else 'sent'

                    batch_invoice = Invoice.objects.create(
                        organization=org,
                        client=sub_client,
                        invoice_type='healthcare_laboratory',
                        created_by=request.user,
                        title=f"Sous-traitance — {subcontractor.name} — {tz_now().strftime('%d/%m/%Y')}",
                        description=f"Dépôt d'échantillons du {tz_now().strftime('%d/%m/%Y')} — {len(success)} patient(s)",
                        due_date=tz_now().date(),
                        status=invoice_status,
                        currency='XAF',
                        payment_method=payment_method,
                        subtotal=batch_total,
                        tax_amount=Decimal('0'),
                        total_amount=batch_total,
                        is_subcontractor_invoice=True,
                        subcontractor=subcontractor,
                    )

                    for item in invoice_items_data:
                        InvoiceItem.objects.create(
                            invoice=batch_invoice,
                            description=item['description'],
                            quantity=1,
                            unit_price=item['unit_price'],
                            total_price=item['unit_price'],
                        )

                    # Lier les LabOrders à la batch_invoice
                    order_ids = [s['order_id'] for s in success]
                    LabOrder.objects.filter(id__in=order_ids).update(lab_invoice=batch_invoice)

                    # Si paiement immédiat → créer un Payment daté d'aujourd'hui
                    if payment_mode == 'immediate':
                        Payment.objects.create(
                            invoice=batch_invoice,
                            amount=batch_total,
                            payment_date=tz_now().date(),
                            payment_method=payment_method,
                            created_by=request.user,
                            status='success',
                        )

                    batch_invoice_id = str(batch_invoice.id)
            except Exception as e:
                pass  # Invoice failure doesn't block orders

        return Response({
            'success': success,
            'errors': errors,
            'batch_invoice_id': batch_invoice_id,
            'batch_total': float(batch_total),
        })

