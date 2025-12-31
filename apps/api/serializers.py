from rest_framework import serializers
from apps.suppliers.models import Supplier, SupplierCategory, SupplierProduct
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.invoicing.models import Invoice, InvoiceItem, Product, StockMovement, ProductCategory, Warehouse
from apps.accounts.models import Client
from apps.core.serializer_mixins import ModuleAwareSerializerMixin
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class SupplierCategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories de fournisseurs"""
    class Meta:
        model = SupplierCategory
        fields = ['id', 'name', 'slug', 'description']


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer pour les fournisseurs"""
    categories = SupplierCategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=SupplierCategory.objects.all(),
        source='categories',
        write_only=True
    )
    performance_badge = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contact_person', 'email', 'phone',
            'address', 'city', 'province', 'status', 'rating',
            'is_local', 'is_minority_owned', 'is_woman_owned', 'is_indigenous',
            'categories', 'category_ids', 'performance_badge',
            'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'performance_badge']

    def get_performance_badge(self, obj):
        return obj.get_performance_badge()


class SupplierProductSerializer(serializers.ModelSerializer):
    """Serializer pour la relation Fournisseur-Produit"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(source='product.reference', read_only=True)
    product_price = serializers.DecimalField(
        source='product.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = SupplierProduct
        fields = [
            'id', 'supplier', 'supplier_name', 'product', 'product_name',
            'product_reference', 'product_price', 'supplier_reference',
            'supplier_price', 'lead_time_days', 'is_preferred', 'is_active',
            'notes', 'last_purchase_date', 'last_purchase_price',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'supplier_name',
            'product_name', 'product_reference', 'product_price'
        ]

    def validate(self, attrs):
        """Valider qu'il n'y a pas déjà une relation pour ce couple supplier-product"""
        supplier = attrs.get('supplier')
        product = attrs.get('product')

        # Lors de la création (pas d'instance), vérifier l'unicité
        if not self.instance:
            if SupplierProduct.objects.filter(supplier=supplier, product=product).exists():
                raise serializers.ValidationError({
                    'non_field_errors': 'Cette relation fournisseur-produit existe déjà.'
                })

        return attrs


class ProductSerializer(ModuleAwareSerializerMixin, serializers.ModelSerializer):
    """Serializer pour les produits"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    
    # Warehouse info
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    warehouse_location = serializers.SerializerMethodField()
    
    # Statistiques
    total_invoices = serializers.SerializerMethodField()
    total_sales_amount = serializers.SerializerMethodField()
    unique_clients_count = serializers.SerializerMethodField()
    last_sale_date = serializers.SerializerMethodField()
    active_contracts_count = serializers.SerializerMethodField()
    
    # Hide supplier fields if suppliers module is disabled
    module_dependent_fields = {
        'suppliers': ['supplier', 'supplier_name'],
    }

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'reference', 'description', 'barcode',
            'product_type', 'source_type', 'supplier', 'supplier_name',
            'warehouse', 'warehouse_name', 'warehouse_code', 'warehouse_location',
            'price', 'cost_price', 'margin', 'margin_percent',
            'stock_quantity', 'low_stock_threshold', 'stock_status',
            'is_low_stock', 'is_out_of_stock', 'is_active',
            'total_invoices', 'total_sales_amount', 'unique_clients_count',
            'last_sale_date', 'active_contracts_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'margin', 'margin_percent',
            'stock_status', 'is_low_stock', 'is_out_of_stock',
            'warehouse_name', 'warehouse_code', 'warehouse_location',
            'total_invoices', 'total_sales_amount', 'unique_clients_count',
            'last_sale_date', 'active_contracts_count'
        ]
    
    def validate(self, attrs):
        """Validation stricte des produits selon leur type"""
        product_type = attrs.get('product_type', getattr(self.instance, 'product_type', 'physical'))

        # Services/digital ne peuvent pas avoir de stock
        if product_type in ['service', 'digital']:
            if attrs.get('stock_quantity', 0) != 0:
                raise serializers.ValidationError({
                    'stock_quantity': 'Les services/produits digitaux ne gèrent pas de stock'
                })
            if attrs.get('low_stock_threshold', 0) != 0:
                raise serializers.ValidationError({
                    'low_stock_threshold': 'Les services/produits digitaux ne gèrent pas de stock'
                })
            if attrs.get('warehouse'):
                raise serializers.ValidationError({
                    'warehouse': 'Pas de warehouse pour services/digitaux'
                })

        # Physiques doivent avoir warehouse si disponible
        elif product_type == 'physical':
            from apps.invoicing.models import Warehouse
            if not attrs.get('warehouse') and not getattr(self.instance, 'warehouse', None):
                if Warehouse.objects.exists():
                    raise serializers.ValidationError({
                        'warehouse': 'Warehouse requis pour produits physiques'
                    })

        return attrs

    def get_warehouse_location(self, obj):
        if obj.warehouse:
            return f"{obj.warehouse.city}, {obj.warehouse.province}"
        return None
        
    def get_total_invoices(self, obj):
        return obj.invoice_items.values('invoice').distinct().count()
        
    def get_total_sales_amount(self, obj):
        from django.db.models import Sum
        total = obj.invoice_items.aggregate(Sum('total_price'))['total_price__sum']
        return float(total) if total else 0
        
    def get_unique_clients_count(self, obj):
        return obj.invoice_items.values('invoice__client').distinct().count()
        
    def get_last_sale_date(self, obj):
        last_item = obj.invoice_items.order_by('-created_at').first()
        return last_item.created_at if last_item else None
        
    def get_active_contracts_count(self, obj):
        return obj.contract_items.filter(contract__status='active').count()


