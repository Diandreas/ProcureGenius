
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

def verify():
    from apps.laboratory.models import LabTestCategory, LabTest
    from apps.invoicing.models import ProductCategory, Product
    
    categories = LabTestCategory.objects.all().count()
    tests = LabTest.objects.all().count()
    products = Product.objects.filter(category__slug='consultations').count()
    
    print(f"Lab Categories: {categories}")
    print(f"Lab Tests: {tests}")
    print(f"Consultation Products: {products}")
    
    if categories > 0 and tests > 0 and products > 0:
        print("VERIFICATION_SUCCESS: Data setup confirmed.")
    else:
        print("VERIFICATION_FAILURE: Data missing.")

if __name__ == '__main__':
    verify()
