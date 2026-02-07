"""
Serializers for Consultations app
"""
from rest_framework import serializers
from .models import Consultation, Prescription, PrescriptionItem


class PrescriptionItemSerializer(serializers.ModelSerializer):
    """Serializer for PrescriptionItem"""
    medication_display = serializers.SerializerMethodField()
    route_display = serializers.CharField(source='get_route_display', read_only=True)
    remaining_quantity = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PrescriptionItem
        fields = [
            'id',
            'prescription',
            'medication',
            'medication_name',
            'medication_display',
            'dosage',
            'frequency',
            'duration',
            'route',
            'route_display',
            'quantity_prescribed',
            'quantity_dispensed',
            'remaining_quantity',
            'is_dispensed',
            'instructions',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_medication_display(self, obj):
        if obj.medication:
            return obj.medication.name
        return obj.medication_name


class PrescriptionSerializer(serializers.ModelSerializer):
    """Full serializer for Prescription"""
    items = PrescriptionItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    prescriber_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    all_dispensed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'id',
            'organization',
            'prescription_number',
            'consultation',
            'patient',
            'patient_name',
            'prescriber',
            'prescriber_name',
            'prescribed_date',
            'status',
            'status_display',
            'is_expired',
            'notes',
            'pharmacy_dispensing',
            'items',
            'items_count',
            'all_dispensed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'prescription_number', 'created_at', 'updated_at']
    
    def get_prescriber_name(self, obj):
        if obj.prescriber:
            return obj.prescriber.get_full_name() or obj.prescriber.username
        return None


class PrescriptionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for prescription lists"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'id',
            'prescription_number',
            'patient',
            'patient_name',
            'prescribed_date',
            'status',
            'status_display',
            'items_count',
        ]


class ConsultationSerializer(serializers.ModelSerializer):
    """Full serializer for Consultation"""
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    lab_orders_data = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    blood_pressure = serializers.CharField(read_only=True)
    bmi = serializers.DecimalField(max_digits=4, decimal_places=1, read_only=True)
    bmi_category = serializers.CharField(read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    wait_time_minutes = serializers.IntegerField(read_only=True)
    consultation_invoice = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vitals_taken_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = [
            'id',
            'organization',
            'consultation_number',
            'patient',
            'patient_name',
            'patient_number',
            'visit',
            'doctor',
            'doctor_name',
            'consultation_date',
            'fee',
            # Workflow
            'status',
            'status_display',
            'queue_position',
            'vitals_taken_by',
            'vitals_taken_by_name',
            'vitals_taken_at',
            # Timing
            'started_at',
            'ended_at',
            'duration_minutes',
            'wait_time_minutes',
            # Vital signs
            'temperature',
            'blood_pressure_systolic',
            'blood_pressure_diastolic',
            'blood_pressure',
            'blood_glucose',
            'respiratory_rate',
            'oxygen_saturation',
            'heart_rate',
            'weight',
            'height',
            'bmi',
            'bmi_category',
            # Clinical info
            'chief_complaint',
            'history_of_present_illness',
            'physical_examination',
            'diagnosis',
            'diagnosis_codes',
            'treatment_plan',
            # Follow-up
            'follow_up_required',
            'follow_up_date',
            'follow_up_instructions',
            # Notes
            'private_notes',
            'patient_instructions',
            # Prescriptions
            'prescriptions',
            'lab_orders_data',
            # Invoice
            'consultation_invoice',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'consultation_number', 'created_at', 'updated_at', 'queue_position']

    def get_doctor_name(self, obj):
        if obj.doctor:
            return obj.doctor.get_full_name() or obj.doctor.username
        return None

    def get_vitals_taken_by_name(self, obj):
        if obj.vitals_taken_by:
            return obj.vitals_taken_by.get_full_name() or obj.vitals_taken_by.username
        return None

    def get_lab_orders_data(self, obj):
        """Get lab orders with items"""
        lab_orders = obj.lab_orders.all().prefetch_related('items__lab_test')
        if not lab_orders:
            return []

        result = []
        for order in lab_orders:
            result.append({
                'id': str(order.id),
                'order_number': order.order_number,
                'status': order.status,
                'status_display': order.get_status_display(),
                'priority': order.priority,
                'clinical_notes': order.clinical_notes,
                'total_price': float(order.total_price),
                'order_date': order.order_date,
                'tests': [
                    {
                        'id': str(item.id),
                        'test_name': item.lab_test.name,
                        'test_code': item.lab_test.test_code,
                        'price': float(item.price),
                    }
                    for item in order.items.all()
                ]
            })
        return result

    def get_consultation_invoice(self, obj):
        if obj.consultation_invoice:
            return {
                'id': str(obj.consultation_invoice.id),
                'invoice_number': obj.consultation_invoice.invoice_number,
                'status': obj.consultation_invoice.status,
                'total_amount': str(obj.consultation_invoice.total_amount)
            }
        return None


class ConsultationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for consultation lists"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id',
            'consultation_number',
            'patient',
            'patient_name',
            'patient_number',
            'doctor',
            'doctor_name',
            'consultation_date',
            'status',
            'status_display',
            'queue_position',
            'chief_complaint',
            'diagnosis',
            'follow_up_required',
        ]

    def get_doctor_name(self, obj):
        if obj.doctor:
            return obj.doctor.get_full_name() or obj.doctor.username
        return None


class VitalSignsSerializer(serializers.Serializer):
    """Serializer for updating vital signs only"""
    temperature = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    blood_pressure_systolic = serializers.IntegerField(required=False, allow_null=True)
    blood_pressure_diastolic = serializers.IntegerField(required=False, allow_null=True)
    blood_glucose = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    respiratory_rate = serializers.IntegerField(required=False, allow_null=True)
    oxygen_saturation = serializers.IntegerField(required=False, allow_null=True)
    weight = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    height = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)


class PrescriptionItemCreateSerializer(serializers.Serializer):
    """Serializer for creating prescription items"""
    medication_id = serializers.UUIDField(required=False, allow_null=True)
    medication_name = serializers.CharField(required=False, allow_blank=True)
    dosage = serializers.CharField()
    frequency = serializers.CharField()
    duration = serializers.CharField(required=False, allow_blank=True)
    route = serializers.ChoiceField(choices=PrescriptionItem.ROUTE_CHOICES, default='oral')
    quantity_prescribed = serializers.IntegerField(min_value=1)
    instructions = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if not data.get('medication_id') and not data.get('medication_name'):
            raise serializers.ValidationError(
                "Either medication_id or medication_name is required"
            )
        return data


class PrescriptionCreateSerializer(serializers.Serializer):
    """Serializer for creating a prescription with items"""
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
    patient_id = serializers.UUIDField()
    items = PrescriptionItemCreateSerializer(many=True, min_length=1)
    notes = serializers.CharField(required=False, allow_blank=True)
