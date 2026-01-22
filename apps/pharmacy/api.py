"""
API Views for Pharmacy app
"""
from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from decimal import Decimal

from apps.accounts.models import Client
from apps.patients.models import PatientVisit
from apps.invoicing.models import Product, ProductCategory
from .models import PharmacyDispensing, DispensingItem
from .serializers import (
    PharmacyDispensingSerializer,
    PharmacyDispensingListSerializer,
    DispensingItemSerializer,
    DispensingCreateSerializer,
    MedicationSerializer,
    StockCheckSerializer,
    StockCheckResultSerializer,
)


# =============================================================================
# Dispensing Views
# =============================================================================

class DispensingListView(generics.ListAPIView):
    """List all dispensings with filtering"""
    serializer_class = PharmacyDispensingListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'patient']
    ordering_fields = ['dispensed_at', 'created_at']
    ordering = ['-dispensed_at']
    
    def get_queryset(self):
        queryset = PharmacyDispensing.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient').prefetch_related('items')
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(dispensed_at__date=date)
        
        # Today only
        today_only = self.request.query_params.get('today', 'false')
        if today_only.lower() == 'true':
            queryset = queryset.filter(dispensed_at__date=timezone.now().date())
        
        return queryset


class DispensingDetailView(generics.RetrieveAPIView):
    """Retrieve a single dispensing with all items"""
    serializer_class = PharmacyDispensingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PharmacyDispensing.objects.filter(
            organization=self.request.user.organization
        ).select_related('patient', 'dispensed_by').prefetch_related('items__medication')


