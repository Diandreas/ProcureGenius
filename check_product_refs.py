import sys
import os
import django
from pathlib import Path

# Add project root to sys.path
root = Path(r"d:\project\BFMa\ProcureGenius")
sys.path.append(str(root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

def check_collisions():
    print("Existing references (first 50):")
    refs = list(Product.objects.values_list('reference', 'organization__name')[:50])
    for ref, org_name in refs:
        print(f"  - {ref} ({org_name})")

if __name__ == "__main__":
    check_collisions()
