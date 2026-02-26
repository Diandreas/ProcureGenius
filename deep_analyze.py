
import os
import django
import glob
import openpyxl
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum, Count
from django.db.models.functions import Lower

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, InvoiceItem, StockMovement, ProductBatch

def analyze_and_compare():
    print("=== ANALYSE COMPARATIVE DES DONNEES ===\n")
    
    # 1. Trouver le fichier Excel dynamiquement
    excel_files = glob.glob("Liste des*.xlsx")
    if not excel_files:
        print("Erreur : Aucun fichier Excel trouve commençant par 'Liste des'")
        return
    
    excel_path = excel_files[0]
    print("Fichier utilise : {}".format(excel_path))

    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        sheet = wb.active
        
        excel_inventory = {}
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0: continue
            name = row[0]
            stock = row[1]
            if name:
                excel_inventory[str(name).strip().lower()] = stock if stock is not None else 0
    except Exception as e:
        print("Erreur lecture Excel : {}".format(e))
        return

    # 2. Analyser les Incohérences de Défalquage
    print("\n--- FACTURES NON DEFALQUEES (Ventes non deduites du stock) ---")
    items = InvoiceItem.objects.filter(product__product_type='physical', invoice__status__in=['paid', 'sent'])
    missing_moves_count = 0
    for item in items:
        has_move = StockMovement.objects.filter(
            product=item.product,
            reference_id=item.invoice.id,
            movement_type='sale'
        ).exists()
        
        if not has_move:
            print("  * Facture {} | {} | Qté: {} -> MANQUANT".format(item.invoice.invoice_number, item.product.name, item.quantity))
            missing_moves_count += 1
    
    print("\nTOTAL des ventes non deduites : {}".format(missing_moves_count))

    # 3. Analyser les Doublons
    print("\n--- DOUBLONS DE PRODUITS ---")
    duplicates = Product.objects.annotate(lower_name=Lower('name')).values('lower_name').annotate(count=Count('id')).filter(count__gt=1)
    
    for dup in duplicates:
        name = dup['lower_name']
        prods = Product.objects.filter(name__iexact=name)
        print("Produit: '{}' ({} copies)".format(name, prods.count()))
        for p in prods:
            inv_count = InvoiceItem.objects.filter(product=p).count()
            print("  - ID: {} | Stock: {} | Factures: {}".format(p.id, p.stock_quantity, inv_count))

    # 4. Comparaison Manuelle Doliprane
    print("\n--- FOCUS DOLIPRANE ---")
    doli_prods = Product.objects.filter(name__icontains='doliprane')
    if doli_prods.exists():
        for p in doli_prods:
            print("  - {} (ID: {}) : Stock DB = {}".format(p.name, p.id, p.stock_quantity))
            sales = InvoiceItem.objects.filter(product=p, invoice__status__in=['paid', 'sent'])
            for s in sales:
                has_m = StockMovement.objects.filter(product=p, reference_id=s.invoice.id, movement_type='sale').exists()
                if not has_m:
                    print("    !!! Facture {} (Qté {}) n'a pas retire le stock".format(s.invoice.invoice_number, s.quantity))
    
    # 5. Calcul du Stock Correct Théorique (Stock Excel - Ventes réelles)
    print("\n--- STOCK THEORIQUE (Excel - Toutes les ventes) ---")
    # On prend le top 10 des produits vendus pour illustrer
    popular_prods = Product.objects.annotate(sales_count=Count('invoice_items')).order_by('-sales_count')[:10]
    for p in popular_prods:
        # Trouver dans Excel
        excel_qty = 0
        norm_name = p.name.strip().lower()
        if norm_name in excel_inventory:
            excel_qty = excel_inventory[norm_name]
        
        # Somme de TOUTES les ventes (indépendamment du défalquage actuel)
        total_sold = InvoiceItem.objects.filter(product=p, invoice__status__in=['paid', 'sent']).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        theoretical_stock = excel_qty - total_sold
        print("Produit: {:<30} | Excel: {:<4} | Vendu: {:<4} | Theorique: {:<4} | DB Actuel: {:<4}".format(
            p.name[:30], excel_qty, total_sold, theoretical_stock, p.stock_quantity
        ))

if __name__ == "__main__":
    analyze_and_compare()
