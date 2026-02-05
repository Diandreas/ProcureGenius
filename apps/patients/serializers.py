"""
Serializers for Patients app
"""
from rest_framework import serializers
from django.utils import timezone
from apps.accounts.models import Client
from .models import PatientVisit


class PatientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model when used as Patient
    """
    age = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='name', read_only=True)
    visits_count = serializers.SerializerMethodField()
    last_visit_date = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id',
            'organization',
            'name',
            'full_name',
            'email',
            'phone',
            'address',
            'client_type',
            'patient_number',
            'date_of_birth',
            'age',
            'gender',
            'blood_type',
            'allergies',
            'chronic_conditions',
            'emergency_contact_name',
            'emergency_contact_phone',
            'whatsapp',
            'registration_source',
            'referring_hospital',
            'is_active',
            'visits_count',
            'last_visit_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'patient_number', 'created_at', 'updated_at']
    
    def get_age(self, obj):
        """Calculate age from date of birth"""
        return obj.get_age()
    
    def get_visits_count(self, obj):
        """Get total number of visits"""
        return obj.visits.count() if hasattr(obj, 'visits') else 0
    
    def get_last_visit_date(self, obj):
        """Get date of last visit"""
        if hasattr(obj, 'visits'):
            last_visit = obj.visits.order_by('-arrived_at').first()
            if last_visit:
                return last_visit.arrived_at
        return None
    
    def create(self, validated_data):
        """Ensure client_type is set to patient"""
        if 'client_type' not in validated_data:
            validated_data['client_type'] = 'patient'
        return super().create(validated_data)


class PatientListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for patient lists
    """
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id',
            'name',
            'patient_number',
            'phone',
            'gender',
            'age',
            'is_active',
            'created_at',
        ]
    
    def get_age(self, obj):
        return obj.get_age()


class PatientVisitSerializer(serializers.ModelSerializer):
    """
    Serializer for PatientVisit model
    """
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    registered_by_name = serializers.SerializerMethodField()
    wait_time = serializers.IntegerField(source='wait_time_minutes', read_only=True)
    consultation_duration = serializers.IntegerField(source='consultation_duration_minutes', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = PatientVisit
        fields = [
            'id',
            'organization',
            'visit_number',
            'patient',
            'patient_name',
            'patient_number',
            'visit_type',
            'visit_type_display',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'chief_complaint',
            'notes',
            'assigned_doctor',
            'doctor_name',
            'registered_by',
            'registered_by_name',
            'consultation_invoice',
            'arrived_at',
            'consultation_started_at',
            'consultation_ended_at',
            'completed_at',
            'wait_time',
            'consultation_duration',
            'vitals_weight',
            'vitals_height',
            'vitals_temperature',
            'vitals_systolic',
            'vitals_diastolic',
            'vitals_blood_glucose',
            'vitals_spo2',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'visit_number', 'created_at', 'updated_at',
            'consultation_started_at', 'consultation_ended_at', 'completed_at'
        ]
    
    def get_doctor_name(self, obj):
        if obj.assigned_doctor:
            return obj.assigned_doctor.get_full_name() or obj.assigned_doctor.username
        return None
    
    def get_registered_by_name(self, obj):
        if obj.registered_by:
            return obj.registered_by.get_full_name() or obj.registered_by.username
        return None


class PatientVisitListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for visit lists
    """
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    wait_time = serializers.IntegerField(source='wait_time_minutes', read_only=True)
    
    class Meta:
        model = PatientVisit
        fields = [
            'id',
            'visit_number',
            'patient',
            'patient_name',
            'visit_type',
            'visit_type_display',
            'status',
            'status_display',
            'priority',
            'arrived_at',
            'wait_time',
        ]


class CheckInSerializer(serializers.Serializer):
    """
    Serializer for patient check-in
    """
    patient_id = serializers.UUIDField()
    visit_type = serializers.ChoiceField(choices=PatientVisit.VISIT_TYPES, default='consultation')
    priority = serializers.ChoiceField(choices=PatientVisit.PRIORITY_CHOICES, default='routine')
    chief_complaint = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    assigned_doctor_id = serializers.UUIDField(required=False, allow_null=True)


from .models_care import PatientCareService

class PatientCareServiceSerializer(serializers.ModelSerializer):
    """
    Serializer for PatientCareService model
    """
    provided_by_name = serializers.SerializerMethodField()
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    
    class Meta:
        model = PatientCareService
        fields = [
            'id',
            'patient',
            'service_product',
            'service_type',
            'service_type_display',
            'service_name',
            'service_category',
            'provided_by',
            'provided_by_name',
            'provided_at',
            'is_billed',
            'quantity',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_provided_by_name(self, obj):
        if obj.provided_by:
            return obj.provided_by.get_full_name() or obj.provided_by.username
        return None


class LabOrderHistorySerializer(serializers.Serializer):
    """Serializer for lab order history in patient detail"""
    id = serializers.UUIDField()
    order_number = serializers.CharField()
    order_date = serializers.DateTimeField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    priority = serializers.CharField()
    tests_count = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    def get_status_display(self, obj):
        return obj.get_status_display() if hasattr(obj, 'get_status_display') else obj.status

    def get_tests_count(self, obj):
        return obj.items.count() if hasattr(obj, 'items') else 0

    def get_items(self, obj):
        """Return simplified test items"""
        try:
            if not hasattr(obj, 'items'):
                return []
            items_list = []
            for item in obj.items.all():
                try:
                    items_list.append({
                        'id': str(item.id),
                        'test_name': item.lab_test.name if item.lab_test else '',
                        'result_value': item.result_value or '',
                        'is_abnormal': item.is_abnormal,
                    })
                except Exception:
                    continue
            return items_list
        except Exception:
            return []


class PharmacyDispensingHistorySerializer(serializers.Serializer):
    """Serializer for pharmacy dispensing history in patient detail"""
    id = serializers.UUIDField()
    dispensing_number = serializers.CharField()
    dispensed_at = serializers.DateTimeField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    dispensed_by_name = serializers.SerializerMethodField()
    medications_count = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    def get_status_display(self, obj):
        return obj.get_status_display() if hasattr(obj, 'get_status_display') else obj.status

    def get_dispensed_by_name(self, obj):
        if obj.dispensed_by:
            return obj.dispensed_by.get_full_name() or obj.dispensed_by.username
        return None

    def get_medications_count(self, obj):
        return obj.items.count() if hasattr(obj, 'items') else 0

    def get_items(self, obj):
        """Return simplified medication items"""
        try:
            if not hasattr(obj, 'items'):
                return []
            items_list = []
            for item in obj.items.all():
                try:
                    items_list.append({
                        'id': str(item.id),
                        'medication_name': item.medication.name if item.medication else '',
                        'quantity_dispensed': item.quantity_dispensed,
                        'dosage_instructions': item.dosage_instructions or '',
                    })
                except Exception:
                    continue
            return items_list
        except Exception:
            return []


class ConsultationHistorySerializer(serializers.Serializer):
    """Serializer for consultation history in patient detail"""
    id = serializers.UUIDField()
    consultation_number = serializers.CharField()
    consultation_date = serializers.DateTimeField()
    doctor_name = serializers.SerializerMethodField()
    chief_complaint = serializers.CharField()
    diagnosis = serializers.CharField()

    def get_doctor_name(self, obj):
        if obj.doctor:
            return obj.doctor.get_full_name() or obj.doctor.username
        return None
