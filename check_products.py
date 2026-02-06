import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

def check_products():
    print("=== PRODUCT PRICE CHECK ===")
    products = Product.objects.all()
    print(f"Total products: {products.count()}")
    for p in products:
        print(f"ID: {p.id} | Name: {p.name} | Ref: {p.reference} | Price: {p.price} | Type: {p.product_type}")
        if p.price is None:
            print(f"  !!! WARNING: Price is None for {p.name}")
        elif p.price == 0:
            print(f"  !!! WARNING: Price is 0 for {p.name}")

if __name__ == '__main__':
    check_products()
