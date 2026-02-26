
import os
import django
from django.conf import settings
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.invoicing.models import Product, Invoice, InvoiceItem, StockMovement, ProductBatch
from apps.accounts.models import Organization

def normalize_database():
    print("--- Starting Database Normalization ---")
    
    with transaction.atomic():
        # 1. Fix missing batches and stock mismatches
        print("1. Fixing batches and stock mismatches...")
        physical_products = Product.objects.filter(product_type='physical')
        
        for p in physical_products:
            batches = p.batches.all()
            if not batches.exists():
                if p.stock_quantity > 0:
                    print("   - Creating default batch for {}: {}".format(p.name, p.stock_quantity))
                    ProductBatch.objects.create(
                        organization=p.organization,
                        product=p,
                        batch_number="DEF-{}".format(timezone.now().strftime("%Y%m%d")),
                        quantity=p.stock_quantity,
                        quantity_remaining=p.stock_quantity,
                        expiry_date=timezone.now().date() + timedelta(days=365), # Default 1 year
                        status='available'
                    )
            else:
                batch_sum = batches.aggregate(models.Sum('quantity_remaining'))['quantity_remaining__sum'] or 0
                if p.stock_quantity != batch_sum:
                    print("   - Aligning product stock for {}: {} -> {}".format(p.name, p.stock_quantity, batch_sum))
                    p.stock_quantity = batch_sum
                    p.save(update_fields=['stock_quantity'])

        # 2. Fix missing stock movements for Invoices
        print("\n2. Creating missing stock movements for invoices...")
        invoices = Invoice.objects.filter(status__in=['sent', 'paid', 'overdue'])
        
        for inv in invoices:
            items = InvoiceItem.objects.filter(invoice=inv, product__product_type='physical')
            for item in items:
                # Check if movement exists for this specific product and invoice
                movements = StockMovement.objects.filter(
                    product=item.product,
                    reference_id=inv.id,
                    movement_type='sale'
                )
                
                moved_qty = abs(movements.aggregate(models.Sum('quantity'))['quantity__sum'] or 0)
                
                if moved_qty < item.quantity:
                    needed_qty = item.quantity - moved_qty
                    print("   - Invoice {}: Creating movement for {} (Qty: {})".format(inv.invoice_number, item.product.name, needed_qty))
                    
                    # Try to find a batch to deduct from
                    batch = item.batch
                    if not batch:
                        batch = item.product.batches.filter(quantity_remaining__gte=needed_qty).first() or \
                                item.product.batches.order_by('-quantity_remaining').first()
                    
                    # Create the movement
                    StockMovement.objects.create(
                        product=item.product,
                        batch=batch,
                        movement_type='sale',
                        quantity=-needed_qty,
                        quantity_before=item.product.stock_quantity,
                        quantity_after=item.product.stock_quantity - needed_qty,
                        reference_type='invoice',
                        reference_id=inv.id,
                        reference_number=inv.invoice_number,
                        notes="Normalization: Automatic movement for invoice {}".format(inv.invoice_number),
                        created_at=inv.created_at
                    )
                    
                    # Update product stock
                    item.product.stock_quantity -= int(needed_qty)
                    item.product.save(update_fields=['stock_quantity'])
                    
                    # Update batch if possible
                    if batch:
                        batch.quantity_remaining -= int(needed_qty)
                        batch.save(update_fields=['quantity_remaining'])
                        if batch.quantity_remaining <= 0:
                            batch.status = 'depleted'
                        elif batch.quantity_remaining > 0 and batch.status == 'depleted':
                            batch.status = 'available'
                        batch.save(update_fields=['status'])

    print("\n--- Normalization Complete ---")

if __name__ == "__main__":
    normalize_database()
