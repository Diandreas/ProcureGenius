import os
import django
import glob
import openpyxl
from decimal import Decimal
from django.conf import settings
from django.db import transaction, models
from django.db.models.functions import Lower
from django.utils import timezone
from datetime import timedelta

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, InvoiceItem, StockMovement, ProductBatch
from apps.purchase_orders.models import PurchaseOrderItem
from apps.suppliers.models import SupplierProduct

def normalize_all_strict():
    print("Starting STRICT Normalization (Excel is the ONLY source of truth)...")
    
    with transaction.atomic():
        # --- 1. LOAD EXCEL DATA ---
        excel_files = glob.glob("Liste des*.xlsx")
        if not excel_files:
            print("Error: Excel file not found.")
            return
        
        wb = openpyxl.load_workbook(excel_files[0], data_only=True)
        sheet = wb.active
        excel_inventory = {}
        excel_norm_names = set()
        
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0: continue
            name, stock = row[0], row[1]
            if name:
                norm_name = "".join(str(name).lower().split())
                excel_inventory[norm_name] = {
                    'original_name': str(name).strip(),
                    'stock': int(stock) if stock is not None else 0
                }
                excel_norm_names.add(norm_name)

        # --- 2. DELETE PRODUCTS NOT IN EXCEL ---
        print("\nCleaning database from products NOT in Excel...")
        # We only target physical products (medications/consumables)
        db_physical_prods = Product.objects.filter(product_type='physical')
        deleted_count = 0
        for p in db_physical_prods:
            norm_name = "".join(p.name.lower().split())
            if norm_name not in excel_norm_names:
                print("  - [DELETE] Product not in Excel: {} (Price: {})".format(p.name, p.price))
                p.delete() # This cascades to items, movements, etc.
                deleted_count += 1
        print("Total deleted: {}".format(deleted_count))

        # --- 3. FUSION DES DOUBLONS RESTANTS ---
        print("\nMerging remaining duplicates...")
        remaining_prods = Product.objects.filter(product_type='physical').order_by('created_at')
        groups = {}
        for p in remaining_prods:
            norm_name = "".join(p.name.lower().split())
            if norm_name not in groups: groups[norm_name] = []
            groups[norm_name].append(p)
        
        for norm_name, products in groups.items():
            if len(products) > 1:
                master = products[0]
                others = products[1:]
                print("  Merging duplicate: {}".format(master.name))
                for other in others:
                    InvoiceItem.objects.filter(product=other).update(product=master)
                    StockMovement.objects.filter(product=other).update(master)
                    ProductBatch.objects.filter(product=other).update(product=master)
                    PurchaseOrderItem.objects.filter(product=other).update(product=master)
                    SupplierProduct.objects.filter(product=other).update(product=master)
                    try:
                        from apps.pharmacy.models import DispensingItem
                        DispensingItem.objects.filter(medication=other).update(medication=master)
                    except: pass
                    other.delete()

        # --- 4. FINAL STOCK CORRECTION ---
        print("\nFinal stock alignment and sales deduction...")
        for p in Product.objects.filter(product_type='physical'):
            norm_name = "".join(p.name.lower().split())
            excel_data = excel_inventory.get(norm_name)
            
            if not excel_data: continue
            
            initial_stock = excel_data['stock']
            
            # Somme des ventes système
            total_sold = InvoiceItem.objects.filter(
                product=p, 
                invoice__status__in=['paid', 'sent', 'overdue']
            ).aggregate(models.Sum('quantity'))['quantity__sum'] or 0
            
            # Ajustements manuels spécifiques
            if "thermometre" in norm_name:
                total_sold = 11
                if initial_stock < total_sold: initial_stock = 100

            correct_stock = int(initial_stock) - int(total_sold)
            if correct_stock < 0: correct_stock = 0
            
            # Cleanup and recreate clean batch
            p.batches.all().delete()
            StockMovement.objects.filter(product=p, movement_type='sale').delete()
            
            batch = ProductBatch.objects.create(
                organization=p.organization,
                product=p,
                batch_number="INIT-SYNC",
                quantity=initial_stock,
                quantity_remaining=correct_stock,
                expiry_date=timezone.now().date() + timedelta(days=365),
                status='available' if correct_stock > 0 else 'depleted'
            )
            
            p.stock_quantity = correct_stock
            p.save(update_fields=['stock_quantity'])
            
            print("  Product: {:<20} | Excel: {:<4} | Sold: {:<4} | Final: {:<4}".format(p.name[:20], initial_stock, total_sold, correct_stock))

    print("\nNormalization Complete. Database is now in sync with Excel.")

if __name__ == "__main__":
    normalize_all_strict()
