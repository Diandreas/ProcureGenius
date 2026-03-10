"""
Script de correction des factures de bilans (panels).

Corrige toutes les factures de commandes labo qui contiennent des bilans :
- Supprime les lignes individuelles des examens du bilan
- Recrée une seule ligne forfaitaire avec le prix du bilan

Usage:
    python fix_bilan_invoices.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabOrder, LabOrderItem
from apps.invoicing.models import InvoiceItem
from django.db import transaction

# Trouver toutes les commandes avec bilans qui ont une facture
orders = LabOrder.objects.filter(
    items__panel__isnull=False,
    lab_invoice__isnull=False
).distinct()

print(f"Commandes avec bilans à corriger : {orders.count()}")

for order in orders:
    invoice = order.lab_invoice
    print(f"\n--- {order.order_number} | {order.patient.name}")
    print(f"    Facture : {invoice.invoice_number} | Total avant : {invoice.total_amount} XAF")

    with transaction.atomic():
        # Supprimer toutes les lignes d'examens (sans product lié)
        deleted = InvoiceItem.objects.filter(
            invoice=invoice,
            product__isnull=True
        ).delete()
        print(f"    Lignes supprimées : {deleted[0]}")

        # Recréer les lignes correctes
        billed_panels = set()
        for lab_item in order.items.all().select_related('panel', 'lab_test'):
            if lab_item.panel_id:
                if lab_item.panel_id in billed_panels:
                    continue
                if lab_item.panel_price is not None:
                    billed_panels.add(lab_item.panel_id)
                    panel = lab_item.panel
                    test_list = ', '.join(
                        order.items.filter(panel=panel)
                        .values_list('lab_test__test_code', flat=True)
                    )
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=None,
                        description=f"Bilan : {panel.name}",
                        quantity=1,
                        unit_price=lab_item.panel_price,
                        discount_amount=0,
                        total_price=lab_item.panel_price,
                        notes=f"Forfait bilan — Examens inclus : {test_list}"
                    )
                    print(f"    [+] Bilan : {panel.name} = {lab_item.panel_price} XAF")
                else:
                    billed_panels.add(lab_item.panel_id)
            else:
                test_price = lab_item.price or lab_item.lab_test.price
                test_discount = lab_item.discount or 0
                final_price = test_price - test_discount
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=None,
                    description=lab_item.lab_test.name,
                    quantity=1,
                    unit_price=test_price,
                    discount_amount=test_discount,
                    total_price=final_price,
                    notes=f"Code: {lab_item.lab_test.test_code}"
                )
                print(f"    [+] Examen : {lab_item.lab_test.name} = {test_price} XAF")

        invoice.recalculate_totals()
        invoice.refresh_from_db()
        print(f"    Total après correction : {invoice.total_amount} XAF")

print("\n=== TERMINÉ ===")
