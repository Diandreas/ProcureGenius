import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.pharmacy.api import MedicationListView
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import CustomUser

def verify_api():
    try:
        user = CustomUser.objects.get(username='julianna_admin')
        factory = APIRequestFactory()
        request = factory.get('/api/v1/healthcare/pharmacy/medications/')
        force_authenticate(request, user=user)
        view = MedicationListView.as_view()
        response = view(request)
        
        print(f"Status: {response.status_code}")
        results = response.data.get('results', [])
        print(f"Total products found: {len(results)}")
        
        # Breakdown by category slug
        categories = {}
        for p in results:
            # Note: in the serializer, category might not be fully expanded depending on implementation
            # But we can check via the queryset directly
            pass
            
        # Let's check the queryset directly from the view
        view_instance = MedicationListView()
        view_instance.request = request
        view_instance.format_kwarg = None
        # Initialize query_params manually for testing
        view_instance.kwargs = {}
        request.query_params = {} # DRF Request usually has this, but just in case
        
        qs = view_instance.get_queryset()
        
        print(f"Queryset count: {qs.count()}")
        
        med_count = qs.filter(category__slug__in=['medications', 'medicaments']).count()
        kit_count = qs.filter(category__slug='lab-consumables').count()
        
        print(f"Medications count: {med_count}")
        print(f"Lab Kits count: {kit_count}")
        
        if med_count > 0 and kit_count > 0:
            print("SUCCESS: Both medications and lab kits are present in the pharmacy inventory.")
        else:
            print("FAILURE: Missing medications or lab kits.")
            
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_api()
