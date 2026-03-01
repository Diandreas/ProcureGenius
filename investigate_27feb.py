"""
Script de diagnostic pour la journée du 27/02/2026
Lancer avec: python manage.py shell < investigate_27feb.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')

from datetime import date
from decimal import Decimal
from django.db.models import Sum, Count
from apps.invoicing.models import Invoice, InvoiceItem, StockMovement

TARGET_DATE = date(2026, 2, 27)

print("=" * 70)
print(f"DIAGNOSTIC FACTURES DU {TARGET_DATE}")
print("=" * 70)

# 1. Toutes les factures du jour
invoices = Invoice.objects.filter(
    created_at__date=TARGET_DATE
).order_by('created_at')

print(f"\n{'N° Facture':<25} {'Statut':<12} {'Total':>12} {'Client':<25} {'Heure'}")
print("-" * 90)
total_sum = Decimal('0')
for inv in invoices:
    total_sum += inv.total_amount or Decimal('0')
    heure = inv.created_at.strftime('%H:%M:%S')
    client = (inv.client.name if inv.client else 'N/A')[:24]
    print(f"{inv.invoice_number:<25} {inv.status:<12} {float(inv.total_amount):>12,.0f} {client:<25} {heure}")

print("-" * 90)
print(f"{'TOTAL':>37} {float(total_sum):>12,.0f}")

print(f"\n→ Nombre de factures : {invoices.count()}")

# 2. Chercher les doublons (même client, même montant, proche dans le temps)
print("\n" + "=" * 70)
print("DOUBLONS POTENTIELS (même client + même montant)")
print("=" * 70)
seen = {}
for inv in invoices:
    key = (inv.client_id, str(inv.total_amount))
    if key in seen:
        print(f"⚠️  DOUBLON : {seen[key].invoice_number} et {inv.invoice_number}")
        print(f"   Client : {inv.client.name if inv.client else 'N/A'}")
        print(f"   Montant : {float(inv.total_amount):,.0f} | Statut : {seen[key].status} / {inv.status}")
        print(f"   Heures : {seen[key].created_at.strftime('%H:%M:%S')} / {inv.created_at.strftime('%H:%M:%S')}")
    else:
        seen[key] = inv

# 3. Mouvements de stock du jour
print("\n" + "=" * 70)
print("MOUVEMENTS DE STOCK DU JOUR (ventes)")
print("=" * 70)
movements = StockMovement.objects.filter(
    created_at__date=TARGET_DATE,
    movement_type='sale'
).select_related('product').order_by('created_at')

print(f"{'Produit':<30} {'Qté':>8} {'Référence':<30} {'Heure'}")
print("-" * 80)
double_check = {}
for mv in movements:
    heure = mv.created_at.strftime('%H:%M:%S')
    ref = str(mv.reference_id) if mv.reference_id else 'N/A'
    print(f"{mv.product.name[:29]:<30} {mv.quantity:>8} {ref:<30} {heure}")
    # compter les mouvements par invoice
    inv_key = str(mv.reference_id)
    double_check[inv_key] = double_check.get(inv_key, 0) + 1

# 4. Factures avec mouvements multiples (déduction doublée)
print("\n" + "=" * 70)
print("FACTURES AVEC DÉDUCTIONS STOCK EN DOUBLE")
print("=" * 70)
for ref_id, count in double_check.items():
    try:
        inv = Invoice.objects.get(id=ref_id)
        item_count = inv.items.filter(product__product_type='physical').count()
        if count > item_count:
            print(f"⚠️  Facture {inv.invoice_number} : {item_count} items physiques mais {count} mouvements de vente")
    except Invoice.DoesNotExist:
        pass

# 5. Détail par facture : items vs total attendu
print("\n" + "=" * 70)
print("VÉRIFICATION TOTAUX (items vs total_amount stocké)")
print("=" * 70)
for inv in invoices:
    items_total = inv.items.aggregate(s=Sum('total_price'))['s'] or Decimal('0')
    stored_total = inv.subtotal or Decimal('0')
    if abs(items_total - stored_total) > Decimal('1'):
        print(f"⚠️  {inv.invoice_number} : items={float(items_total):,.0f}  stocké={float(stored_total):,.0f}  ÉCART={float(items_total-stored_total):,.0f}")
    else:
        print(f"✓  {inv.invoice_number} : {float(inv.total_amount):,.0f}")

print("\nDiagnostic terminé.")
