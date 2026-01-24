import os
import django
from pathlib import Path

root = Path(r"d:\project\BFMa\ProcureGenius")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product
from apps.accounts.models import Organization

def dump_names():
    try:
        org = Organization.objects.get(name='Centre de Santé JULIANNA')
        products = Product.objects.filter(organization=org, product_type='physical').order_by('name')
        
        with open('product_dump.txt', 'w', encoding='utf-8') as f:
            for p in products:
                f.write(f"{p.name} | {p.reference}\n")
                
        print(f"Dumped {products.count()} references to product_dump.txt")
        
    except Exception as e:
        print(e)

if __name__ == "__main__":
    dump_names()
