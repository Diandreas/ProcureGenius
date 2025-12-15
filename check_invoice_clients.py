"""Vérifier si les factures ont un client"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.invoicing.models import Invoice

User = get_user_model()
user = User.objects.get(username='sophie.martin')
org = user.organization

print("Factures et leurs clients:")
print("="*80)

invoices = Invoice.objects.filter(created_by__organization=org).select_related('client')

for inv in invoices:
    client_info = f"{inv.client.name}" if inv.client else "❌ PAS DE CLIENT"
    print(f"{inv.invoice_number:15} | {inv.status:10} | {inv.total_amount:>12.2f} | {client_info}")

invoices_with_client = invoices.filter(client__isnull=False).count()
invoices_without_client = invoices.filter(client__isnull=True).count()

print("\n" + "="*80)
print(f"Factures avec client: {invoices_with_client}")
print(f"Factures SANS client: {invoices_without_client}")

if invoices_without_client > 0:
    print("\n⚠️  PROBLÈME: Des factures n'ont pas de client associé!")
    print("💡 Solution: Associez un client à chaque facture")

