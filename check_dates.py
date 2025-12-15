"""Vérifier les dates des factures"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.invoicing.models import Invoice
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

user = User.objects.get(username='sophie.martin')
org = user.organization

print("="*100)
print(f"📅 VÉRIFICATION DES DATES - {user.username}")
print("="*100)

# Dates de période
now = timezone.now()
days_30 = now - timedelta(days=30)
days_365 = now - timedelta(days=365)

print(f"\nAujourd'hui: {now.strftime('%d/%m/%Y')}")
print(f"Il y a 30 jours: {days_30.strftime('%d/%m/%Y')}")
print(f"Il y a 1 an: {days_365.strftime('%d/%m/%Y')}")

invoices = Invoice.objects.filter(created_by__organization=org).order_by('-created_at')

print(f"\n📊 FACTURES ({invoices.count()} total):")
print("-" * 100)

for inv in invoices:
    age = (now - inv.created_at).days
    status_icon = "💰" if inv.status == 'paid' else "📤" if inv.status == 'sent' else "📝"
    print(f"{status_icon} {inv.invoice_number:15} | {inv.created_at.strftime('%d/%m/%Y')} ({age:3} jours) | {inv.status:10} | {inv.total_amount:>10.2f}")

# Compter par période
within_30 = invoices.filter(created_at__gte=days_30).count()
within_365 = invoices.filter(created_at__gte=days_365).count()

print("\n" + "="*100)
print(f"📈 RÉSUMÉ:")
print(f"   • Factures des 30 derniers jours: {within_30}")
print(f"   • Factures de l'année: {within_365}")
print(f"   • Factures hors période: {invoices.count() - within_365}")
print("="*100)

if within_30 == 0:
    print("\n⚠️  PROBLÈME TROUVÉ: Aucune facture dans les 30 derniers jours!")
    print("💡 Solution: Les widgets filtrent sur 'last_30_days' par défaut.")
    print("   → Changez la période sur 'this_year' dans le frontend")
    print("   → Ou créez de nouvelles factures récentes")

