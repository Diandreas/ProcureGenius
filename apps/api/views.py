from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Sum, Count, F
from django.db import models
from django.utils import timezone
from datetime import timedelta

from apps.suppliers.models import Supplier, SupplierCategory, SupplierProduct
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.invoicing.models import Invoice, InvoiceItem, Product, ProductCategory, Warehouse
from apps.accounts.models import Client
from apps.core.permissions import HasModuleAccess
from apps.core.modules import Modules
from apps.core.organization_mixin import OrganizationFilterMixin, OrganizationClientFilterMixin

from .serializers import (
    SupplierSerializer, SupplierCategorySerializer, SupplierProductSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    InvoiceSerializer, InvoiceItemSerializer,
    ProductSerializer, ClientSerializer,
    ProductCategorySerializer, WarehouseSerializer,
    DashboardStatsSerializer
)


class SupplierCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet pour les catégories de fournisseurs"""
    queryset = SupplierCategory.objects.all()
    serializer_class = SupplierCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.SUPPLIERS
    # NOTE: SupplierCategory is a global model shared across organizations
    # No organization filter needed


class SupplierViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les fournisseurs"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.SUPPLIERS
    organization_field = 'organization'
    filterset_fields = ['status', 'province', 'is_local', 'is_active']
    search_fields = ['name', 'contact_person', 'email', 'city']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        # First apply organization filter
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


class SupplierProductViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les relations Fournisseur-Produit"""
    queryset = SupplierProduct.objects.all()
    serializer_class = SupplierProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.SUPPLIERS
    organization_field = 'supplier__organization'
    filterset_fields = ['supplier', 'product', 'is_preferred', 'is_active']
    search_fields = ['supplier__name', 'product__name', 'supplier_reference']
    ordering_fields = ['created_at', 'supplier_price', 'lead_time_days']
    ordering = ['-is_preferred', 'supplier__name']

    def get_queryset(self):
        # First apply organization filter
        queryset = super().get_queryset()

        # Filtre par fournisseur
        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Filtre par produit
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        return queryset.select_related('supplier', 'product')

    @action(detail=False, methods=['get'])
    def by_supplier(self, request):
        """Liste des produits d'un fournisseur spécifique"""
        supplier_id = request.query_params.get('supplier_id')
        if not supplier_id:
            return Response(
                {'error': 'supplier_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        supplier_products = self.get_queryset().filter(supplier_id=supplier_id)
        serializer = self.get_serializer(supplier_products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Liste des fournisseurs d'un produit spécifique"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product_suppliers = self.get_queryset().filter(product_id=product_id)
        serializer = self.get_serializer(product_suppliers, many=True)
        return Response(serializer.data)


class ProductViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les produits"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.PRODUCTS
    organization_field = 'organization'  # Product has organization FK
    filterset_fields = ['is_active', 'product_type']
    search_fields = ['name', 'reference', 'description']
    ordering_fields = ['name', 'price', 'stock_quantity']
    ordering = ['name']

    def get_queryset(self):
        # First apply organization filter
        queryset = super().get_queryset()

        # Filtre par fournisseur (via la relation SupplierProduct)
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_products__supplier_id=supplier_id).distinct()

        # Filtre par statut de stock
        stock_status = self.request.query_params.get('stock_status')
        if stock_status == 'out_of_stock':
            queryset = queryset.filter(product_type='physical', stock_quantity=0)
        elif stock_status == 'low_stock':
            queryset = queryset.filter(
                product_type='physical',
                stock_quantity__gt=0,
                stock_quantity__lte=F('low_stock_threshold')
            )
        elif stock_status == 'ok':
            queryset = queryset.filter(
                product_type='physical',
                stock_quantity__gt=F('low_stock_threshold')
            )

        return queryset

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Produits avec stock faible"""
        products = self.get_queryset().filter(
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold')
        )
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stock_movements(self, request, pk=None):
        """Historique des mouvements de stock pour un produit"""
        from apps.invoicing.models import StockMovement
        from .serializers import StockMovementSerializer

        product = self.get_object()
        movements = StockMovement.objects.filter(product=product).order_by('-created_at')

        # Pagination
        page = self.paginate_queryset(movements)
        if page is not None:
            serializer = StockMovementSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Ajustement manuel du stock"""
        product = self.get_object()

        if product.product_type != 'physical':
            return Response(
                {'error': 'Seuls les produits physiques ont un stock'},
                status=status.HTTP_400_BAD_REQUEST
            )

        quantity = request.data.get('quantity')
        notes = request.data.get('notes', '')

        if quantity is None:
            return Response(
                {'error': 'La quantité est requise'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quantity = int(quantity)
        except ValueError:
            return Response(
                {'error': 'Quantité invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ajuster le stock
        movement = product.adjust_stock(
            quantity=quantity,
            movement_type='adjustment',
            reference_type='manual',
            notes=notes,
            user=request.user if request.user.is_authenticated else None
        )

        from .serializers import StockMovementSerializer
        return Response({
            'product': self.get_serializer(product).data,
            'movement': StockMovementSerializer(movement).data
        })

    @action(detail=True, methods=['post'])
    def report_loss(self, request, pk=None):
        """Déclarer une perte de stock avec raison détaillée"""
        product = self.get_object()

        if product.product_type != 'physical':
            return Response(
                {'error': 'Seuls les produits physiques peuvent avoir des pertes'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.invoicing.models import StockMovement

        # Validation des données
        quantity = request.data.get('quantity')
        loss_reason = request.data.get('loss_reason')
        loss_description = request.data.get('loss_description', '')
        notes = request.data.get('notes', '')

        if not quantity:
            return Response({'error': 'La quantité est requise'}, status=status.HTTP_400_BAD_REQUEST)

        if not loss_reason:
            return Response({'error': 'La raison de la perte est requise'}, status=status.HTTP_400_BAD_REQUEST)

        if loss_reason not in dict(StockMovement.LOSS_REASONS):
            return Response({'error': 'Raison de perte invalide'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity_lost = abs(int(quantity))
        except ValueError:
            return Response({'error': 'Quantité invalide'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculer la valeur de la perte
        loss_value = product.cost_price * quantity_lost if product.cost_price else 0

        # Créer le mouvement de perte
        old_quantity = product.stock_quantity
        product.stock_quantity -= quantity_lost
        product.save(update_fields=['stock_quantity'])

        movement = StockMovement.objects.create(
            product=product,
            movement_type='loss',
            quantity=-quantity_lost,
            quantity_before=old_quantity,
            quantity_after=product.stock_quantity,
            reference_type='loss_report',
            loss_reason=loss_reason,
            loss_description=loss_description,
            loss_value=loss_value,
            notes=notes,
            created_by=request.user if request.user.is_authenticated else None
        )

        # Vérifier et envoyer alertes si nécessaire
        from apps.invoicing.stock_alerts import check_stock_after_movement
        check_stock_after_movement(product)

        from .serializers import StockMovementSerializer
        return Response({
            'product': self.get_serializer(product).data,
            'movement': StockMovementSerializer(movement).data,
            'loss_value': float(loss_value)
        })

    @action(detail=False, methods=['get'])
    def stock_alerts(self, request):
        """Liste des produits nécessitant une attention (stock bas/rupture)"""
        from apps.invoicing.stock_alerts import StockAlertService

        low_stock = StockAlertService.check_low_stock_products()
        out_of_stock = StockAlertService.get_out_of_stock_products()

        return Response({
            'low_stock': self.get_serializer(low_stock, many=True).data,
            'out_of_stock': self.get_serializer(out_of_stock, many=True).data,
            'low_stock_count': len(low_stock),
            'out_of_stock_count': len(out_of_stock)
        })
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Statistiques complètes inter-modules pour un produit"""
        product = self.get_object()
        from django.db.models import Sum, Count, Avg, Min, Max
        from datetime import timedelta
        from django.utils import timezone
        
        # Stats ventes (InvoiceItems)
        invoice_items = product.invoice_items.all()
        invoices = invoice_items.values('invoice').distinct()
        
        total_sales = invoice_items.aggregate(
            total_quantity=Sum('quantity'),
            total_amount=Sum('total_price')
        )
        
        # Top clients - Reformater pour le frontend
        top_clients_qs = invoice_items.filter(
            invoice__client__isnull=False
        ).values(
            'invoice__client__id',
            'invoice__client__name',
            'invoice__client__email'
        ).annotate(
            total_purchases=Sum('total_price'),
            purchase_count=Count('invoice', distinct=True),
            total_quantity=Sum('quantity')
        ).order_by('-total_purchases')[:10]
        
        # Convertir au format attendu par le frontend
        top_clients = [{
            'invoice__client__id': str(item['invoice__client__id']),
            'invoice__client__name': item['invoice__client__name'],
            'invoice__client__email': item['invoice__client__email'] or '',
            'total_purchases': float(item['total_purchases']) if item['total_purchases'] else 0,
            'purchase_count': item['purchase_count'],
            'total_quantity': item['total_quantity']
        } for item in top_clients_qs]
        
        # Factures récentes avec clients
        recent_invoices = invoice_items.select_related('invoice', 'invoice__client').order_by('-created_at')[:10]
        recent_invoices_data = []
        for item in recent_invoices:
            # Récupérer le nom du client avec fallback
            client_name = 'Aucun client'
            if item.invoice.client:
                client_name = item.invoice.client.name or 'Client sans nom'
            
            recent_invoices_data.append({
                'invoice_id': str(item.invoice.id),
                'invoice_number': item.invoice.invoice_number,
                'client_name': client_name,
                'created_at': item.invoice.created_at,
                'quantity': item.quantity,
                'total_price': float(item.total_price)
            })
        
        # Stats achats (PurchaseOrderItems)
        po_items = product.purchase_order_items.all()
        purchase_stats = po_items.aggregate(
            total_pos=Count('purchase_order', distinct=True),
            total_quantity=Sum('quantity'),
            avg_price=Avg('unit_price')
        )
        
        # Stats contrats
        contract_items = product.contract_items.filter(contract__status='active')
        contract_stats = contract_items.aggregate(
            active_contracts=Count('contract', distinct=True),
            min_price=Min('contracted_price'),
            max_price=Max('contracted_price')
        )
        
        # Stats e-sourcing
        bid_items = product.bid_items.all()
        sourcing_stats = {
            'total_bids': bid_items.count(),
            'awarded_bids': bid_items.filter(bid__status='awarded').count()
        }
        
        # Tendance (30 derniers jours vs 30 jours précédents)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        sixty_days_ago = timezone.now() - timedelta(days=60)
        
        recent_sales = invoice_items.filter(created_at__gte=thirty_days_ago).aggregate(
            total=Sum('total_price')
        )['total'] or 0
        
        previous_sales = invoice_items.filter(
            created_at__gte=sixty_days_ago,
            created_at__lt=thirty_days_ago
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        trend = ((recent_sales - previous_sales) / previous_sales * 100) if previous_sales > 0 else 0
        
        return Response({
            'product_id': str(product.id),
            'product_name': product.name,
            'product_reference': product.reference,
            
            'sales_summary': {
                'total_invoices': invoices.count(),
                'total_quantity_sold': int(total_sales['total_quantity'] or 0),
                'total_sales_amount': float(total_sales['total_amount'] or 0),
                'average_sale': float(total_sales['total_amount'] / invoices.count()) if invoices.count() > 0 else 0,
                'unique_clients': invoice_items.values('invoice__client').distinct().count(),
            },
            
            'purchase_summary': {
                'total_purchase_orders': purchase_stats['total_pos'] or 0,
                'total_quantity_purchased': int(purchase_stats['total_quantity'] or 0),
                'average_purchase_price': float(purchase_stats['avg_price'] or 0),
            },
            
            'contract_summary': {
                'active_contracts': contract_stats['active_contracts'] or 0,
                'contracted_price_min': float(contract_stats['min_price'] or 0),
                'contracted_price_max': float(contract_stats['max_price'] or 0),
            },
            
            'sourcing_summary': sourcing_stats,
            
            'warehouse_info': {
                'warehouse_id': str(product.warehouse.id) if product.warehouse else None,
                'warehouse_name': product.warehouse.name if product.warehouse else None,
                'warehouse_code': product.warehouse.code if product.warehouse else None,
                'location': f"{product.warehouse.city}, {product.warehouse.province}" if product.warehouse else None,
                'current_stock': product.stock_quantity,
                'stock_status': product.stock_status,
            },
            
            'top_clients': list(top_clients),
            'recent_invoices': recent_invoices_data,
            
            'sales_trend': {
                'last_30_days': float(recent_sales),
                'previous_30_days': float(previous_sales),
                'trend_percent': round(trend, 2),
            },
            
            'stock_movements_count': product.stock_movements.count(),
        })


class ClientViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les clients"""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.CLIENTS
    organization_field = 'organization'  # Client has organization FK
    filterset_fields = ['is_active']
    search_fields = ['name', 'email', 'contact_person']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Statistiques complètes pour un client"""
        client = self.get_object()
        from django.db.models import Sum, Count, Avg
        from datetime import timedelta
        from django.utils import timezone
        
        # Stats factures
        invoices = client.invoices.all()
        
        invoice_stats = {
            'draft': invoices.filter(status='draft').count(),
            'sent': invoices.filter(status='sent').count(),
            'paid': invoices.filter(status='paid').count(),
            'overdue': invoices.filter(status='overdue').count(),
            'cancelled': invoices.filter(status='cancelled').count(),
        }
        
        # Montants
        total_sales = invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_paid = invoices.filter(status='paid').aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_outstanding = invoices.filter(status__in=['sent', 'overdue']).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        # Produits les plus achetés (avec gestion FK product ou champs texte)
        from apps.invoicing.models import InvoiceItem
        
        # Récupérer tous les items du client
        all_items = InvoiceItem.objects.filter(
            invoice__client=client
        ).select_related('product').order_by('-total_price')
        
        # Construire manuellement la liste avec fallbacks
        products_dict = {}
        
        for item in all_items:
            # Identifier le produit par son ID FK s'il existe, sinon par product_reference
            if item.product_id:
                product_key = str(item.product_id)
                product_name = item.product.name
                product_ref = item.product.reference
            else:
                # Pas de FK, utiliser les champs texte
                product_key = f"manual_{item.product_reference}_{item.description[:20]}"
                product_name = item.description or 'Produit sans nom'
                product_ref = item.product_reference or 'N/A'
            
            # Agréger les quantités pour le même produit
            if product_key in products_dict:
                products_dict[product_key]['total_quantity'] += item.quantity
                products_dict[product_key]['total_amount'] += float(item.total_price)
                products_dict[product_key]['purchase_count'] += 1
            else:
                products_dict[product_key] = {
                    'product__id': str(item.product_id) if item.product_id else None,
                    'product__name': product_name,
                    'product__reference': product_ref,
                    'total_quantity': item.quantity,
                    'total_amount': float(item.total_price),
                    'purchase_count': 1
                }
        
        # Convertir en liste et trier par montant total
        top_products = sorted(
            products_dict.values(),
            key=lambda x: x['total_amount'],
            reverse=True
        )[:10]
        
        # Factures récentes
        recent_invoices = invoices.order_by('-created_at')[:10]
        recent_invoices_data = [{
            'id': str(inv.id),
            'invoice_number': inv.invoice_number,
            'title': inv.title,
            'status': inv.status,
            'total_amount': float(inv.total_amount),
            'created_at': inv.created_at,
            'due_date': inv.due_date,
        } for inv in recent_invoices]
        
        # Tendance (30 derniers jours)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        sixty_days_ago = timezone.now() - timedelta(days=60)
        
        recent_sales = invoices.filter(created_at__gte=thirty_days_ago).aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        previous_sales = invoices.filter(
            created_at__gte=sixty_days_ago,
            created_at__lt=thirty_days_ago
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        trend = ((recent_sales - previous_sales) / previous_sales * 100) if previous_sales > 0 else 0
        
        return Response({
            'client_id': str(client.id),
            'client_name': client.name,
            
            'invoice_summary': {
                'total_invoices': invoices.count(),
                'total_sales_amount': float(total_sales),
                'total_paid_amount': float(total_paid),
                'total_outstanding': float(total_outstanding),
                'average_invoice_amount': float(total_sales / invoices.count()) if invoices.count() > 0 else 0,
            },
            
            'invoice_status_breakdown': invoice_stats,
            
            'top_products': list(top_products),
            'recent_invoices': recent_invoices_data,
            
            'sales_trend': {
                'last_30_days': float(recent_sales),
                'previous_30_days': float(previous_sales),
                'trend_percent': round(trend, 2),
            },
            
            'payment_info': {
                'payment_terms': client.payment_terms,
                'tax_id': client.tax_id,
            },
        })


class PurchaseOrderViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les bons de commande"""
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.PURCHASE_ORDERS
    organization_field = 'created_by__organization'  # Filter via user's org
    filterset_fields = ['status', 'supplier', 'created_by']
    search_fields = ['po_number', 'title', 'description']
    ordering_fields = ['created_at', 'total_amount', 'required_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # First apply organization filter
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
            purchase_order.approved_by = request.user if request.user.is_authenticated else None
            purchase_order.save()
            serializer = self.get_serializer(purchase_order)
            return Response(serializer.data)
        return Response(
            {'error': 'Only draft orders can be approved'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Marquer le bon de commande comme reçu et mettre à jour le stock"""
        purchase_order = self.get_object()

        if purchase_order.status == 'received':
            return Response(
                {'error': 'Ce bon de commande a déjà été reçu'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Recevoir les items et mettre à jour le stock
        result = purchase_order.receive_items(
            user=request.user if request.user.is_authenticated else None
        )

        if 'error' in result:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(purchase_order)
        return Response({
            'purchase_order': serializer.data,
            'stock_update': result
        })

    @action(detail=True, methods=['get'])
    def print_pdf(self, request, pk=None):
        """Générer PDF du bon de commande"""
        # À implémenter avec ReportLab
        return Response({'message': 'PDF generation not implemented yet'})


class InvoiceViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les factures"""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.INVOICES
    organization_field = 'created_by__organization'  # Filter via user's org
    filterset_fields = ['status', 'client', 'created_by']
    search_fields = ['invoice_number', 'title', 'description']
    ordering_fields = ['created_at', 'total_amount', 'due_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # First apply organization filter
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
        """Envoyer une facture par email"""
        invoice = self.get_object()

        if invoice.status != 'draft':
            return Response(
                {'error': 'Seules les factures en brouillon peuvent être envoyées'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Email du destinataire (par défaut: client, sinon fourni dans la requête)
        recipient_email = request.data.get('email')
        template_type = request.data.get('template', 'classic')

        # Envoyer l'email avec le PDF
        from .services.email_service import InvoiceEmailService

        result = InvoiceEmailService.send_invoice_email(
            invoice=invoice,
            recipient_email=recipient_email,
            template_type=template_type
        )

        if result['success']:
            # Marquer la facture comme envoyée
            invoice.status = 'sent'
            invoice.sent_date = timezone.now().date()
            invoice.save()

            serializer = self.get_serializer(invoice)
            return Response({
                'invoice': serializer.data,
                'message': result['message']
            })
        else:
            return Response(
                {'error': result['message']},
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
    
    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        """Générer un PDF de la facture avec WeasyPrint (HTML/CSS)"""
        try:
            from django.http import HttpResponse

            invoice = self.get_object()
            template_type = request.query_params.get('template', 'classic')

            # Essayer WeasyPrint (HTML/CSS) d'abord
            try:
                from .services.pdf_generator_weasy import generate_invoice_pdf_weasy
                pdf_buffer = generate_invoice_pdf_weasy(invoice, template_type)
                print(f"✓ PDF généré avec WeasyPrint (template: {template_type})")
            except Exception as weasy_error:
                # Fallback sur ReportLab si WeasyPrint échoue
                print(f"⚠ WeasyPrint erreur: {weasy_error}, utilisation de ReportLab fallback")
                from .services.pdf_generator import generate_invoice_pdf
                pdf_buffer = generate_invoice_pdf(invoice, template_type)
                print(f"✓ PDF généré avec ReportLab fallback (template: {template_type})")

            # Créer la réponse HTTP avec le PDF
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )

            # Définir les en-têtes pour le téléchargement
            filename = f"facture-{invoice.invoice_number}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(response.content)

            return response

        except ImportError as e:
            return Response(
                {'error': 'PDF generation service not available', 'details': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='create')
    def create_invoice(self, request):
        """Create invoice endpoint for frontend compatibility"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardStatsView(APIView):
    """Vue pour les statistiques du tableau de bord"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.core.modules import get_user_accessible_modules
        from datetime import datetime

        # Get user's organization
        user = request.user
        organization = getattr(user, 'organization', None)

        if not organization:
            return Response({
                'enabled_modules': [],
                'error': 'No organization assigned to user'
            }, status=status.HTTP_403_FORBIDDEN)

        # Récupérer les modules accessibles par l'utilisateur
        user_modules = get_user_accessible_modules(user)

        # Initialiser les stats
        stats = {
            'enabled_modules': user_modules,
        }

        # Stats Fournisseurs (si module actif) - FILTERED BY ORGANIZATION
        if Modules.SUPPLIERS in user_modules:
            suppliers = Supplier.objects.filter(organization=organization)
            stats['total_suppliers'] = suppliers.count()
            stats['active_suppliers'] = suppliers.filter(status='active').count()
            stats['inactive_suppliers'] = suppliers.filter(status='inactive').count()
            stats['suppliers_by_rating'] = {
                '5_stars': suppliers.filter(rating=5).count(),
                '4_stars': suppliers.filter(rating=4).count(),
                '3_stars': suppliers.filter(rating=3).count(),
                'below_3': suppliers.filter(rating__lt=3).count(),
            }

        # Stats Bons de commande (si module actif) - FILTERED BY ORGANIZATION
        if Modules.PURCHASE_ORDERS in user_modules:
            purchase_orders = PurchaseOrder.objects.filter(created_by__organization=organization)
            stats['total_purchase_orders'] = purchase_orders.count()
            stats['pending_purchase_orders'] = purchase_orders.filter(
                status__in=['draft', 'pending']
            ).count()
            stats['approved_purchase_orders'] = purchase_orders.filter(status='approved').count()
            stats['received_purchase_orders'] = purchase_orders.filter(status='received').count()
            stats['total_expenses'] = purchase_orders.filter(
                status__in=['approved', 'sent', 'received']
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # Stats Factures (si module actif) - FILTERED BY ORGANIZATION
        if Modules.INVOICES in user_modules:
            invoices = Invoice.objects.filter(created_by__organization=organization)
            stats['total_invoices'] = invoices.count()
            stats['unpaid_invoices'] = invoices.filter(status='sent').count()
            stats['paid_invoices'] = invoices.filter(status='paid').count()
            stats['overdue_invoices'] = invoices.filter(status='overdue').count()
            stats['draft_invoices'] = invoices.filter(status='draft').count()
            stats['total_revenue'] = invoices.filter(
                status='paid'
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            stats['pending_revenue'] = invoices.filter(
                status='sent'
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # Stats Produits (si module actif) - FILTERED BY ORGANIZATION
        if Modules.PRODUCTS in user_modules:
            products = Product.objects.filter(organization=organization)
            stats['total_products'] = products.count()
            stats['active_products'] = products.filter(is_active=True).count()
            stats['low_stock_products'] = products.filter(
                product_type='physical',
                stock_quantity__lte=F('low_stock_threshold')
            ).count()
            stats['out_of_stock_products'] = products.filter(
                product_type='physical',
                stock_quantity=0
            ).count()
            stats['total_stock_value'] = products.filter(
                product_type='physical'
            ).aggregate(
                total=Sum(F('stock_quantity') * F('cost_price'))
            )['total'] or 0

        # Stats Clients (si module actif) - FILTERED BY ORGANIZATION
        if Modules.CLIENTS in user_modules:
            clients = Client.objects.filter(organization=organization)
            stats['total_clients'] = clients.count()
            stats['active_clients'] = clients.filter(is_active=True).count()
            # Clients avec au moins une facture payée dans les 3 derniers mois
            three_months_ago = timezone.now() - timedelta(days=90)
            stats['recent_active_clients'] = clients.filter(
                invoices__status='paid',
                invoices__paid_date__gte=three_months_ago
            ).distinct().count()

        # Stats de performance globale
        if Modules.INVOICES in user_modules and Modules.PURCHASE_ORDERS in user_modules:
            revenue = stats.get('total_revenue', 0)
            expenses = stats.get('total_expenses', 0)
            stats['net_profit'] = revenue - expenses
            stats['profit_margin'] = ((revenue - expenses) / revenue * 100) if revenue > 0 else 0

        # Tendances (30 derniers jours)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        sixty_days_ago = timezone.now() - timedelta(days=60)

        if Modules.INVOICES in user_modules:
            invoices = Invoice.objects.filter(created_by__organization=organization)
            recent_invoices_count = invoices.filter(created_at__gte=thirty_days_ago).count()
            previous_invoices_count = invoices.filter(
                created_at__gte=sixty_days_ago,
                created_at__lt=thirty_days_ago
            ).count()
            stats['invoices_trend'] = {
                'current': recent_invoices_count,
                'previous': previous_invoices_count,
                'percent_change': ((recent_invoices_count - previous_invoices_count) / previous_invoices_count * 100) if previous_invoices_count > 0 else 0
            }

        if Modules.PURCHASE_ORDERS in user_modules:
            purchase_orders = PurchaseOrder.objects.filter(created_by__organization=organization)
            recent_po_count = purchase_orders.filter(created_at__gte=thirty_days_ago).count()
            previous_po_count = purchase_orders.filter(
                created_at__gte=sixty_days_ago,
                created_at__lt=thirty_days_ago
            ).count()
            stats['purchase_orders_trend'] = {
                'current': recent_po_count,
                'previous': previous_po_count,
                'percent_change': ((recent_po_count - previous_po_count) / previous_po_count * 100) if previous_po_count > 0 else 0
            }

        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)


class RecentActivityView(APIView):
    """Vue pour l'activité récente"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            # Get user's organization
            user = request.user
            organization = getattr(user, 'organization', None)

            if not organization:
                return Response({
                    'recent_suppliers': [],
                    'recent_purchase_orders': [],
                    'recent_invoices': [],
                    'error': 'No organization assigned to user'
                }, status=status.HTTP_403_FORBIDDEN)

            # Derniers 7 jours
            since = timezone.now() - timedelta(days=7)

            recent_data = {
                'recent_suppliers': [],
                'recent_purchase_orders': [],
                'recent_invoices': [],
            }

            # Essayer de récupérer les données récentes - FILTERED BY ORGANIZATION
            try:
                recent_suppliers = Supplier.objects.filter(
                    organization=organization,
                    created_at__gte=since
                ).order_by('-created_at')[:5]
                recent_data['recent_suppliers'] = SupplierSerializer(recent_suppliers, many=True).data
            except Exception as e:
                print(f"Erreur suppliers: {e}")
                recent_data['recent_suppliers'] = []

            try:
                recent_orders = PurchaseOrder.objects.filter(
                    created_by__organization=organization,
                    created_at__gte=since
                ).order_by('-created_at')[:5]
                recent_data['recent_purchase_orders'] = PurchaseOrderSerializer(recent_orders, many=True).data
            except Exception as e:
                print(f"Erreur purchase orders: {e}")
                recent_data['recent_purchase_orders'] = []

            try:
                recent_invoices = Invoice.objects.filter(
                    created_by__organization=organization,
                    created_at__gte=since
                ).order_by('-created_at')[:5]
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


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet pour les catégories de produits"""
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.PRODUCTS
    filterset_fields = ['is_active', 'parent']
    search_fields = ['name', 'slug', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtre par organization de l'utilisateur
        if self.request.user.is_authenticated and hasattr(self.request.user, 'organization') and self.request.user.organization:
            queryset = queryset.filter(organization=self.request.user.organization)

        return queryset


class WarehouseViewSet(viewsets.ModelViewSet):
    """ViewSet pour les entrepôts"""
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = Modules.PRODUCTS
    filterset_fields = ['is_active', 'city', 'province']
    search_fields = ['name', 'code', 'address', 'city']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtre par organization de l'utilisateur
        if self.request.user.is_authenticated and hasattr(self.request.user, 'organization') and self.request.user.organization:
            queryset = queryset.filter(organization=self.request.user.organization)

        return queryset