class StockMovementSerializer(serializers.ModelSerializer):
    """Serializer pour les mouvements de stock"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(source='product.reference', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    reference_type_display = serializers.CharField(source='get_reference_type_display', read_only=True)
    loss_reason_display = serializers.CharField(read_only=True)
    is_entry = serializers.BooleanField(read_only=True)
    is_exit = serializers.BooleanField(read_only=True)
    is_loss = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'product_reference',
            'movement_type', 'movement_type_display',
            'quantity', 'quantity_before', 'quantity_after',
            'reference_type', 'reference_type_display', 'reference_id', 'reference_number',
            'loss_reason', 'loss_reason_display', 'loss_description', 'loss_value',
            'notes', 'created_by', 'created_by_name', 'created_at',
            'is_entry', 'is_exit', 'is_loss'
        ]
        read_only_fields = [
            'id', 'created_at', 'product_name', 'product_reference',
            'created_by_name', 'movement_type_display', 'reference_type_display',
            'loss_reason_display', 'is_entry', 'is_exit', 'is_loss'
        ]


class ClientSerializer(serializers.ModelSerializer):
    """Serializer pour les clients"""
    # Statistiques
    total_invoices = serializers.SerializerMethodField()
    total_sales_amount = serializers.SerializerMethodField()
    total_paid_amount = serializers.SerializerMethodField()
    total_outstanding = serializers.SerializerMethodField()
    last_invoice_date = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'address',
            'contact_person', 'tax_id', 'payment_terms', 'is_active',
            'total_invoices', 'total_sales_amount', 'total_paid_amount',
            'total_outstanding', 'last_invoice_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'total_invoices', 'total_sales_amount', 'total_paid_amount',
            'total_outstanding', 'last_invoice_date'
        ]

    def validate_name(self, value):
        """Valider que le nom n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom du client est obligatoire.")
        return value.strip()
    
    def get_total_invoices(self, obj):
        return obj.invoices.count()
        
    def get_total_sales_amount(self, obj):
        from django.db.models import Sum
        total = obj.invoices.aggregate(Sum('total_amount'))['total_amount__sum']
        return float(total) if total else 0
        
    def get_total_paid_amount(self, obj):
        from django.db.models import Sum
        total = obj.invoices.filter(status='paid').aggregate(Sum('total_amount'))['total_amount__sum']
        return float(total) if total else 0
        
    def get_total_outstanding(self, obj):
        from django.db.models import Sum
        total = obj.invoices.filter(status__in=['sent', 'overdue']).aggregate(Sum('total_amount'))['total_amount__sum']
        return float(total) if total else 0
        
    def get_last_invoice_date(self, obj):
        last_invoice = obj.invoices.order_by('-created_at').first()
        return last_invoice.created_at if last_invoice else None


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de bon de commande"""
    total_price = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    # Permettre la création de produit à la volée
    product_data = serializers.DictField(write_only=True, required=False, help_text="Données pour créer un nouveau produit si nécessaire")

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_data', 'product_reference',
            'description', 'specifications', 'quantity', 'unit_of_measure',
            'unit_price', 'total_price'
        ]
        read_only_fields = ['id', 'total_price', 'product_name']

    def validate(self, attrs):
        """Valider qu'un produit est associé ou créé"""
        product = attrs.get('product')
        product_data = attrs.get('product_data')

        # Si ni product ni product_data fournis, erreur
        if not product and not product_data:
            raise serializers.ValidationError({
                'product': "Un produit doit être sélectionné ou créé. Fournissez 'product' ou 'product_data'."
            })

        # Si product_data fourni, créer le produit
        if product_data:
            from apps.invoicing.models import Product
            # Valider les champs requis pour créer un produit
            required_fields = ['name', 'price']
            missing_fields = [f for f in required_fields if f not in product_data]
            if missing_fields:
                raise serializers.ValidationError({
                    'product_data': f"Champs manquants pour créer un produit: {', '.join(missing_fields)}"
                })

            # Créer le produit
            try:
                product_data.setdefault('product_type', 'physical')
                product_data.setdefault('cost_price', product_data.get('price', 0))
                new_product = Product.objects.create(**product_data)
                attrs['product'] = new_product
                # Retirer product_data des attrs pour ne pas le sauvegarder
                attrs.pop('product_data', None)
            except Exception as e:
                raise serializers.ValidationError({
                    'product_data': f"Erreur lors de la création du produit: {str(e)}"
                })

        return attrs


