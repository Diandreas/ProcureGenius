import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import Client, CustomUser
from apps.patients.serializers import PatientSerializer
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

def reproduce():
    patient_id = "cb1b900d-a863-49ba-a73f-7dd510a1f046"
    print(f"Attempting to fetch patient {patient_id}")
    
    try:
        patient = Client.objects.get(id=patient_id)
        print(f"Found patient: {patient.name}")
    except Client.DoesNotExist:
        print("Patient not found in DB")
        return
    except Exception as e:
        print(f"Error fetching patient: {e}")
        return

    print("Attempting serialization...")
    try:
        serializer = PatientSerializer(patient)
        data = serializer.data
        print("Serialization successful")
        # print(data)
    except Exception as e:
        print(f"Serialization FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reproduce()
