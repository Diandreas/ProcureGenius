"""Debug pourquoi Top Clients retourne 0"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Client
from apps.invoicing.models import Invoice
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
user = User.objects.get(username='sophie.martin')
org = user.organization

print("Clients dans l'organisation:")
clients = Client.objects.filter(organization=org)
for c in clients:
    print(f"  - {c.company or c.first_name} (ID: {c.id})")
    invoices = Invoice.objects.filter(client=c)
    print(f"    Factures: {invoices.count()}")
    for inv in invoices:
        print(f"      • {inv.invoice_number} - {inv.status} - {inv.total_amount}")

print("\n" + "="*80)
print("Test de la requête Top Clients:")

end_date = timezone.now()
start_date = timezone.datetime(end_date.year, 1, 1, tzinfo=end_date.tzinfo)

top_clients = Client.objects.filter(
    organization=org,
    invoices__status__in=['paid', 'sent', 'overdue'],
    invoices__created_at__gte=start_date,
    invoices__created_at__lte=end_date
).annotate(
    total_invoices=Count('invoices', distinct=True),
    total_revenue=Sum('invoices__total_amount')
).order_by('-total_revenue')[:5]

print(f"Résultats: {top_clients.count()} client(s)")
for c in top_clients:
    name = c.company or f"{c.first_name} {c.last_name}".strip()
    print(f"  - {name}: {c.total_invoices} factures, {c.total_revenue}€")

