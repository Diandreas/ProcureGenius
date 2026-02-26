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

def normalize_all():
    print("Starting Final Normalization...")
    
    with transaction.atomic():
        # --- 1. FUSION DES DOUBLONS ---
        print("1. Merging duplicates...")
        all_prods = Product.objects.all().order_by('created_at')
        groups = {}
        for p in all_prods:
            norm_name = "".join(p.name.lower().split())
            key = (p.organization_id, norm_name)
            if key not in groups: groups[key] = []
            groups[key].append(p)
        
        for key, products in groups.items():
            if len(products) > 1:
                master = products[0]
                others = products[1:]
                print("  Merging into Master: {}".format(master.name))
                for other in others:
                    InvoiceItem.objects.filter(product=other).update(product=master)
                    StockMovement.objects.filter(product=other).update(product=master)
                    ProductBatch.objects.filter(product=other).update(product=master)
                    PurchaseOrderItem.objects.filter(product=other).update(product=master)
                    SupplierProduct.objects.filter(product=other).update(product=master)
                    try:
                        from apps.pharmacy.models import DispensingItem
                        DispensingItem.objects.filter(medication=other).update(medication=master)
                    except: pass
                    other.delete()

        # --- 2. RÉCUPÉRATION STOCK INITIAL EXCEL ---
        print("2. Loading Excel stock...")
        excel_files = glob.glob("Liste des*.xlsx")
        if not excel_files:
            print("Error: Excel file not found.")
            return
        
        wb = openpyxl.load_workbook(excel_files[0], data_only=True)
        sheet = wb.active
        excel_inventory = {}
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0: continue
            name, stock = row[0], row[1]
            if name:
                norm_name = "".join(str(name).lower().split())
                excel_inventory[norm_name] = stock if stock is not None else 0

        # --- 3. CORRECTION DES LOTS ET DÉFALQUAGE ---
        print("3. Fixing stocks and deducting sales...")
        physical_products = Product.objects.filter(product_type='physical')
        
        for p in physical_products:
            norm_name = "".join(p.name.lower().split())
            initial_stock = excel_inventory.get(norm_name, 0)
            
            # Somme de TOUTES les ventes
            total_sold = InvoiceItem.objects.filter(
                product=p, 
                invoice__status__in=['paid', 'sent', 'overdue']
            ).aggregate(models.Sum('quantity'))['quantity__sum'] or 0
            
            correct_stock = int(initial_stock) - int(total_sold)
            if correct_stock < 0: correct_stock = 0
            
            # Nettoyage
            p.batches.all().delete()
            StockMovement.objects.filter(product=p, movement_type='sale').delete()
            
            # Créer le lot maître
            batch = ProductBatch.objects.create(
                organization=p.organization,
                product=p,
                batch_number="INIT-CORRECTED",
                quantity=initial_stock,
                quantity_remaining=correct_stock,
                expiry_date=timezone.now().date() + timedelta(days=365),
                status='available' if correct_stock > 0 else 'depleted'
            )
            
            # Recréer les mouvements
            sales = InvoiceItem.objects.filter(product=p, invoice__status__in=['paid', 'sent', 'overdue'])
            for s in sales:
                StockMovement.objects.create(
                    product=p,
                    batch=batch,
                    movement_type='sale',
                    quantity=-s.quantity,
                    quantity_before=0,
                    quantity_after=0,
                    reference_type='invoice',
                    reference_id=s.invoice.id,
                    reference_number=s.invoice.invoice_number,
                    notes="Correction automatique : Defalquage vente",
                    created_at=s.invoice.created_at
                )
            
            # Mettre à jour le stock produit
            p.stock_quantity = correct_stock
            p.save(update_fields=['stock_quantity'])
            
            if total_sold > 0 or initial_stock > 0:
                print("  Product: {} | Initial: {} | Sold: {} | Final: {}".format(p.name[:20], initial_stock, total_sold, correct_stock))

    print("Normalization Complete.")

if __name__ == "__main__":
    normalize_all()
