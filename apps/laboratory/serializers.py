"""
Serializers for Laboratory (LIMS) app
"""
from rest_framework import serializers
from .models import LabTestCategory, LabTest, LabOrder, LabOrderItem


class LabTestCategorySerializer(serializers.ModelSerializer):
    """Serializer for LabTestCategory"""
    tests_count = serializers.SerializerMethodField()
    
    class Meta:
        model = LabTestCategory
        fields = [
            'id',
            'organization',
            'name',
            'slug',
            'description',
            'is_active',
            'display_order',
            'tests_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_tests_count(self, obj):
        return obj.tests.filter(is_active=True).count()


class LabTestSerializer(serializers.ModelSerializer):
    """Full serializer for LabTest"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    sample_type_display = serializers.CharField(source='get_sample_type_display', read_only=True)
    container_type_display = serializers.CharField(source='get_container_type_display', read_only=True)
    
    class Meta:
        model = LabTest
        fields = [
            'id',
            'organization',
            'category',
            'category_name',
            'test_code',
            'name',
            'short_name',
            'description',
            'price',
            'normal_range_male',
            'normal_range_female',
            'normal_range_child',
            'normal_range_general',
            'unit_of_measurement',
            'sample_type',
            'sample_type_display',
            'sample_volume',
            'container_type',
            'container_type_display',
            'fasting_required',
            'fasting_hours',
            'preparation_instructions',
            'estimated_turnaround_hours',
            'methodology',
            'is_active',
            'requires_approval',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LabTestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for test lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = LabTest
        fields = [
            'id',
            'test_code',
            'name',
            'short_name',
            'category',
            'category_name',
            'price',
            'sample_type',
            'fasting_required',
            'estimated_turnaround_hours',
            'is_active',
        ]


class LabOrderItemSerializer(serializers.ModelSerializer):
    """Serializer for LabOrderItem"""
    test_name = serializers.CharField(source='lab_test.name', read_only=True)
    test_code = serializers.CharField(source='lab_test.test_code', read_only=True)
    price = serializers.DecimalField(source='lab_test.price', max_digits=10, decimal_places=2, read_only=True)
    abnormality_type_display = serializers.CharField(source='get_abnormality_type_display', read_only=True)
    
    class Meta:
        model = LabOrderItem
        fields = [
            'id',
            'lab_order',
            'lab_test',
            'test_name',
            'test_code',
            'price',
            'result_value',
            'result_numeric',
            'result_unit',
            'reference_range',
            'abnormality_type',
            'abnormality_type_display',
            'is_abnormal',
            'is_critical',
            'interpretation',
            'technician_notes',
            'result_entered_at',
            'result_verified_at',
            'verified_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 
            'result_entered_at', 'result_verified_at'
        ]


class LabOrderSerializer(serializers.ModelSerializer):
    """Full serializer for LabOrder"""
    items = LabOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    ordered_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tests_count = serializers.IntegerField(read_only=True)
    all_results_entered = serializers.BooleanField(read_only=True)
    lab_invoice = serializers.SerializerMethodField()
    diagnosed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LabOrder
        fields = [
            'id',
            'organization',
            'order_number',
            'patient',
            'patient_name',
            'patient_number',
            'visit',
            'order_date',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'clinical_notes',
            'ordered_by',
            'ordered_by_name',
            'sample_collected_at',
            'sample_collected_by',
            'results_completed_at',
            'results_entered_by',
            'results_verified_by',
            'notification_sent',
            'notification_sent_at',
            'lab_invoice',
            'items',
            'total_price',
            'tests_count',
            'all_results_entered',
            'biologist_diagnosis',
            'diagnosed_by_name',
            'diagnosed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'created_at', 'updated_at',
            'sample_collected_at', 'results_completed_at',
            'notification_sent', 'notification_sent_at',
            'diagnosed_at'
        ]
    
    def get_diagnosed_by_name(self, obj):
        if obj.diagnosed_by:
            return obj.diagnosed_by.get_full_name() or obj.diagnosed_by.username
        return None
    
    def get_ordered_by_name(self, obj):
        if obj.ordered_by:
            return obj.ordered_by.get_full_name() or obj.ordered_by.username
        return None

    def get_lab_invoice(self, obj):
        if obj.lab_invoice:
            return {
                'id': str(obj.lab_invoice.id),
                'invoice_number': obj.lab_invoice.invoice_number,
                'status': obj.lab_invoice.status,
                'total_amount': str(obj.lab_invoice.total_amount)
            }
        return None


class LabOrderListItemSerializer(serializers.ModelSerializer):
    """Minimal item info for list view"""
    lab_test_name = serializers.CharField(source='lab_test.name', read_only=True)
    sample_type = serializers.CharField(source='lab_test.sample_type', read_only=True)

    class Meta:
        model = LabOrderItem
        fields = ['id', 'lab_test_name', 'sample_type']


class LabOrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order lists"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    tests_count = serializers.SerializerMethodField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    items = LabOrderListItemSerializer(many=True, read_only=True)

    def get_tests_count(self, obj):
        """Get count of items"""
        return obj.items.count() if hasattr(obj, 'items') else 0

    class Meta:
        model = LabOrder
        fields = [
            'id',
            'order_number',
            'patient',
            'patient_name',
            'order_date',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'tests_count',
            'total_price',
            'notification_sent',
            'items',
        ]


class LabOrderCreateSerializer(serializers.Serializer):
    """Serializer for creating a lab order with tests"""
    patient_id = serializers.UUIDField()
    visit_id = serializers.UUIDField(required=False, allow_null=True)
    test_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text="List of lab test IDs to order"
    )
    priority = serializers.ChoiceField(
        choices=LabOrder.PRIORITY_CHOICES,
        default='routine'
    )
    clinical_notes = serializers.CharField(required=False, allow_blank=True)


class EnterResultsSerializer(serializers.Serializer):
    """Serializer for entering lab results"""
    results = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of result objects with item_id, result_value, etc."
    )
    biologist_diagnosis = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Global diagnosis by the supervising biologist"
    )

    def validate_results(self, value):
        for result in value:
            if 'item_id' not in result:
                raise serializers.ValidationError("Each result must have an item_id")
            if 'result_value' not in result:
                raise serializers.ValidationError("Each result must have a result_value")
        return value
