from rest_framework import serializers
from .models import VaccineCategory, VaccineType, VaccinationRecord


class VaccineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccineCategory
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at']


class VaccineTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    target_population_display = serializers.CharField(source='get_target_population_display', read_only=True)

    class Meta:
        model = VaccineType
        fields = [
            'id', 'category', 'category_name', 'code', 'name', 'description',
            'target_population', 'target_population_display', 'is_billable', 'price',
            'standard_doses_count', 'dose_interval_days', 'is_active', 'created_at', 'updated_at',
        ]


class VaccinationRecordSerializer(serializers.ModelSerializer):
    vaccine_type_detail = VaccineTypeSerializer(source='vaccine_type', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    administered_by_name = serializers.CharField(source='administered_by.get_full_name', read_only=True, default=None)
    invoice_detail = serializers.SerializerMethodField()

    class Meta:
        model = VaccinationRecord
        fields = [
            'id', 'patient', 'patient_name', 'vaccine_type', 'vaccine_type_detail',
            'pregnancy', 'dose_number', 'administered_date', 'administered_by', 'administered_by_name',
            'batch_number', 'next_dose_due_date', 'notes', 'invoice', 'invoice_detail',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'invoice', 'created_at', 'updated_at']
        extra_kwargs = {
            # Non requis au niveau serializer : quand la création vient du dossier
            # de grossesse (Maternité), seul `pregnancy` est envoyé et la vue
            # (perform_create) déduit `patient` automatiquement depuis celle-ci.
            'patient': {'required': False},
        }

    def validate(self, attrs):
        if not attrs.get('patient') and not attrs.get('pregnancy'):
            raise serializers.ValidationError("Il faut fournir soit un patient, soit une grossesse.")
        return attrs

    def get_invoice_detail(self, obj):
        if obj.invoice:
            return {
                'id': str(obj.invoice.id),
                'invoice_number': obj.invoice.invoice_number,
                'status': obj.invoice.status,
                'total_amount': str(obj.invoice.total_amount),
            }
        return None
