import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product, ProductCategory

with open('debug_output_utf8.txt', 'w', encoding='utf-8') as f:
    f.write("--- DataBase Categories ---\n")
    for cat in ProductCategory.objects.all():
        f.write(f"Name: {cat.name}, Slug: {cat.slug}\n")

    f.write("\n--- Sample Products (First 50) ---\n")
    for p in Product.objects.all()[:50]:
        f.write(f"Name: {p.name}, Type: {p.product_type}, Category: {p.category.slug if p.category else 'None'}\n")
