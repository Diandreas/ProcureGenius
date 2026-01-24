import os
import django
from pathlib import Path

root = Path(r"d:\project\BFMa\ProcureGenius")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product
from apps.accounts.models import Organization
from apps.laboratory.models import LabTest

def print_counts():
    try:
        org = Organization.objects.get(name='Centre de Santé JULIANNA')
        print(f"Org: {org.name}")
        print(f"Users: {org.users.count()}")
        print(f"Total Products: {org.products.count()}")
        print(f"  Services (Care): {org.products.filter(category__name__in=['Consultation', 'Hospitalisation', 'Petite chirurgie', 'ORL', 'Laboratoire']).count()}")
        print(f"  Lab Services (Product): {org.products.filter(reference__startswith='JUL-LAB').count()}")
        print(f"  Pharmacy items (Physical): {org.products.filter(product_type='physical').count()}")
        print(f"Lab Tests (Model): {LabTest.objects.filter(organization=org).count()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print_counts()
