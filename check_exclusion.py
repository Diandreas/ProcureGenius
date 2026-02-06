import os
import django
import sys
from django.db.models import Q

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

with open('results.txt', 'w', encoding='utf-8') as f:
    f.write("--- Testing Exclusion Logic ---\n")
    products_query = Product.objects.filter(is_active=True).exclude(
        Q(category__slug__in=['lab_consumables', 'lab-consumables', 'laboratory', 'lab-tests', 'lab_tests']) |
        Q(linked_lab_tests__isnull=False)
    )

    f.write(f"Total count after exclusion: {products_query.count()}\n")

    nfs = products_query.filter(name__icontains='NFS')
    if nfs.exists():
        f.write("FATAL: NFS is STILL in the queryset!\n")
        for p in nfs:
            f.write(f"Propagated Product: {p.name}\n")
            f.write(f"Category: {p.category.name if p.category else 'None'} (Slug: '{p.category.slug if p.category else ''}')\n")
            f.write(f"Linked Lab Tests Count: {p.linked_lab_tests.all().count()}\n")
    else:
        f.write("SUCCESS: NFS is excluded from the queryset.\n")

    f.write("\n--- Check Products with 'laboratory' slug ---\n")
    lab_prods = Product.objects.filter(category__slug='laboratory')
    f.write(f"Total 'laboratory' slug products: {lab_prods.count()}\n")
