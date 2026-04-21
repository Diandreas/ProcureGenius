"""
Serializers for Laboratory (LIMS) app
"""
from rest_framework import serializers
from decimal import Decimal, InvalidOperation
from .models import LabTestCategory, LabTest, LabOrder, LabOrderItem, LabTestParameter, LabResultValue, LabTestPanel, Prescriber, SubcontractorLab, SubcontractorPrice, SubcontractorDefaultPrice, SubcontractorPatient, LabTestConsumable


class LabTestParameterSerializer(serializers.ModelSerializer):
    """Serializer for LabTestParameter — sub-parameters of a structured test"""

    class Meta:
        model = LabTestParameter
        fields = [
            'id', 'code', 'name', 'group_name', 'display_order', 'unit',
            'base_unit', 'conversion_factor',
            'value_type', 'decimal_places', 'is_required',
            'adult_ref_min_male', 'adult_ref_max_male',
            'adult_ref_min_female', 'adult_ref_max_female',
            'adult_ref_min_general', 'adult_ref_max_general',
            'child_ref_min', 'child_ref_max', 'child_age_max_years',
            'critical_low', 'critical_high',
        ]

    def to_representation(self, instance):
        """Convert base unit values to display unit values for output"""
        data = super().to_representation(instance)
        factor = instance.conversion_factor or Decimal('1.0')
        
        if factor != Decimal('1.0'):
            numeric_fields = [
                'adult_ref_min_male', 'adult_ref_max_male',
                'adult_ref_min_female', 'adult_ref_max_female',
                'adult_ref_min_general', 'adult_ref_max_general',
                'child_ref_min', 'child_ref_max',
                'critical_low', 'critical_high',
            ]
            for field in numeric_fields:
                if data.get(field) is not None:
                    # Convert to display unit
                    try:
                        val = Decimal(str(data[field]))
                        data[field] = val * factor
                    except (InvalidOperation, TypeError):
                        pass
        return data

    def to_internal_value(self, data):
        """Convert display unit values back to base unit values for storage"""
        # We need the factor from the data if it's being updated, 
        # or from the instance if it exists.
        factor = Decimal('1.0')
        if 'conversion_factor' in data:
            try:
                factor = Decimal(str(data['conversion_factor']))
            except (ValueError, InvalidOperation):
                pass
        elif self.instance:
            factor = self.instance.conversion_factor or Decimal('1.0')

        # First get the internal values normally
        internal_data = super().to_internal_value(data)

        if factor != Decimal('1.0'):
            numeric_fields = [
                'adult_ref_min_male', 'adult_ref_max_male',
                'adult_ref_min_female', 'adult_ref_max_female',
                'adult_ref_min_general', 'adult_ref_max_general',
                'child_ref_min', 'child_ref_max',
                'critical_low', 'critical_high',
            ]
            for field in numeric_fields:
                if internal_data.get(field) is not None:
                    # Convert back to base unit
                    internal_data[field] = internal_data[field] / factor
                    
        return internal_data


class LabResultValueSerializer(serializers.ModelSerializer):
    """Serializer for LabResultValue — measured value for a structured parameter"""
    parameter_code = serializers.CharField(source='parameter.code', read_only=True)
    parameter_name = serializers.CharField(source='parameter.name', read_only=True)
    parameter_unit = serializers.CharField(source='parameter.unit', read_only=True)
    parameter_group = serializers.CharField(source='parameter.group_name', read_only=True)

    class Meta:
        model = LabResultValue
        fields = [
            'id', 'parameter', 'parameter_code', 'parameter_name',
            'parameter_unit', 'parameter_group',
            'result_numeric', 'result_text', 'flag', 'entered_at',
        ]
        read_only_fields = ['id', 'entered_at']

    def to_representation(self, instance):
        """Convert base unit value to display unit value for output"""
        data = super().to_representation(instance)
        # Apply conversion from parameter
        factor = instance.parameter.conversion_factor or Decimal('1.0')
        if factor != Decimal('1.0') and data.get('result_numeric') is not None:
            try:
                val = Decimal(str(data['result_numeric']))
                data['result_numeric'] = val * factor
            except (InvalidOperation, TypeError):
                pass
        return data

    def to_internal_value(self, data):
        """Convert display unit value back to base unit value for storage"""
        # We need the parameter's conversion factor
        parameter_id = data.get('parameter')
        factor = Decimal('1.0')
        if parameter_id:
            try:
                param = LabTestParameter.objects.get(id=parameter_id)
                factor = param.conversion_factor or Decimal('1.0')
            except (LabTestParameter.DoesNotExist, ValueError):
                pass
        elif self.instance:
            factor = self.instance.parameter.conversion_factor or Decimal('1.0')

        internal_data = super().to_internal_value(data)

        if factor != Decimal('1.0') and internal_data.get('result_numeric') is not None:
            internal_data['result_numeric'] = internal_data['result_numeric'] / factor
                    
        return internal_data


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
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def get_tests_count(self, obj):
        return obj.tests.filter(is_active=True).count()


