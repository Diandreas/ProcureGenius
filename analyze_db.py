import os
import django
from django.conf import settings
from django.db.models import Sum

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, Invoice, InvoiceItem, StockMovement, ProductBatch

def analyze_database():
    print("--- Database Consistency Analysis ---")
    
    # 1. Physical products without batches
    physical_products = Product.objects.filter(product_type='physical')
    products_without_batches = []
    for p in physical_products:
        if not p.batches.exists() and p.stock_quantity > 0:
            products_without_batches.append(p)
    
    print("
1. Physical products with stock but NO batches: {}".format(len(products_without_batches)))
    for p in products_without_batches[:10]:
        print("   - {} (Ref: {}, Stock: {})".format(p.name, p.reference, p.stock_quantity))
    if len(products_without_batches) > 10:
        print("   ... and {} more.".format(len(products_without_batches) - 10))

    # 2. InvoiceItems (physical) without StockMovements
    invoices_to_check = Invoice.objects.filter(status__in=['sent', 'paid', 'overdue'])
    inconsistent_invoices = []
    
    for inv in invoices_to_check:
        items_total = InvoiceItem.objects.filter(invoice=inv, product__product_type='physical').aggregate(Sum('quantity'))['quantity__sum'] or 0
        if items_total == 0:
            continue
            
        movements_total = abs(StockMovement.objects.filter(
            reference_id=inv.id,
            movement_type='sale'
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0)
        
        if items_total != movements_total:
            inconsistent_invoices.append({
                'id': inv.id,
                'number': inv.invoice_number,
                'items_total': items_total,
                'movements_total': movements_total,
                'status': inv.status
            })

    print("
2. Invoices with inconsistent stock movements: {}".format(len(inconsistent_invoices)))
    for inv in inconsistent_invoices[:10]:
        print("   - {} ({}): Items={}, Movements={}".format(inv['number'], inv['status'], inv['items_total'], inv['movements_total']))
    if len(inconsistent_invoices) > 10:
        print("   ... and {} more.".format(len(inconsistent_invoices) - 10))

    # 3. Product total stock vs Batch total remaining quantity
    inconsistent_stocks = []
    for p in physical_products:
        batch_sum = p.batches.aggregate(Sum('quantity_remaining'))['quantity_remaining__sum'] or 0
        if p.stock_quantity != batch_sum:
            inconsistent_stocks.append({
                'name': p.name,
                'product_stock': p.stock_quantity,
                'batch_stock': batch_sum
            })
            
    print("
3. Products with stock mismatch (Product vs Batches): {}".format(len(inconsistent_stocks)))
    for p in inconsistent_stocks[:10]:
        print("   - {}: Product={}, Batches={}".format(p['name'], p['product_stock'], p['batch_stock']))
    if len(inconsistent_stocks) > 10:
        print("   ... and {} more.".format(len(inconsistent_stocks) - 10))

if __name__ == "__main__":
    analyze_database()
