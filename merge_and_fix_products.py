import os
import django
import re
from django.conf import settings
from django.db import transaction, models
from django.db.models import Count

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, InvoiceItem, StockMovement, ProductBatch
from apps.purchase_orders.models import PurchaseOrderItem
from apps.suppliers.models import SupplierProduct

def normalize_name(name):
    """Normalize name: lowercase, remove special chars and all spaces."""
    if not name:
        return ""
    # Lowercase
    name = name.lower()
    # Remove everything that is not alphanumeric
    name = re.sub(r'[^a-z0-9]', '', name)
    return name

def merge_and_fix():
    print("--- Starting SMARTER Product Merge (Fuzzy names) ---")
    
    with transaction.atomic():
        # Get all products
        all_products = Product.objects.all().order_by('created_at')
        
        # Group by (organization, normalized_name)
        groups = {}
        for p in all_products:
            key = (p.organization_id, normalize_name(p.name))
            if key not in groups:
                groups[key] = []
            groups[key].append(p)
        
        for key, products in groups.items():
            if len(products) > 1:
                master = products[0]
                others = products[1:]
                
                org_id, norm_name = key
                print("\n[GROUP] Normalized: '{}' | Merging {} instances".format(norm_name, len(products)))
                print("  -> MASTER: {} (ID: {}, Ref: {})".format(master.name, master.id, master.reference))
                
                for other in others:
                    print("  <- MERGING: {} (ID: {}, Ref: {})".format(other.name, other.id, other.reference))
                    
                    # Transfer everything
                    InvoiceItem.objects.filter(product=other).update(product=master)
                    StockMovement.objects.filter(product=other).update(product=master)
                    ProductBatch.objects.filter(product=other).update(product=master)
                    PurchaseOrderItem.objects.filter(product=other).update(product=master)
                    SupplierProduct.objects.filter(product=other).update(product=master)
                    
                    try:
                        from apps.pharmacy.models import DispensingItem
                        DispensingItem.objects.filter(medication=other).update(medication=master)
                    except: pass

                    # Delete duplicate
                    other.delete()

        # 2. Recalculate Stock for ALL physical products based on batches
        print("\nRecalculating stock levels from batches...")
        for p in Product.objects.filter(product_type='physical'):
            batch_sum = p.batches.aggregate(models.Sum('quantity_remaining'))['quantity_remaining__sum'] or 0
            if p.stock_quantity != batch_sum:
                print("  - {}: {} -> {}".format(p.name, p.stock_quantity, batch_sum))
                p.stock_quantity = batch_sum
                p.save(update_fields=['stock_quantity'])

    print("\n--- Smart Process Complete ---")

if __name__ == "__main__":
    merge_and_fix()
