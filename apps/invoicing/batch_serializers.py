from rest_framework import serializers
from .models import ProductBatch


class ProductBatchSerializer(serializers.ModelSerializer):
    effective_expiry = serializers.DateField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    opened_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductBatch
        fields = [
            'id', 'product', 'product_name', 'batch_number', 'lot_number',
            'quantity', 'quantity_remaining', 'expiry_date', 'opened_at',
            'shelf_life_after_opening_days', 'status', 'notes', 'received_at',
            'created_by', 'effective_expiry', 'is_expired', 'days_until_expiry',
            'opened_by', 'opened_by_name', 'closed_at', 'closure_reason', 'closure_notes',
        ]
        read_only_fields = ['id', 'received_at', 'created_by', 'status',
                            'opened_by', 'closed_at', 'closure_reason', 'closure_notes']

    def get_opened_by_name(self, obj):
        return obj.opened_by.get_full_name() or obj.opened_by.username if obj.opened_by_id else None


class ProductBatchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductBatch
        fields = [
            'batch_number', 'lot_number', 'quantity',
            'quantity_remaining', 'expiry_date', 'shelf_life_after_opening_days', 'notes'
        ]
        extra_kwargs = {
            'lot_number': {'required': False, 'allow_blank': True},
            'notes': {'required': False, 'allow_blank': True},
            'shelf_life_after_opening_days': {'required': False, 'allow_null': True},
            'quantity_remaining': {'required': False},
        }

    def validate(self, data):
        if 'quantity_remaining' not in data:
            data['quantity_remaining'] = data.get('quantity', 0)
        return data