class LabTestConsumableSerializer(serializers.ModelSerializer):
    """Consommable lié à un LabTest (lecture + écriture)"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(source='product.reference', read_only=True)
    product_stock = serializers.SerializerMethodField()

    class Meta:
        model = LabTestConsumable
        fields = ['id', 'product', 'product_name', 'product_reference',
                  'product_stock', 'quantity_per_test', 'notes']

    def get_product_stock(self, obj):
        from django.db.models import Sum
        p = obj.product
        batch_stock = (
            p.batches.filter(status__in=['available', 'opened'])
            .aggregate(total=Sum('quantity_remaining'))['total'] or 0
        )
        return batch_stock if batch_stock > 0 else (p.stock_quantity or 0)


class LabTestSerializer(serializers.ModelSerializer):
    """Full serializer for LabTest"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    sample_type_display = serializers.CharField(source='get_sample_type_display', read_only=True)
    container_type_display = serializers.CharField(source='get_container_type_display', read_only=True)
    has_parameters = serializers.BooleanField(read_only=True)
    parameters = LabTestParameterSerializer(source='active_parameters', many=True, read_only=True)
    # Consommable lié : nom + stock actuel (read-only, calculé)
    linked_product_name = serializers.SerializerMethodField()
    linked_product_stock = serializers.SerializerMethodField()
    # Nouveau système multi-consommables
    consumables = LabTestConsumableSerializer(many=True, read_only=True)

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
            'discount',
            'normal_range_male',
            'normal_range_female',
            'normal_range_child',
            'normal_range_general',
            'unit_of_measurement',
            'base_unit',
            'conversion_factor',
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
            'use_large_layout',
            'show_on_new_page',
            'has_parameters',
            'parameters',
            'linked_product',
            'linked_product_name',
            'linked_product_stock',
            'consumables',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def get_linked_product_name(self, obj):
        if obj.linked_product:
            return obj.linked_product.name
        return None

    def get_linked_product_stock(self, obj):
        from django.db.models import Sum
        p = obj.linked_product
        if not p:
            return None
        batch_stock = (
            p.batches.filter(status__in=['available', 'opened'])
            .aggregate(total=Sum('quantity_remaining'))['total'] or 0
        )
        return max(p.stock_quantity or 0, batch_stock)


class LabTestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for test lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    has_parameters = serializers.BooleanField(read_only=True)
    linked_product_name = serializers.CharField(source='linked_product.name', read_only=True, default=None)
    linked_product_stock = serializers.SerializerMethodField()

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
            'discount',
            'sample_type',
            'fasting_required',
            'estimated_turnaround_hours',
            'is_active',
            'has_parameters',
            'linked_product',
            'linked_product_name',
            'linked_product_stock',
        ]

    def get_linked_product_stock(self, obj):
        p = obj.linked_product
        if not p:
            return None
        from django.db.models import Sum
        batch_stock = (
            p.batches.filter(status__in=['available', 'opened'])
            .aggregate(total=Sum('quantity_remaining'))['total'] or 0
        )
        return max(p.stock_quantity or 0, batch_stock)


