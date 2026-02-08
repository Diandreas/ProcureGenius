from rest_framework import serializers
from .models import ProductBatch


class ProductBatchSerializer(serializers.ModelSerializer):
    effective_expiry = serializers.DateField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ProductBatch
        fields = [
            'id', 'product', 'product_name', 'batch_number', 'lot_number',
            'quantity', 'quantity_remaining', 'expiry_date', 'opened_at',
            'shelf_life_after_opening_days', 'status', 'notes', 'received_at',
            'created_by', 'effective_expiry', 'is_expired', 'days_until_expiry'
        ]
        read_only_fields = ['id', 'received_at', 'created_by', 'status']


class ProductBatchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductBatch
        fields = [
            'product', 'batch_number', 'lot_number', 'quantity',
            'quantity_remaining', 'expiry_date', 'shelf_life_after_opening_days', 'notes'
        ]

    def validate(self, data):
        if 'quantity_remaining' not in data:
            data['quantity_remaining'] = data.get('quantity', 0)
        return data
