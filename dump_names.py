import os
import django
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product
from apps.accounts.models import Organization

def dump():
    org = Organization.objects.get(name='Centre de Santé JULIANNA')
    products = Product.objects.filter(organization=org)
    with open('product_names_check.txt', 'w', encoding='utf-8') as f:
        for p in products:
            f.write(f"{p.name} | {p.reference} | {p.product_type}\n")
    print(f"Dumped {products.count()} items.")

if __name__ == "__main__":
    dump()
