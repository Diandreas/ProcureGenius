from rest_framework import serializers
from .models import MedicalDocument
from apps.accounts.models import Client, CustomUser


class PatientBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'date_of_birth', 'gender']


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'last_name', 'email']


class MedicalDocumentSerializer(serializers.ModelSerializer):
    patient_details = PatientBasicSerializer(source='patient', read_only=True)
    issued_by_details = UserBasicSerializer(source='issued_by', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = MedicalDocument
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'document_number', 'created_at', 'updated_at']
