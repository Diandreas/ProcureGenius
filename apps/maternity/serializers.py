from rest_framework import serializers
from .models import PregnancyRecord, PrenatalVisit, Delivery, Newborn, PostnatalVisit
from apps.accounts.models import Client, CustomUser


class PatientBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'email', 'date_of_birth', 'gender']


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'last_name', 'email']


class NewbornSerializer(serializers.ModelSerializer):
    class Meta:
        model = Newborn
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PostnatalVisitSerializer(serializers.ModelSerializer):
    doctor_details = UserBasicSerializer(source='doctor', read_only=True)
    newborn_details = NewbornSerializer(source='newborn', read_only=True)

    class Meta:
        model = PostnatalVisit
        fields = '__all__'
        read_only_fields = ['id', 'visit_invoice', 'created_at', 'updated_at']


class DeliverySerializer(serializers.ModelSerializer):
    newborns = NewbornSerializer(many=True, read_only=True)
    postnatal_visits = PostnatalVisitSerializer(many=True, read_only=True)
    hospitalization_status = serializers.CharField(source='hospitalization.status', read_only=True, default=None)
    hospitalization_number = serializers.CharField(source='hospitalization.id', read_only=True, default=None)

    class Meta:
        model = Delivery
        fields = '__all__'
        read_only_fields = ['id', 'delivery_invoice', 'created_at', 'updated_at']


class PrenatalVisitSerializer(serializers.ModelSerializer):
    doctor_details = UserBasicSerializer(source='doctor', read_only=True)

    class Meta:
        model = PrenatalVisit
        fields = '__all__'
        read_only_fields = ['id', 'visit_invoice', 'created_at', 'updated_at']


class PregnancyRecordListSerializer(serializers.ModelSerializer):
    """Version allégée pour les listes"""
    patient_details = PatientBasicSerializer(source='patient', read_only=True)
    last_visit_date = serializers.SerializerMethodField()
    has_delivered = serializers.SerializerMethodField()

    class Meta:
        model = PregnancyRecord
        fields = [
            'id', 'patient', 'patient_details', 'lmp_date', 'expected_delivery_date',
            'gravidity', 'parity', 'status', 'last_visit_date', 'has_delivered', 'created_at',
        ]

    def get_last_visit_date(self, obj):
        last = obj.prenatal_visits.order_by('-visit_date').first()
        return last.visit_date if last else None

    def get_has_delivered(self, obj):
        return hasattr(obj, 'delivery')


class PregnancyRecordSerializer(serializers.ModelSerializer):
    """Version complète pour le détail — inclut tout l'historique"""
    patient_details = PatientBasicSerializer(source='patient', read_only=True)
    referring_doctor_details = UserBasicSerializer(source='referring_doctor', read_only=True)
    prenatal_visits = PrenatalVisitSerializer(many=True, read_only=True)
    delivery = DeliverySerializer(read_only=True)

    class Meta:
        model = PregnancyRecord
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