class LabOrderItemSerializer(serializers.ModelSerializer):
    """Serializer for LabOrderItem"""
    test_name = serializers.CharField(source='lab_test.name', read_only=True)
    test_code = serializers.CharField(source='lab_test.test_code', read_only=True)
    price = serializers.DecimalField(source='lab_test.price', max_digits=10, decimal_places=2, read_only=True)
    abnormality_type_display = serializers.CharField(source='get_abnormality_type_display', read_only=True)
    result_template = serializers.CharField(source='lab_test.result_template', read_only=True)
    normal_range_male = serializers.CharField(source='lab_test.normal_range_male', read_only=True)
    normal_range_female = serializers.CharField(source='lab_test.normal_range_female', read_only=True)
    normal_range_general = serializers.CharField(source='lab_test.normal_range_general', read_only=True)
    category_name = serializers.CharField(source='lab_test.category.name', read_only=True, default='')
    has_parameters = serializers.BooleanField(source='lab_test.has_parameters', read_only=True)
    lab_test_data = LabTestSerializer(source='lab_test', read_only=True)
    parameters = LabTestParameterSerializer(source='lab_test.active_parameters', many=True, read_only=True)
    parameter_results = LabResultValueSerializer(many=True, read_only=True)

    class Meta:
        model = LabOrderItem
        fields = [
            'id',
            'lab_order',
            'lab_test',
            'lab_test_data',
            'test_name',
            'test_code',
            'price',
            'result_template',
            'normal_range_male',
            'normal_range_female',
            'normal_range_general',
            'category_name',
            'discount',
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
            'has_parameters',
            'parameters',
            'parameter_results',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'result_entered_at', 'result_verified_at'
        ]

    def to_representation(self, instance):
        """Convert base unit value to display unit value for output"""
        data = super().to_representation(instance)
        # Apply conversion from test
        factor = instance.lab_test.conversion_factor or Decimal('1.0')
        if factor != Decimal('1.0') and data.get('result_numeric') is not None:
            try:
                val = Decimal(str(data['result_numeric']))
                data['result_numeric'] = val * factor
            except (InvalidOperation, TypeError):
                pass
        return data

    def to_internal_value(self, data):
        """Convert display unit value back to base unit value for storage"""
        # Note: If updating LabOrderItem directly, we might need back-conversion.
        # But results are mostly updated via EnterLabResultsView.
        # Still good to have for completeness.
        internal_data = super().to_internal_value(data)
        
        # We need the factor from the instance
        if self.instance and internal_data.get('result_numeric') is not None:
            factor = self.instance.lab_test.conversion_factor or Decimal('1.0')
            if factor != Decimal('1.0'):
                internal_data['result_numeric'] = internal_data['result_numeric'] / factor
                    
        return internal_data


class PrescriberSerializer(serializers.ModelSerializer):
    """Full serializer for Prescriber (admin CRUD)"""
    full_name = serializers.CharField(read_only=True)
    orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Prescriber
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'specialty',
            'phone', 'email', 'clinic_name', 'address',
            'commission_rate', 'is_active', 'notes',
            'orders_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_orders_count(self, obj):
        return obj.lab_orders.count()


class PrescriberListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns and lists"""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Prescriber
        fields = ['id', 'full_name', 'first_name', 'last_name',
                  'specialty', 'clinic_name', 'commission_rate', 'is_active']


class LabOrderSerializer(serializers.ModelSerializer):
    """Full serializer for LabOrder"""
    items = LabOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    subcontractor_name = serializers.CharField(source='subcontractor.name', read_only=True, default=None)
    is_subcontracted = serializers.SerializerMethodField()
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.SerializerMethodField()
    ordered_by_name = serializers.SerializerMethodField()
    sample_collected_by_name = serializers.CharField(source='sample_collected_by.get_full_name', read_only=True, default=None)
    results_entered_by_name = serializers.CharField(source='results_entered_by.get_full_name', read_only=True, default=None)
    results_verified_by_name = serializers.CharField(source='results_verified_by.get_full_name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tests_count = serializers.IntegerField(read_only=True)
    all_results_entered = serializers.BooleanField(read_only=True)
    lab_invoice = serializers.SerializerMethodField()
    diagnosed_by_name = serializers.SerializerMethodField()
    prescriber_name = serializers.SerializerMethodField()
    prescriber_commission_rate = serializers.DecimalField(
        source='prescriber.commission_rate', max_digits=5, decimal_places=2,
        read_only=True, default=None
    )

    class Meta:
        model = LabOrder
        fields = [
            'id',
            'organization',
            'order_number',
            'patient',
            'patient_name',
            'patient_number',
            'patient_gender',
            'patient_age',
            'visit',
            'order_date',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'clinical_notes',
            'ordered_by',
            'ordered_by_name',
            'prescriber',
            'prescriber_name',
            'prescriber_commission_rate',
            'sample_collected_at',
            'sample_collected_by',
            'sample_collected_by_name',
            'results_completed_at',
            'results_entered_by',
            'results_entered_by_name',
            'results_verified_by',
            'results_verified_by_name',
            'results_verified_at',
            'notification_sent',
            'notification_sent_at',
            'lab_invoice',
            'items',
            'total_price',
            'discount',
            'payment_method',
            'tests_count',
            'all_results_entered',
            'biologist_diagnosis',
            'subcontractor',
            'subcontractor_name',
            'is_subcontracted',
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
    
    def get_is_subcontracted(self, obj):
        return obj.subcontractor_id is not None

    def get_patient_age(self, obj):
        if obj.patient:
            if obj.subcontractor_id:
                from apps.laboratory.models import SubcontractorPatient
                sub_patient = SubcontractorPatient.objects.filter(
                    client=obj.patient, 
                    subcontractor=obj.subcontractor_id
                ).first()
                if sub_patient:
                    return sub_patient.resolved_age
            return obj.patient.get_age()
        return None

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

    def get_prescriber_name(self, obj):
        return str(obj.prescriber) if obj.prescriber else None


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
    subcontractor_name = serializers.CharField(source='subcontractor.name', read_only=True, default=None)
    is_subcontracted = serializers.SerializerMethodField()

    def get_tests_count(self, obj):
        """Get count of items"""
        return obj.items.count() if hasattr(obj, 'items') else 0

    def get_is_subcontracted(self, obj):
        return obj.subcontractor_id is not None

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
            'subcontractor_name',
            'is_subcontracted',
        ]


class LabOrderCreateSerializer(serializers.Serializer):
    """Serializer for creating a lab order with tests and optional discounts"""
    patient_id = serializers.UUIDField()
    visit_id = serializers.UUIDField(required=False, allow_null=True)
    
    # We can accept test_ids as simple list or list of objects with discounts
    test_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )
    
    # New preferred format: [{test_id: uuid, discount: decimal}]
    tests_data = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )

    # Bilans (panels): [{panel_id: uuid, discount: decimal (optional)}]
    panels_data = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )

    subcontractor_id = serializers.UUIDField(required=False, allow_null=True)
    prescriber_id = serializers.UUIDField(required=False, allow_null=True)

    priority = serializers.ChoiceField(
        choices=LabOrder.PRIORITY_CHOICES,
        default='routine'
    )
    clinical_notes = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=[
            ('cash', 'Espèces'), 
            ('mobile_money', 'Mobile Money'),
            ('card', 'Carte Bancaire'),
            ('insurance', 'Assurance'),
            ('other', 'Autre')
        ],
        default='cash',
        required=False
    )

    def validate(self, data):
        if not data.get('test_ids') and not data.get('tests_data') and not data.get('panels_data'):
            raise serializers.ValidationError("Either test_ids, tests_data, or panels_data is required")
        return data


class EnterResultsSerializer(serializers.Serializer):
    """Serializer for entering lab results.

    Each result dict may contain:
    - item_id (required)
    - result_value (optional text for simple tests or global comment)
    - parameter_values (optional list of {parameter_id, result_numeric, result_text}
      for compound/structured tests like NFS)
    """
    results = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of result objects with item_id, result_value, and/or parameter_values"
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
            # result_value is now optional — parameter_values can be used instead
            if 'result_value' not in result and 'parameter_values' not in result:
                raise serializers.ValidationError(
                    "Each result must have either result_value or parameter_values"
                )
        return value


class LabTestPanelSerializer(serializers.ModelSerializer):
    """Serializer for LabTestPanel (bilans)"""
    tests_detail = LabTestListSerializer(source='tests', many=True, read_only=True)
    tests_count = serializers.SerializerMethodField()
    net_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = LabTestPanel
        fields = [
            'id', 'code', 'name', 'description',
            'price', 'discount', 'net_price',
            'tests', 'tests_detail', 'tests_count',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tests_count(self, obj):
        return obj.tests.count()


# =============================================================================
# Subcontractor Serializers
# =============================================================================

class SubcontractorPriceSerializer(serializers.ModelSerializer):
    lab_test_name = serializers.CharField(source='lab_test.name', read_only=True)
    lab_test_code = serializers.CharField(source='lab_test.test_code', read_only=True)
    lab_test_category = serializers.CharField(source='lab_test.category.name', read_only=True, default='')

    class Meta:
        model = SubcontractorPrice
        fields = [
            'id', 'subcontractor', 'lab_test', 'lab_test_name', 'lab_test_code',
            'lab_test_category', 'price', 'turnaround_days', 'is_active', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubcontractorLabSerializer(serializers.ModelSerializer):
    prices_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    b2b_client_id = serializers.SerializerMethodField()

    class Meta:
        model = SubcontractorLab
        fields = [
            'id', 'name', 'address', 'city', 'phone', 'fax', 'email', 'website',
            'logo', 'logo_url', 'header_image', 'footer_image', 'brand_color', 'header_text',
            'niu', 'rc_number', 'rccm_number', 'tax_number',
            'bank_name', 'bank_account',
            'is_active', 'prices_count', 'b2b_client_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_prices_count(self, obj):
        return obj.prices.filter(is_active=True).count()

    def get_b2b_client_id(self, obj):
        from apps.accounts.models import Client
        client = Client.objects.filter(
            organization=obj.organization, name=obj.name, client_type='b2b'
        ).first()
        return str(client.id) if client else None

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class SubcontractorLabListSerializer(serializers.ModelSerializer):
    prices_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SubcontractorLab
        fields = ['id', 'name', 'city', 'phone', 'email', 'brand_color', 'is_active', 'prices_count', 'logo_url']

    def get_prices_count(self, obj):
        return obj.prices.filter(is_active=True).count()

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class SubcontractorDefaultPriceSerializer(serializers.ModelSerializer):
    test_code = serializers.CharField(source='lab_test.code', read_only=True)
    test_name = serializers.CharField(source='lab_test.name', read_only=True)
    category_name = serializers.CharField(source='lab_test.category.name', read_only=True)
    lab_test_id = serializers.UUIDField(source='lab_test.id', read_only=True)

    class Meta:
        model = SubcontractorDefaultPrice
        fields = ['id', 'lab_test_id', 'test_code', 'test_name', 'category_name', 'price', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubcontractorPatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    subcontractor_name = serializers.CharField(source='subcontractor.name', read_only=True)
    client_id = serializers.UUIDField(source='client.id', read_only=True, default=None)
    resolved_age = serializers.SerializerMethodField()

    class Meta:
        model = SubcontractorPatient
        fields = [
            'id', 'subcontractor', 'subcontractor_name',
            'first_name', 'last_name', 'full_name',
            'date_of_birth', 'age', 'resolved_age', 'gender', 'phone', 'external_id',
            'client_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'subcontractor', 'created_at', 'updated_at']

    def get_resolved_age(self, obj):
        return obj.resolved_age


class SubcontractorPatientListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    client_id = serializers.UUIDField(source='client.id', read_only=True, default=None)
    resolved_age = serializers.SerializerMethodField()

    class Meta:
        model = SubcontractorPatient
        fields = ['id', 'first_name', 'last_name', 'full_name', 'date_of_birth', 'age', 'resolved_age', 'gender', 'phone', 'external_id', 'client_id']

    def get_resolved_age(self, obj):
        return obj.resolved_age
