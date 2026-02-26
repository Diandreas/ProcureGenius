
import os
import django
from django.conf import settings
from django.db import transaction, models
from django.db.models.functions import Lower
from django.db.models import Count

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, InvoiceItem, StockMovement, ProductBatch
from apps.purchase_orders.models import PurchaseOrderItem
from apps.suppliers.models import SupplierProduct

def merge_and_fix():
    print("--- Starting Product Merge and Stock Correction ---")
    
    with transaction.atomic():
        # 1. Identify duplicates by name
        duplicates = Product.objects.annotate(lower_name=Lower('name')).values('lower_name', 'organization').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        print("Found {} sets of duplicates to merge.".format(duplicates.count()))
        
        for dup in duplicates:
            name = dup['lower_name']
            org_id = dup['organization']
            
            # Get all instances, oldest first (will be the Master)
            prods = list(Product.objects.filter(name__iexact=name, organization_id=org_id).order_by('created_at'))
            master = prods[0]
            others = prods[1:]
            
            print("
Merging into Master: {} (ID: {})".format(master.name, master.id))
            
            for other in others:
                print("  <- Merging: {} (ID: {}, Ref: {})".format(other.name, other.id, other.reference))
                
                # Transfer InvoiceItems
                InvoiceItem.objects.filter(product=other).update(product=master)
                
                # Transfer StockMovements
                StockMovement.objects.filter(product=other).update(product=master)
                
                # Transfer Batches
                ProductBatch.objects.filter(product=other).update(product=master)
                
                # Transfer PO Items
                PurchaseOrderItem.objects.filter(product=other).update(product=master)
                
                # Transfer Supplier Relations
                SupplierProduct.objects.filter(product=other).update(product=master)
                
                # Transfer Pharmacy Dispensing if app exists
                try:
                    from apps.pharmacy.models import DispensingItem
                    DispensingItem.objects.filter(medication=other).update(medication=master)
                except: pass

                # Delete the duplicate
                other.delete()

        # 2. Recalculate Stock for ALL physical products based on batches
        print("
Recalculating stock levels from batches...")
        for p in Product.objects.filter(product_type='physical'):
            batch_sum = p.batches.aggregate(models.Sum('quantity_remaining'))['quantity_remaining__sum'] or 0
            if p.stock_quantity != batch_sum:
                print("  - {}: {} -> {}".format(p.name, p.stock_quantity, batch_sum))
                p.stock_quantity = batch_sum
                p.save(update_fields=['stock_quantity'])

    print("
--- Process Complete ---")

if __name__ == "__main__":
    merge_and_fix()
