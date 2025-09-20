#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.suppliers.models import Supplier
from apps.invoicing.models import Invoice, InvoiceItem
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem

User = get_user_model()

print("Creation de donnees de test...")

# Créer des fournisseurs
suppliers_data = [
    {
        'name': 'Techno Solutions Inc.',
        'contact_person': 'Jean Dupont',
        'email': 'contact@technosolutions.com',
        'phone': '+1 (514) 555-0101',
        'address': '123 Rue Principale\nMontreal, QC H1A 1A1\nCanada'
    },
    {
        'name': 'Bureau Plus Ltée',
        'contact_person': 'Marie Tremblay',
        'email': 'marie@bureauplus.ca',
        'phone': '+1 (514) 555-0102',
        'address': '456 Avenue des Affaires\nMontreal, QC H2B 2B2\nCanada'
    },
    {
        'name': 'Materiel Pro',
        'contact_person': 'Pierre Gagnon',
        'email': 'pierre@materielpro.ca',
        'phone': '+1 (514) 555-0103',
        'address': '789 Boulevard Industriel\nLaval, QC H3C 3C3\nCanada'
    }
]

suppliers = []
for supplier_data in suppliers_data:
    supplier, created = Supplier.objects.get_or_create(
        name=supplier_data['name'],
        defaults=supplier_data
    )
    suppliers.append(supplier)
    if created:
        print(f"Fournisseur cree: {supplier.name}")

# Récupérer l'utilisateur admin
admin_user = User.objects.get(username='admin')

# Créer des bons de commande
po_data = [
    {
        'title': 'Commande equipement informatique',
        'description': 'Achat de materiel informatique pour le bureau',
        'supplier': suppliers[0],
        'required_date': datetime.now().date() + timedelta(days=15),
        'expected_delivery_date': datetime.now().date() + timedelta(days=10),
        'items': [
            {'reference': 'ORD-001', 'description': 'Ordinateur portable Dell', 'quantity': 5, 'unit_price': 1200.00},
            {'reference': 'MOU-001', 'description': 'Souris sans fil', 'quantity': 10, 'unit_price': 35.00},
            {'reference': 'CLV-001', 'description': 'Clavier ergonomique', 'quantity': 5, 'unit_price': 85.00}
        ]
    },
    {
        'title': 'Fournitures de bureau',
        'description': 'Commande mensuelle de fournitures',
        'supplier': suppliers[1],
        'required_date': datetime.now().date() + timedelta(days=7),
        'expected_delivery_date': datetime.now().date() + timedelta(days=5),
        'items': [
            {'reference': 'PAP-001', 'description': 'Papier A4 - Paquet de 500', 'quantity': 20, 'unit_price': 12.50},
            {'reference': 'STY-001', 'description': 'Stylos bleus - Paquet de 10', 'quantity': 15, 'unit_price': 8.75},
            {'reference': 'AGR-001', 'description': 'Agrafeuse metallique', 'quantity': 3, 'unit_price': 25.00}
        ]
    }
]

purchase_orders = []
for po_info in po_data:
    items_info = po_info.pop('items')

    po = PurchaseOrder.objects.create(
        **po_info,
        created_by=admin_user,
        subtotal=0,
        total_amount=0
    )

    total = 0
    for item_info in items_info:
        item = PurchaseOrderItem.objects.create(
            purchase_order=po,
            product_reference=item_info['reference'],
            description=item_info['description'],
            quantity=item_info['quantity'],
            unit_price=Decimal(str(item_info['unit_price']))
        )
        total += item.total_price

    # Ajouter taxes (TPS 5% + TVQ 9.975%)
    po.subtotal = total
    po.tax_gst_hst = total * Decimal('0.05')
    po.tax_qst = total * Decimal('0.09975')
    po.total_amount = po.subtotal + po.tax_gst_hst + po.tax_qst
    po.save()

    purchase_orders.append(po)
    print(f"Bon de commande cree: {po.po_number} - {po.total_amount} CAD")

# Créer des factures
invoice_data = [
    {
        'title': 'Facture services consulting',
        'description': 'Services de consultation en IT',
        'due_date': datetime.now().date() + timedelta(days=30),
        'items': [
            {'code': 'CONS-001', 'description': 'Consultation IT - Analyse systeme', 'quantity': 40, 'unit_price': 125.00},
            {'code': 'CONS-002', 'description': 'Formation utilisateurs', 'quantity': 8, 'unit_price': 200.00}
        ]
    },
    {
        'title': 'Facture maintenance',
        'description': 'Maintenance preventive equipements',
        'due_date': datetime.now().date() + timedelta(days=15),
        'items': [
            {'code': 'MAINT-001', 'description': 'Maintenance serveur', 'quantity': 1, 'unit_price': 450.00},
            {'code': 'MAINT-002', 'description': 'Nettoyage systeme', 'quantity': 1, 'unit_price': 150.00},
            {'code': 'MAINT-003', 'description': 'Mise a jour logiciels', 'quantity': 1, 'unit_price': 200.00}
        ]
    }
]

invoices = []
for invoice_info in invoice_data:
    items_info = invoice_info.pop('items')

    invoice = Invoice.objects.create(
        **invoice_info,
        created_by=admin_user,
        subtotal=0,
        total_amount=0
    )

    total = 0
    for item_info in items_info:
        item = InvoiceItem.objects.create(
            invoice=invoice,
            service_code=item_info['code'],
            description=item_info['description'],
            quantity=item_info['quantity'],
            unit_price=Decimal(str(item_info['unit_price']))
        )
        total += item.total_price

    # Ajouter taxes (TPS 5% + TVQ 9.975%)
    invoice.subtotal = total
    invoice.tax_amount = total * Decimal('0.14975')  # Total des taxes
    invoice.total_amount = invoice.subtotal + invoice.tax_amount
    invoice.save()

    invoices.append(invoice)
    print(f"Facture creee: {invoice.invoice_number} - {invoice.total_amount} CAD")

print(f"\nDonnees de test creees avec succes!")
print(f"- {len(suppliers)} fournisseurs")
print(f"- {len(purchase_orders)} bons de commande")
print(f"- {len(invoices)} factures")
print(f"\nVous pouvez maintenant tester l'application:")
print(f"- Page d'accueil: http://127.0.0.1:8000")
print(f"- Dashboard: http://127.0.0.1:8000/app")
print(f"- Admin: http://127.0.0.1:8000/admin")
print(f"- Login: admin / admin123")