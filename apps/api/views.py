from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Sum, Count, F
from django.db import models
from django.utils import timezone
from datetime import timedelta

from apps.suppliers.models import Supplier, SupplierCategory
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.invoicing.models import Invoice, InvoiceItem, Product
from apps.accounts.models import Client

from .serializers import (
    SupplierSerializer, SupplierCategorySerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    InvoiceSerializer, InvoiceItemSerializer,
    ProductSerializer, ClientSerializer,
    DashboardStatsSerializer
)


class SupplierCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet pour les catégories de fournisseurs"""
    queryset = SupplierCategory.objects.all()
    serializer_class = SupplierCategorySerializer
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement


class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet pour les fournisseurs"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    filterset_fields = ['status', 'province', 'is_local', 'is_active']
    search_fields = ['name', 'contact_person', 'email', 'city']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtre par catégorie
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(categories__id=category_id)
        
        # Filtre par note minimale
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(rating__gte=min_rating)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Active/Désactive un fournisseur"""
        supplier = self.get_object()
        if supplier.status == 'active':
            supplier.status = 'inactive'
        else:
            supplier.status = 'active'
        supplier.save()
        serializer = self.get_serializer(supplier)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Statistiques détaillées du fournisseur"""
        supplier = self.get_object()

        # Bons de commande du fournisseur
        purchase_orders = PurchaseOrder.objects.filter(supplier=supplier)

        # Statistiques financières
        total_spent = purchase_orders.aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        # Statistiques par statut
        po_stats = purchase_orders.values('status').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        )

        # Produits/services les plus achetés
        top_products = PurchaseOrderItem.objects.filter(
            purchase_order__supplier=supplier
        ).values('description', 'product_reference').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum('total_price'),
            order_count=Count('purchase_order', distinct=True)
        ).order_by('-total_value')[:10]

        # Activité récente (6 derniers mois)
        from datetime import datetime, timedelta
        six_months_ago = datetime.now() - timedelta(days=180)
        recent_orders = purchase_orders.filter(
            created_at__gte=six_months_ago
        ).values('created_at__month', 'created_at__year').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        ).order_by('created_at__year', 'created_at__month')

        # Performance metrics
        avg_delivery_time = None  # À implémenter si on a des données de livraison
        on_time_delivery_rate = None  # À implémenter

        return Response({
            'supplier_id': str(supplier.id),
            'supplier_name': supplier.name,
            'financial_stats': {
                'total_spent': float(total_spent),
                'total_orders': purchase_orders.count(),
                'average_order_value': float(total_spent / purchase_orders.count()) if purchase_orders.count() > 0 else 0,
            },
            'purchase_orders': {
                'recent': list(purchase_orders.order_by('-created_at')[:5].values(
                    'id', 'po_number', 'title', 'status', 'total_amount', 'created_at'
                )),
                'by_status': list(po_stats),
                'total_count': purchase_orders.count(),
            },
            'top_products': list(top_products),
            'activity_timeline': list(recent_orders),
            'performance_metrics': {
                'avg_delivery_time': avg_delivery_time,
                'on_time_delivery_rate': on_time_delivery_rate,
                'total_suppliers_rank': None,  # À implémenter
            }
        })

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export des fournisseurs en CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="suppliers.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Contact', 'Email', 'Phone', 'City', 'Status', 'Rating'])
        
        for supplier in self.get_queryset():
            writer.writerow([
                supplier.name,
                supplier.contact_person,
                supplier.email,
                supplier.phone,
                supplier.city,
                supplier.get_status_display(),
                supplier.rating
            ])
        
        return response


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet pour les produits"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    filterset_fields = ['is_active']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'unit_price', 'stock_quantity']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Produits avec stock faible"""
        products = self.get_queryset().filter(
            stock_quantity__lte=models.F('reorder_level')
        )
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet pour les clients"""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    filterset_fields = ['is_active']
    search_fields = ['name', 'email', 'contact_person']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """ViewSet pour les bons de commande"""
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    filterset_fields = ['status', 'supplier', 'created_by']
    search_fields = ['po_number', 'title', 'description']
    ordering_fields = ['created_at', 'total_amount', 'required_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtre par dates
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Ajouter un item au bon de commande"""
        purchase_order = self.get_object()
        serializer = PurchaseOrderItemSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(purchase_order=purchase_order)
            purchase_order.recalculate_totals()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver un bon de commande"""
        purchase_order = self.get_object()
        if purchase_order.status == 'draft':
            purchase_order.status = 'approved'
            purchase_order.save()
            serializer = self.get_serializer(purchase_order)
            return Response(serializer.data)
        return Response(
            {'error': 'Only draft orders can be approved'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['get'])
    def print_pdf(self, request, pk=None):
        """Générer PDF du bon de commande"""
        # À implémenter avec ReportLab
        return Response({'message': 'PDF generation not implemented yet'})


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet pour les factures"""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    filterset_fields = ['status', 'client', 'created_by']
    search_fields = ['invoice_number', 'title', 'description']
    ordering_fields = ['created_at', 'total_amount', 'due_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtre par dates
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Filtre pour factures en retard
        overdue = self.request.query_params.get('overdue')
        if overdue == 'true':
            queryset = queryset.filter(
                status='sent',
                due_date__lt=timezone.now().date()
            )
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Ajouter un item à la facture"""
        invoice = self.get_object()
        
        if not invoice.can_be_edited():
            return Response(
                {'error': 'Invoice cannot be edited in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = InvoiceItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(invoice=invoice)
            invoice.recalculate_totals()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Envoyer une facture"""
        invoice = self.get_object()
        if invoice.status == 'draft':
            invoice.status = 'sent'
            invoice.save()
            # Ici, ajouter la logique d'envoi par email
            serializer = self.get_serializer(invoice)
            return Response(serializer.data)
        return Response(
            {'error': 'Only draft invoices can be sent'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Marquer une facture comme payée"""
        invoice = self.get_object()
        if invoice.status == 'sent':
            invoice.status = 'paid'
            invoice.paid_date = timezone.now().date()
            invoice.payment_method = request.data.get('payment_method', 'other')
            invoice.payment_reference = request.data.get('payment_reference', '')
            invoice.save()
            serializer = self.get_serializer(invoice)
            return Response(serializer.data)
        return Response(
            {'error': 'Only sent invoices can be marked as paid'},
            status=status.HTTP_400_BAD_REQUEST
        )


class DashboardStatsView(APIView):
    """Vue pour les statistiques du tableau de bord"""
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    
    def get(self, request):
        # Calculer les statistiques
        stats = {
            'total_suppliers': Supplier.objects.count(),
            'active_suppliers': Supplier.objects.filter(status='active').count(),
            'total_purchase_orders': PurchaseOrder.objects.count(),
            'pending_purchase_orders': PurchaseOrder.objects.filter(
                status__in=['draft', 'pending']
            ).count(),
            'total_invoices': Invoice.objects.count(),
            'unpaid_invoices': Invoice.objects.filter(status='sent').count(),
            'total_revenue': Invoice.objects.filter(
                status='paid'
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'total_expenses': PurchaseOrder.objects.filter(
                status__in=['approved', 'sent', 'received']
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)


class RecentActivityView(APIView):
    """Vue pour l'activité récente"""
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    
    def get(self, request):
        try:
            # Derniers 7 jours
            since = timezone.now() - timedelta(days=7)
            
            recent_data = {
                'recent_suppliers': [],
                'recent_purchase_orders': [],
                'recent_invoices': [],
            }
            
            # Essayer de récupérer les données récentes
            try:
                recent_suppliers = Supplier.objects.filter(created_at__gte=since).order_by('-created_at')[:5]
                recent_data['recent_suppliers'] = SupplierSerializer(recent_suppliers, many=True).data
            except Exception as e:
                print(f"Erreur suppliers: {e}")
                recent_data['recent_suppliers'] = []
            
            try:
                recent_orders = PurchaseOrder.objects.filter(created_at__gte=since).order_by('-created_at')[:5]
                recent_data['recent_purchase_orders'] = PurchaseOrderSerializer(recent_orders, many=True).data
            except Exception as e:
                print(f"Erreur purchase orders: {e}")
                recent_data['recent_purchase_orders'] = []
            
            try:
                recent_invoices = Invoice.objects.filter(created_at__gte=since).order_by('-created_at')[:5]
                recent_data['recent_invoices'] = InvoiceSerializer(recent_invoices, many=True).data
            except Exception as e:
                print(f"Erreur invoices: {e}")
                recent_data['recent_invoices'] = []
            
            return Response(recent_data)
        except Exception as e:
            print(f"Erreur générale RecentActivityView: {e}")
            return Response({
                'recent_suppliers': [],
                'recent_purchase_orders': [],
                'recent_invoices': [],
                'error': str(e)
            }, status=500)


class AIConversationsView(APIView):
    """Vue temporaire pour les conversations IA"""
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    
    def get(self, request):
        # Retourner des données vides pour l'instant
        return Response([])


class AIQuickActionsView(APIView):
    """Vue temporaire pour les actions rapides IA"""
    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    
    def get(self, request):
        # Actions rapides temporaires
        actions = [
            {
                'id': 'create_supplier',
                'title': 'Créer un fournisseur',
                'description': 'Ajouter un nouveau fournisseur',
                'icon': 'person_add',
                'url': '/suppliers/create/'
            },
            {
                'id': 'create_purchase_order',
                'title': 'Nouveau bon de commande',
                'description': 'Créer un bon de commande',
                'icon': 'shopping_cart',
                'url': '/purchase-orders/create/'
            },
            {
                'id': 'create_invoice',
                'title': 'Nouvelle facture',
                'description': 'Créer une facture',
                'icon': 'receipt',
                'url': '/invoicing/create/'
            },
            {
                'id': 'view_dashboard',
                'title': 'Tableau de bord',
                'description': 'Voir les statistiques',
                'icon': 'dashboard',
                'url': '/'
            }
        ]
        return Response(actions)