import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabTest, LabOrder
from apps.invoicing.models import Product
from apps.core.models import OrganizationSettings

def check_hcg():
    print("Checking HCG Pregnancy Test...")
    tests = LabTest.objects.filter(test_code__icontains='HCG')
    for test in tests:
        print(f"Test: {test.name} (Code: {test.test_code})")
        print(f"  Linked Product: {test.linked_product}")
        if test.linked_product:
            print(f"  Product Stock: {test.linked_product.stock_quantity}")
            print(f"  Product Type: {test.linked_product.product_type}")
        else:
            print("  NO LINKED PRODUCT!")
    
    # Check OrganizationSettings
    org_settings = OrganizationSettings.objects.first()
    if org_settings:
        print(f"\nOrganization Settings for {org_settings.organization.name}:")
        print(f"  auto_generate_lab_kits: {org_settings.auto_generate_lab_kits}")
    else:
        print("\nNo OrganizationSettings found!")

if __name__ == "__main__":
    check_hcg()