class DispensingCreateView(APIView):
    """Create a new dispensing with items"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = DispensingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get patient if provided
        patient = None
        if data.get('patient_id'):
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
        
        # Check stock availability for all items
        stock_issues = []
        for item_data in data['items']:
            try:
                medication = Product.objects.get(
                    id=item_data['medication_id'],
                    organization=request.user.organization,
                    is_active=True
                )
                if medication.product_type == 'physical':
                    if medication.stock_quantity < item_data['quantity']:
                        stock_issues.append({
                            'medication': medication.name,
                            'needed': item_data['quantity'],
                            'available': medication.stock_quantity,
                        })
            except Product.DoesNotExist:
                return Response(
                    {'error': f'Medication not found: {item_data["medication_id"]}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if stock_issues:
            return Response(
                {
                    'error': 'Insufficient stock',
                    'details': stock_issues
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create dispensing
        dispensing = PharmacyDispensing.objects.create(
            organization=request.user.organization,
            patient=patient,
            visit=visit,
            dispensed_by=request.user,
            counseling_provided=data.get('counseling_provided', False),
            counseling_notes=data.get('counseling_notes', ''),
            notes=data.get('notes', ''),
            status='dispensed',  # Mark as dispensed immediately
        )
        
        # Create dispensing items
        for item_data in data['items']:
            medication = Product.objects.get(id=item_data['medication_id'])
            
            DispensingItem.objects.create(
                dispensing=dispensing,
                medication=medication,
                quantity_dispensed=item_data['quantity'],
                unit_cost=medication.cost_price,
                unit_price=medication.price,
                dosage_instructions=item_data.get('dosage_instructions', ''),
                frequency=item_data.get('frequency', ''),
                duration=item_data.get('duration', ''),
                route=item_data.get('route', ''),
                notes=item_data.get('notes', ''),
            )
        
        # Update visit status if linked
        if visit:
            visit.status = 'at_pharmacy'
            visit.save()
        
        # Auto-create invoice for dispensing
        try:
            from apps.invoicing.models import Invoice, InvoiceItem
            from django.utils import timezone
            from datetime import timedelta
            
            # Prepare invoice title
            patient_name = patient.name if patient else "Vente comptoir"
            invoice_title = f"Dispensation {dispensing.dispensing_number} - {patient_name}"
            
            # Create invoice
            invoice = Invoice.objects.create(
                created_by=request.user,
                client=patient,
                title=invoice_title,
                description=f"Dispensation pharmacie #{dispensing.dispensing_number}",
                due_date=timezone.now().date() + timedelta(days=30),
                subtotal=0,
                total_amount=0,
                status='paid' if not patient else 'draft',  # Walk-in = paid immediately
                currency='XAF',
            )
            
            # Add invoice items from dispensing items
            for item in dispensing.items.all():
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=item.medication,
                    service_code=item.medication.reference or 'MED',
                    description=item.medication.name,
                    quantity=item.quantity_dispensed,
                    unit_price=item.unit_price,
                    total_price=item.total_price,
                )
            
            # Recalculate invoice totals
            invoice.recalculate_totals()
            
            # Link invoice to dispensing
            dispensing.pharmacy_invoice = invoice
            dispensing.save(update_fields=['pharmacy_invoice'])
            
        except Exception as e:
            # Don't fail the dispensing if invoice creation fails
            print(f"Error creating pharmacy invoice: {e}")
        
        return Response(
            PharmacyDispensingSerializer(dispensing).data,
            status=status.HTTP_201_CREATED
        )


class DispensingCancelView(APIView):
    """Cancel a dispensing and restore stock"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            dispensing = PharmacyDispensing.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except PharmacyDispensing.DoesNotExist:
            return Response(
                {'error': 'Dispensing not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if dispensing.status == 'cancelled':
            return Response(
                {'error': 'Dispensing already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        dispensing.cancel_dispensing(reason=reason)
        
        return Response(PharmacyDispensingSerializer(dispensing).data)


# =============================================================================
# Medication Views
# =============================================================================

class MedicationListView(generics.ListAPIView):
    """List all medications (Products with Medications category)"""
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'reference', 'barcode', 'description']
    ordering_fields = ['name', 'reference', 'stock_quantity', 'price']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = Product.objects.filter(
            organization=self.request.user.organization,
            is_active=True,
            product_type='physical',
        )
        
        # Filter by relevant categories: medications and lab consumables
        # We also check for 'medicaments' slug for backward compatibility
        relevant_slugs = ['medications', 'medicaments', 'lab-consumables']
        queryset = queryset.filter(category__slug__in=relevant_slugs)
        
        # Filter by stock status
        stock_status = self.request.query_params.get('stock_status')
        if stock_status == 'low':
            queryset = queryset.filter(stock_quantity__lte=models.F('low_stock_threshold'))
        elif stock_status == 'out':
            queryset = queryset.filter(stock_quantity=0)
        elif stock_status == 'available':
            queryset = queryset.filter(stock_quantity__gt=0)
        
        return queryset


class MedicationDetailView(generics.RetrieveAPIView):
    """Retrieve a single medication (Product) detail"""
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Product.objects.filter(
            organization=self.request.user.organization,
            is_active=True,
            product_type='physical',  # Medications are physical products
        )
        
        # Filter by medication category if it exists
        try:
            med_category = ProductCategory.objects.get(
                organization=self.request.user.organization,
                slug='medications'
            )
            queryset = queryset.filter(category=med_category)
        except ProductCategory.DoesNotExist:
            pass
        
        return queryset


class MedicationSearchView(APIView):
    """Quick search for medications"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response({'results': []})
        
        medications = Product.objects.filter(
            organization=request.user.organization,
            is_active=True,
            product_type='physical',
        ).filter(
            Q(name__icontains=query) |
            Q(reference__icontains=query) |
            Q(barcode__icontains=query)
        )[:15]
        
        serializer = MedicationSerializer(medications, many=True)
        return Response({'results': serializer.data})


class StockCheckView(APIView):
    """Check stock availability for multiple medications"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        items = request.data.get('items', [])
        results = []
        all_available = True
        
        for item in items:
            try:
                medication = Product.objects.get(
                    id=item.get('medication_id'),
                    organization=request.user.organization,
                )
                
                quantity_needed = item.get('quantity_needed', 1)
                current_stock = medication.stock_quantity
                is_available = current_stock >= quantity_needed
                shortage = max(0, quantity_needed - current_stock)
                
                if not is_available:
                    all_available = False
                
                results.append({
                    'medication_id': str(medication.id),
                    'medication_name': medication.name,
                    'quantity_needed': quantity_needed,
                    'current_stock': current_stock,
                    'is_available': is_available,
                    'shortage': shortage,
                })
                
            except Product.DoesNotExist:
                results.append({
                    'medication_id': item.get('medication_id'),
                    'error': 'Medication not found',
                    'is_available': False,
                })
                all_available = False
        
        return Response({
            'all_available': all_available,
            'results': results
        })


class LowStockMedicationsView(APIView):
    """Get list of medications with low stock"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get all products below their threshold
        low_stock = Product.objects.filter(
            organization=request.user.organization,
            is_active=True,
            product_type='physical',
            stock_quantity__lte=models.F('low_stock_threshold')
        ).order_by('stock_quantity')
        
        out_of_stock = low_stock.filter(stock_quantity=0)
        critical = low_stock.exclude(stock_quantity=0)
        
        return Response({
            'total_low_stock': low_stock.count(),
            'out_of_stock_count': out_of_stock.count(),
            'critical_count': critical.count(),
            'out_of_stock': MedicationSerializer(out_of_stock, many=True).data,
            'critical_stock': MedicationSerializer(critical, many=True).data,
        })


# =============================================================================
# Dashboard Views
# =============================================================================

class TodayDispensingView(APIView):
    """Get today's dispensing summary"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        dispensings = PharmacyDispensing.objects.filter(
            organization=request.user.organization,
            dispensed_at__date=today
        ).prefetch_related('items')
        
        # Calculate totals
        total_revenue = Decimal('0')
        total_items = 0
        for d in dispensings:
            total_revenue += d.total_amount
            total_items += d.items_count
        
        return Response({
            'total_dispensings': dispensings.count(),
            'total_items': total_items,
            'total_revenue': str(total_revenue),
            'dispensed': dispensings.filter(status='dispensed').count(),
            'pending': dispensings.filter(status='pending').count(),
            'cancelled': dispensings.filter(status='cancelled').count(),
            'recent': PharmacyDispensingListSerializer(
                dispensings.order_by('-dispensed_at')[:10],
                many=True
            ).data,
        })


class PatientPharmacyHistoryView(APIView):
    """Get pharmacy history for a patient"""
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
        
        dispensings = PharmacyDispensing.objects.filter(
            patient=patient
        ).order_by('-dispensed_at').prefetch_related('items__medication')
        
        return Response({
            'patient_id': str(patient.id),
            'patient_name': patient.name,
            'total_dispensings': dispensings.count(),
            'dispensings': PharmacyDispensingSerializer(dispensings, many=True).data,
        })


class DispensingPDFView(APIView):
    """Generate PDF receipt for a dispensing"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        from django.http import HttpResponse
        from .services import PharmacyPDFGenerator
        
        try:
            dispensing = PharmacyDispensing.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except PharmacyDispensing.DoesNotExist:
            return Response(
                {'error': 'Dispensing not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        service = PharmacyPDFGenerator()
        try:
            pdf_buffer = service.generate_dispensing_pdf(
                dispensing,
                template_type=request.query_params.get('template', 'receipt'),
                language=request.query_params.get('lang', 'fr')
            )
            
            patient_name = dispensing.patient.name if dispensing.patient else 'VenteComptoir'
            filename = f"dispensation_{dispensing.dispensing_number}_{patient_name}.pdf"
            
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            
            if request.query_params.get('download', 'true') == 'false':
                response['Content-Disposition'] = f'inline; filename="{filename}"'
            else:
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'PDF Generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GeneratePharmacyInvoiceView(APIView):
    """Generate invoice for pharmacy dispensing (manual trigger)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from apps.healthcare.invoice_services import PharmacyInvoiceService

        try:
            dispensing = PharmacyDispensing.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except PharmacyDispensing.DoesNotExist:
            return Response(
                {'error': 'Dispensing not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            invoice = PharmacyInvoiceService.generate_invoice(dispensing)
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

