#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Invoice

print(f'Total factures: {Invoice.objects.count()}')
print('\nDernieres factures:')
for inv in Invoice.objects.order_by('-created_at')[:10]:
    print(f'  - {inv.invoice_number} (Org: {inv.organization.name if inv.organization else "N/A"}, Date: {inv.created_at})')

print('\nNumeros de factures en doublon:')
from django.db.models import Count
duplicates = Invoice.objects.values('invoice_number').annotate(count=Count('id')).filter(count__gt=1)
for dup in duplicates:
    print(f'  - {dup["invoice_number"]}: {dup["count"]} fois')
    invoices = Invoice.objects.filter(invoice_number=dup['invoice_number'])
    for inv in invoices:
        print(f'    * ID: {inv.id}, Org: {inv.organization.name if inv.organization else "N/A"}')