class PurchaseOrderSerializer(ModuleAwareSerializerMixin, serializers.ModelSerializer):
    """Serializer pour les bons de commande"""
    items = PurchaseOrderItemSerializer(many=True, required=False)
    
    # Nested serializers pour read (affichage complet)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    
    # Champs simples pour rétrocompatibilité
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    # Hide supplier fields if suppliers module is disabled
    module_dependent_fields = {
        'suppliers': ['supplier', 'supplier_name', 'supplier_detail'],
    }

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'title', 'description', 
            'supplier', 'supplier_name', 'supplier_detail',
            'status', 'priority', 'subtotal', 'tax_gst_hst', 'tax_qst',
            'total_amount', 'required_date', 'expected_delivery_date',
            'delivery_address', 'notes', 
            'created_by', 'created_by_name', 'created_by_detail',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'po_number', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'created_by', 
            'supplier_name', 'created_by_name',
            'supplier_detail', 'created_by_detail'
        ]
    
    def to_representation(self, instance):
        """Surcharger pour renvoyer supplier et created_by comme objets complets"""
        representation = super().to_representation(instance)
        
        # Remplacer supplier par supplier_detail si disponible
        if representation.get('supplier_detail'):
            representation['supplier'] = representation.pop('supplier_detail')
        
        # Remplacer created_by par created_by_detail si disponible
        if representation.get('created_by_detail'):
            representation['created_by'] = representation.pop('created_by_detail')
        
        return representation

    def create(self, validated_data):
        from apps.purchase_orders.models import PurchaseOrderItem

        items_data = validated_data.pop('items', [])
        validated_data['created_by'] = self.context['request'].user

        # Initialiser les totaux à 0 (seront recalculés après)
        validated_data.setdefault('subtotal', 0)
        validated_data.setdefault('total_amount', 0)

        # Créer le bon de commande
        purchase_order = PurchaseOrder.objects.create(**validated_data)

        # Créer les items
        for item_data in items_data:
            PurchaseOrderItem.objects.create(purchase_order=purchase_order, **item_data)

        # Recalculer les totaux
        purchase_order.recalculate_totals()

        return purchase_order

    def update(self, instance, validated_data):
        from apps.purchase_orders.models import PurchaseOrderItem

        items_data = validated_data.pop('items', None)

        # Mettre à jour le bon de commande
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Mettre à jour les items si fournis
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseOrderItem.objects.create(purchase_order=instance, **item_data)
            instance.recalculate_totals()

        return instance


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de facture"""
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'product_reference', 'product_name', 'description', 'quantity',
            'unit_price', 'discount_percent', 'total_price'
        ]
        read_only_fields = ['id', 'total_price', 'product_name']
    
    def validate(self, attrs):
        """Valider la disponibilité du stock pour les produits physiques"""
        product = attrs.get('product')
        quantity = attrs.get('quantity', 1)
        
        # Vérifier le stock uniquement si un produit est lié
        if product and product.product_type == 'physical':
            # Si c'est une modification, prendre en compte la quantité précédente
            if self.instance:
                previous_quantity = self.instance.quantity
                stock_needed = quantity - previous_quantity
            else:
                stock_needed = quantity
            
            # Vérifier si le stock est suffisant
            if stock_needed > 0 and product.stock_quantity < stock_needed:
                raise serializers.ValidationError({
                    'quantity': f"Stock insuffisant. Disponible: {product.stock_quantity}, Demandé: {stock_needed}"
                })
        
        return attrs


class InvoiceSerializer(ModuleAwareSerializerMixin, serializers.ModelSerializer):
    """Serializer pour les factures"""
    items = InvoiceItemSerializer(many=True, required=False)
    
    # Nested serializers pour read (affichage complet)
    client_detail = ClientSerializer(source='client', read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    
    # Champs simples pour rétrocompatibilité
    client_name = serializers.CharField(source='client.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True, required=False)

    # Hide fields for disabled modules
    module_dependent_fields = {
        'purchase-orders': ['purchase_order', 'purchase_order_number'],
        'clients': ['client', 'client_name', 'client_detail'],
    }

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'description', 
            'client', 'client_name', 'client_detail',
            'status', 'currency', 'subtotal', 'tax_amount',
            'total_amount', 'due_date', 'payment_method',
            'billing_address', 'payment_terms', 
            'purchase_order', 'purchase_order_number',
            'created_by', 'created_by_name', 'created_by_detail',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'created_by', 
            'purchase_order_number', 'client_name', 'created_by_name',
            'client_detail', 'created_by_detail'
        ]
    
    def to_representation(self, instance):
        """Surcharger pour renvoyer client et created_by comme objets complets"""
        representation = super().to_representation(instance)
        
        # Remplacer client par client_detail si disponible
        if representation.get('client_detail'):
            representation['client'] = representation.pop('client_detail')
        
        # Remplacer created_by par created_by_detail si disponible
        if representation.get('created_by_detail'):
            representation['created_by'] = representation.pop('created_by_detail')
        
        return representation

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        validated_data['created_by'] = self.context['request'].user

        # Initialiser les totaux à 0 (seront recalculés après)
        validated_data.setdefault('subtotal', 0)
        validated_data.setdefault('total_amount', 0)

        # Créer la facture
        invoice = Invoice.objects.create(**validated_data)

        # Créer les items
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        # Recalculer les totaux
        invoice.recalculate_totals()

        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Mettre à jour la facture
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Mettre à jour les items si fournis
        if items_data is not None:
            # Supprimer les anciens items
            instance.items.all().delete()

            # Créer les nouveaux items
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

            # Recalculer les totaux
            instance.recalculate_totals()

        return instance


# Serializers pour ProductCategory et Warehouse
class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories de produits"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = [
            'id', 'organization', 'organization_name', 'name', 'slug',
            'description', 'parent', 'parent_name', 'children_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_children_count(self, obj):
        return obj.children.count()


class WarehouseSerializer(serializers.ModelSerializer):
    """Serializer pour les entrepôts"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            'id', 'organization', 'organization_name', 'name', 'code',
            'address', 'city', 'province', 'postal_code', 'country',
            'is_active', 'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_products_count(self, obj):
        from apps.invoicing.models import Product
        return Product.objects.filter(warehouse=obj).count()


# Serializers pour les statistiques et tableaux de bord
class DashboardStatsSerializer(ModuleAwareSerializerMixin, serializers.Serializer):
    """Serializer pour les statistiques du tableau de bord"""
    total_suppliers = serializers.IntegerField(required=False)
    active_suppliers = serializers.IntegerField(required=False)
    total_purchase_orders = serializers.IntegerField(required=False)
    pending_purchase_orders = serializers.IntegerField(required=False)
    total_invoices = serializers.IntegerField(required=False)
    unpaid_invoices = serializers.IntegerField(required=False)
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    
    # Hide stats for disabled modules
    module_dependent_fields = {
        'suppliers': ['total_suppliers', 'active_suppliers'],
        'purchase-orders': ['total_purchase_orders', 'pending_purchase_orders', 'total_expenses'],
        'invoices': ['total_invoices', 'unpaid_invoices', 'total_revenue'],
    }