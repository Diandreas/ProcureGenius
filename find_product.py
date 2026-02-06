import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

print("--- Searching for NFS ---")
products = Product.objects.filter(name__icontains='NFS')
if not products.exists():
    print("No product found with name containing 'NFS'")
else:
    for p in products:
        print(f"ID: {p.id}")
        print(f"Name: {p.name}")
        print(f"Type: {p.product_type}")
        print(f"Category: {p.category.name if p.category else 'None'} (Slug: {p.category.slug if p.category else 'None'})")
        print(f"Is Active: {p.is_active}")
        
        # Check reverse relationships if possible
        # print(f"Linked Lab Tests: {p.linked_lab_tests.all().count()}")
