from rest_framework import serializers
from apps.suppliers.models import Supplier, SupplierCategory
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.invoicing.models import Invoice, InvoiceItem, Product, StockMovement
from apps.accounts.models import Client
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


class ProductSerializer(serializers.ModelSerializer):
    """Serializer pour les produits"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'reference', 'description', 'barcode',
            'product_type', 'source_type', 'supplier', 'supplier_name',
            'price', 'cost_price', 'margin', 'margin_percent',
            'stock_quantity', 'low_stock_threshold', 'stock_status',
            'is_low_stock', 'is_out_of_stock', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'margin', 'margin_percent',
            'stock_status', 'is_low_stock', 'is_out_of_stock'
        ]


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
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'address',
            'contact_person', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de bon de commande"""
    total_price = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product_reference', 'description', 'specifications',
            'quantity', 'unit_of_measure', 'unit_price', 'total_price'
        ]
        read_only_fields = ['id', 'total_price']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Serializer pour les bons de commande"""
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'title', 'description', 'supplier', 'supplier_name',
            'status', 'priority', 'subtotal', 'tax_gst_hst', 'tax_qst',
            'total_amount', 'required_date', 'expected_delivery_date',
            'delivery_address', 'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'po_number', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'created_by'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de facture"""
    total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True, source='total_price')

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product_reference', 'description', 'quantity',
            'unit_price', 'discount_percent', 'total'
        ]
        read_only_fields = ['id', 'total']


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer pour les factures"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.username', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'description', 'client', 'client_name',
            'status', 'currency', 'subtotal', 'tax_amount',
            'total_amount', 'due_date', 'payment_method',
            'billing_address', 'payment_terms',
            'created_by', 'created_by_name',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'total_amount',
            'created_at', 'updated_at', 'created_by'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# Serializers pour les statistiques et tableaux de bord
class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du tableau de bord"""
    total_suppliers = serializers.IntegerField()
    active_suppliers = serializers.IntegerField()
    total_purchase_orders = serializers.IntegerField()
    pending_purchase_orders = serializers.IntegerField()
    total_invoices = serializers.IntegerField()
    unpaid_invoices = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)