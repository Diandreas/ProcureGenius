"""
Serializers for Pharmacy app
"""
from rest_framework import serializers
from .models import PharmacyDispensing, DispensingItem
from apps.invoicing.models import Product


class DispensingItemSerializer(serializers.ModelSerializer):
    """Serializer for DispensingItem"""
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_reference = serializers.CharField(source='medication.reference', read_only=True)
    stock_quantity = serializers.IntegerField(source='medication.stock_quantity', read_only=True)
    profit = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = DispensingItem
        fields = [
            'id',
            'dispensing',
            'medication',
            'medication_name',
            'medication_reference',
            'stock_quantity',
            'quantity_dispensed',
            'unit_cost',
            'unit_price',
            'total_price',
            'dosage_instructions',
            'frequency',
            'duration',
            'route',
            'stock_movement',
            'notes',
            'profit',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_price', 'created_at', 'updated_at', 'stock_movement']


class PharmacyDispensingSerializer(serializers.ModelSerializer):
    """Full serializer for PharmacyDispensing"""
    items = DispensingItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    dispensed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PharmacyDispensing
        fields = [
            'id',
            'organization',
            'dispensing_number',
            'patient',
            'patient_name',
            'patient_number',
            'visit',
            'dispensed_at',
            'status',
            'status_display',
            'dispensed_by',
            'dispensed_by_name',
            'counseling_provided',
            'counseling_notes',
            'notes',
            'pharmacy_invoice',
            'items',
            'total_amount',
            'items_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'dispensing_number', 'created_at', 'updated_at'
        ]
    
    def get_dispensed_by_name(self, obj):
        if obj.dispensed_by:
            return obj.dispensed_by.get_full_name() or obj.dispensed_by.username
        return None


class PharmacyDispensingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dispensing lists"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PharmacyDispensing
        fields = [
            'id',
            'dispensing_number',
            'patient',
            'patient_name',
            'dispensed_at',
            'status',
            'status_display',
            'total_amount',
            'items_count',
        ]


class DispensingItemCreateSerializer(serializers.Serializer):
    """Serializer for creating a dispensing item"""
    medication_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    dosage_instructions = serializers.CharField(required=False, allow_blank=True)
    frequency = serializers.CharField(required=False, allow_blank=True)
    duration = serializers.CharField(required=False, allow_blank=True)
    route = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class DispensingCreateSerializer(serializers.Serializer):
    """Serializer for creating a dispensing with items"""
    patient_id = serializers.UUIDField(required=False, allow_null=True)
    visit_id = serializers.UUIDField(required=False, allow_null=True)
    items = DispensingItemCreateSerializer(many=True, min_length=1)
    counseling_provided = serializers.BooleanField(default=False)
    counseling_notes = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class MedicationSerializer(serializers.ModelSerializer):
    """Serializer for medications (Products with category=Medications)"""
    stock_status = serializers.CharField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    unit_price = serializers.DecimalField(source='price', max_digits=10, decimal_places=2, read_only=True)
    current_stock = serializers.IntegerField(source='stock_quantity', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'reference',
            'barcode',
            'description',
            'price',
            'unit_price',
            'cost_price',
            'stock_quantity',
            'current_stock',
            'low_stock_threshold',
            'stock_status',
            'is_low_stock',
            'is_out_of_stock',
            'is_active',
        ]


class StockCheckSerializer(serializers.Serializer):
    """Serializer for checking medication availability"""
    medication_id = serializers.UUIDField()
    quantity_needed = serializers.IntegerField(min_value=1)
    
    
class StockCheckResultSerializer(serializers.Serializer):
    """Response serializer for stock check"""
    medication_id = serializers.UUIDField()
    medication_name = serializers.CharField()
    quantity_needed = serializers.IntegerField()
    current_stock = serializers.IntegerField()
    is_available = serializers.BooleanField()
    shortage = serializers.IntegerField()
