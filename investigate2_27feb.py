import os
from datetime import date
from decimal import Decimal
from django.db.models import Sum
from apps.invoicing.models import Invoice, InvoiceItem

TARGET_DATE = date(2026, 2, 27)

invoices = Invoice.objects.filter(created_at__date=TARGET_DATE).order_by('created_at')

for inv in invoices:
    items = inv.items.all()
    items_total = items.aggregate(s=Sum('total_price'))['s'] or Decimal('0')
    client_name = inv.client.name if inv.client else 'N/A'
    print(f"\n[{inv.invoice_number}] {inv.status} | stored={float(inv.total_amount):,.0f} | items_sum={float(items_total):,.0f} | {client_name}")
    for item in items:
        prod = item.product.name if item.product else item.description
        print(f"  - {prod[:40]:<40} x{item.quantity}  UP={float(item.unit_price):,.0f}  total={float(item.total_price):,.0f}")
    if not items.exists():
        print("  (aucun item)")
