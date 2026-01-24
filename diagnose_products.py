import os
import django
from pathlib import Path
from collections import Counter

# Setup Django
root = Path(r"d:\project\BFMa\ProcureGenius")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product
from apps.accounts.models import Organization

def diagnose_products():
    try:
        org = Organization.objects.get(name='Centre de Santé JULIANNA')
        print(f"Organization: {org.name} (ID: {org.id})")
        
        products = Product.objects.filter(organization=org, product_type='physical')
        print(f"Total Physical Products: {products.count()}")
        
        # Analyze by source/category
        categories = Counter()
        for p in products:
            cat_name = p.category.name if p.category else "No Category"
            categories[cat_name] += 1
            
        print("\nBreakdown by Category:")
        for cat, count in categories.most_common():
            print(f"  - {cat}: {count}")
            
        # Check for specific "invented" items from config
        print("\nSample Products (first 10):")
        for p in products[:10]:
            print(f"  - {p.name} (Ref: {p.reference})")

        # Check specifically for supplies from config
        supplies = ['Compresses', 'Sparadrap', 'Sérum Physiologique', 'Perfuseur', 'Sonde de Foley']
        print("\nChecking for hardcoded supplies:")
        for s in supplies:
            found = products.filter(name__icontains=s).count()
            print(f"  - {s}: {found}")

    except Organization.DoesNotExist:
        print("Organization 'Centre de Santé JULIANNA' not found!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    diagnose_products()
