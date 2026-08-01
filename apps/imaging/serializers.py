"""
Serializers for Imaging app
"""
from rest_framework import serializers
from .models import ImagingExamCategory, ImagingExamType, ImagingOrder, ImagingOrderItem, ImagingResultFile


class ImagingExamCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingExamCategory
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at']


class ImagingExamTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    modality_display = serializers.CharField(source='get_modality_display', read_only=True)

    class Meta:
        model = ImagingExamType
        fields = [
            'id', 'category', 'category_name', 'exam_code', 'name', 'short_name',
            'modality', 'modality_display', 'description', 'price', 'discount',
            'estimated_duration_minutes', 'is_active', 'created_at', 'updated_at',
        ]


class ImagingResultFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = ImagingResultFile
        fields = ['id', 'order_item', 'file', 'file_type', 'caption', 'uploaded_at', 'uploaded_by', 'uploaded_by_name']
        read_only_fields = ['id', 'file_type', 'uploaded_at', 'uploaded_by']


class ImagingOrderItemSerializer(serializers.ModelSerializer):
    exam_type_detail = ImagingExamTypeSerializer(source='exam_type', read_only=True)
    result_files = ImagingResultFileSerializer(many=True, read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True, default=None)
    report_entered_by_name = serializers.CharField(source='report_entered_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = ImagingOrderItem
        fields = [
            'id', 'imaging_order', 'exam_type', 'exam_type_detail', 'price', 'discount',
            'report_text', 'technician_notes', 'is_urgent_finding',
            'performed_at', 'performed_by', 'performed_by_name',
            'report_entered_at', 'report_entered_by', 'report_entered_by_name',
            'result_files', 'created_at', 'updated_at',
        ]


class ImagingOrderSerializer(serializers.ModelSerializer):
    """Full serializer for ImagingOrder"""
    items = ImagingOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.SerializerMethodField()
    subcontractor_name = serializers.CharField(source='subcontractor.name', read_only=True, default=None)
    is_subcontracted = serializers.SerializerMethodField()
    ordered_by_name = serializers.SerializerMethodField()
    results_entered_by_name = serializers.CharField(source='results_entered_by.get_full_name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    exams_count = serializers.IntegerField(read_only=True)
    all_results_entered = serializers.BooleanField(read_only=True)
    imaging_invoice = serializers.SerializerMethodField()
    prescriber_name = serializers.SerializerMethodField()

    class Meta:
        model = ImagingOrder
        fields = [
            'id', 'organization', 'order_number',
            'patient', 'patient_name', 'patient_number', 'patient_gender', 'patient_age',
            'visit', 'order_date', 'status', 'status_display', 'priority', 'priority_display',
            'clinical_notes', 'ordered_by', 'ordered_by_name',
            'prescriber', 'prescriber_name',
            'results_completed_at', 'results_entered_by', 'results_entered_by_name',
            'results_delivered_at',
            'imaging_invoice', 'items', 'total_price', 'discount', 'payment_method',
            'exams_count', 'all_results_entered',
            'subcontractor', 'subcontractor_name', 'is_subcontracted',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 'results_completed_at', 'results_delivered_at']

    def get_is_subcontracted(self, obj):
        return obj.subcontractor_id is not None

    def get_patient_age(self, obj):
        return obj.patient.get_age() if obj.patient else None

    def get_ordered_by_name(self, obj):
        if obj.ordered_by:
            return obj.ordered_by.get_full_name() or obj.ordered_by.username
        return None

    def get_imaging_invoice(self, obj):
        if obj.imaging_invoice:
            return {
                'id': str(obj.imaging_invoice.id),
                'invoice_number': obj.imaging_invoice.invoice_number,
                'status': obj.imaging_invoice.status,
                'total_amount': str(obj.imaging_invoice.total_amount),
            }
        return None

    def get_prescriber_name(self, obj):
        return str(obj.prescriber) if obj.prescriber else None


class ImagingOrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order lists"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    exams_count = serializers.SerializerMethodField()
    subcontractor_name = serializers.CharField(source='subcontractor.name', read_only=True, default=None)
    is_subcontracted = serializers.SerializerMethodField()

    def get_exams_count(self, obj):
        return obj.items.count() if hasattr(obj, 'items') else 0

    def get_is_subcontracted(self, obj):
        return obj.subcontractor_id is not None

    class Meta:
        model = ImagingOrder
        fields = [
            'id', 'order_number', 'patient', 'patient_name', 'order_date',
            'status', 'status_display', 'priority', 'priority_display',
            'exams_count', 'total_price', 'subcontractor_name', 'is_subcontracted',
        ]


class ImagingOrderCreateSerializer(serializers.Serializer):
    """Serializer for creating an imaging order with one or more exam types"""
    patient_id = serializers.UUIDField()
    visit_id = serializers.UUIDField(required=False, allow_null=True)
    exam_type_ids = serializers.ListField(child=serializers.UUIDField())
    subcontractor_id = serializers.UUIDField(required=False, allow_null=True)
    prescriber_id = serializers.UUIDField(required=False, allow_null=True)
    priority = serializers.ChoiceField(choices=ImagingOrder.PRIORITY_CHOICES, default='routine')
    clinical_notes = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=ImagingOrder.PAYMENT_METHOD_CHOICES, default='cash', required=False
    )

    def validate_exam_type_ids(self, value):
        if not value:
            raise serializers.ValidationError("Au moins un examen est requis")
        return value


class EnterImagingResultsSerializer(serializers.Serializer):
    """Serializer for entering imaging results.

    items: [{item_id, report_text, technician_notes (optional), is_urgent_finding (optional)}]
    """
    items = serializers.ListField(
        child=serializers.DictField(),
        help_text="Liste de {item_id, report_text, technician_notes, is_urgent_finding}"
    )

    def validate_items(self, value):
        for item in value:
            if 'item_id' not in item:
                raise serializers.ValidationError("Chaque item doit avoir un item_id")
        return value
