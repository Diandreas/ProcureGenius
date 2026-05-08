from rest_framework import serializers
from .models import Hospitalization
from apps.accounts.models import Client, CustomUser

class PatientBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'email', 'date_of_birth', 'gender']

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'last_name', 'email']

class HospitalizationSerializer(serializers.ModelSerializer):
    patient_details = PatientBasicSerializer(source='patient', read_only=True)
    admitting_doctor_details = UserBasicSerializer(source='admitting_doctor', read_only=True)
    discharging_doctor_details = UserBasicSerializer(source='discharging_doctor', read_only=True)

    class Meta:
        model = Hospitalization
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Check that discharge_date is not before admission_date.
        """
        admission_date = data.get('admission_date', getattr(self.instance, 'admission_date', None))
        discharge_date = data.get('discharge_date', getattr(self.instance, 'discharge_date', None))

        if admission_date and discharge_date and discharge_date < admission_date:
            raise serializers.ValidationError({"discharge_date": "La date de sortie ne peut pas être antérieure à la date d'admission."})
            
        return data
