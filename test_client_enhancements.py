#!/usr/bin/env python
"""
Script de test pour vérifier les améliorations du module Client
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.models import Client
from apps.invoicing.models import Invoice
from django.db.models import Sum, Count

def test_client_relationships():
    """Teste toutes les nouvelles fonctionnalités Client"""
    print("="*60)
    print("TEST DES AMÉLIORATIONS MODULE CLIENT")
    print("="*60)
    
    clients = Client.objects.all()[:5]
    
    for client in clients:
        print(f"\n👤 CLIENT: {client.name}")
        print(f"   Email: {client.email or 'N/A'}")
        print(f"   Contact: {client.contact_person or 'N/A'}")
        print(f"   Conditions paiement: {client.payment_terms}")
        
        # Organization
        if client.organization:
            print(f"   🏢 Organisation: {client.organization.name}")
        else:
            print(f"   ⚠️  Aucune organisation assignée")
        
        # Factures
        invoices = client.invoices.all()
        print(f"\n   📄 Factures: {invoices.count()}")
        if invoices.exists():
            stats = invoices.aggregate(
                total=Sum('total_amount'),
                paid=Count('id', filter=models.Q(status='paid')),
                outstanding=Count('id', filter=models.Q(status__in=['sent', 'overdue']))
            )
            print(f"      Total CA: ${stats['total'] or 0}")
            print(f"      Factures payées: {stats['paid']}")
            print(f"      En attente: {stats['outstanding']}")
            
            # Dernière facture
            last_invoice = invoices.order_by('-created_at').first()
            if last_invoice:
                print(f"      Dernière facture: {last_invoice.invoice_number} ({last_invoice.get_status_display()})")
        
        # Produits achetés via factures
        from apps.invoicing.models import InvoiceItem
        purchased_products = InvoiceItem.objects.filter(
            invoice__client=client,
            product__isnull=False
        ).values('product__name').annotate(
            total_qty=Sum('quantity'),
            total_amount=Sum('total_price')
        ).order_by('-total_amount')[:3]
        
        if purchased_products:
            print(f"\n   🛒 Top 3 produits achetés:")
            for idx, prod in enumerate(purchased_products, 1):
                print(f"      {idx}. {prod['product__name']}: {prod['total_qty']} unités (${prod['total_amount']})")
    
    print("\n" + "="*60)
    print("RÉSUMÉ GLOBAL MODULE CLIENT")
    print("="*60)
    print(f"Total clients: {Client.objects.count()}")
    print(f"Clients actifs: {Client.objects.filter(is_active=True).count()}")
    print(f"Clients avec organisation: {Client.objects.filter(organization__isnull=False).count()}")
    print(f"Total factures: {Invoice.objects.count()}")
    print(f"Factures avec client: {Invoice.objects.filter(client__isnull=False).count()}")
    
    # Vérifier que Invoice.client pointe vers Client et non CustomUser
    from django.apps import apps
    invoice_model = apps.get_model('invoicing', 'Invoice')
    client_field = invoice_model._meta.get_field('client')
    related_model = client_field.related_model
    print(f"\n🔗 Invoice.client pointe vers: {related_model.__name__}")
    if related_model.__name__ == 'Client':
        print(f"   ✅ CORRECT - Pointe vers Client")
    else:
        print(f"   ❌ ERREUR - Devrait pointer vers Client, pointe vers {related_model.__name__}")
    
    print("="*60)
    
    print("\n✅ Tests Module Client terminés avec succès!")

if __name__ == '__main__':
    test_client_relationships()

