
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
    print("Starting Final Normalization with Manual Adjustments...")
    
    with transaction.atomic():
        # --- 1. FUSION DES DOUBLONS ---
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
        excel_files = glob.glob("Liste des*.xlsx")
        excel_inventory = {}
        if excel_files:
            wb = openpyxl.load_workbook(excel_files[0], data_only=True)
            sheet = wb.active
            for i, row in enumerate(sheet.iter_rows(values_only=True)):
                if i == 0: continue
                name, stock = row[0], row[1]
                if name:
                    norm_name = "".join(str(name).lower().split())
                    excel_inventory[norm_name] = int(stock) if stock is not None else 0

        # --- 3. CORRECTION DES LOTS ET DÉFALQUAGE ---
        physical_products = Product.objects.filter(product_type='physical')
        
        for p in physical_products:
            norm_name = "".join(p.name.lower().split())
            initial_stock = excel_inventory.get(norm_name, 0)
            
            # Somme des ventes système
            total_sold = InvoiceItem.objects.filter(
                product=p, 
                invoice__status__in=['paid', 'sent', 'overdue']
            ).aggregate(models.Sum('quantity'))['quantity__sum'] or 0
            
            # --- AJUSTEMENTS MANUELS SPECIFIQUES ---
            if "thermometre" in norm_name:
                print("  [AJUSTEMENT] Thermometres : Forçage à 11 ventes.")
                total_sold = 11
                if initial_stock < total_sold:
                    initial_stock = total_sold + 89 # Supposons un stock initial de 100 s'il était à 0 dans l'excel

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
            
            # Mettre à jour le stock produit
            p.stock_quantity = correct_stock
            p.save(update_fields=['stock_quantity'])
            
            if total_sold > 0 or initial_stock > 0:
                print("  Product: {:<20} | Initial: {:<4} | Sold: {:<4} | Final: {:<4}".format(p.name[:20], initial_stock, total_sold, correct_stock))

    print("Normalization Complete.")

if __name__ == "__main__":
    normalize_all()
