#!/usr/bin/env python
"""
Script de test pour vérifier les améliorations du module Product
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product, InvoiceItem, Warehouse
from apps.purchase_orders.models import PurchaseOrderItem
from apps.e_sourcing.models import BidItem
from apps.contracts.models import ContractItem
from django.db.models import Sum, Count

def test_product_relationships():
    """Teste toutes les nouvelles relations Product"""
    print("="*60)
    print("TEST DES RELATIONS PRODUCT")
    print("="*60)
    
    products = Product.objects.all()[:3]
    
    for product in products:
        print(f"\n📦 PRODUIT: {product.name} ({product.reference})")
        print(f"   Type: {product.product_type}")
        print(f"   Prix vente: ${product.price} | Prix coût: ${product.cost_price}")
        
        # Warehouse
        if product.warehouse:
            print(f"   🏪 Entrepôt: {product.warehouse.name} ({product.warehouse.code})")
            print(f"      Localisation: {product.warehouse.city}, {product.warehouse.province}")
        else:
            print(f"   ⚠️  Aucun entrepôt assigné")
        
        # InvoiceItems
        invoice_items = product.invoice_items.all()
        print(f"\n   📄 Factures: {invoice_items.count()}")
        if invoice_items.exists():
            total_sales = invoice_items.aggregate(Sum('total_price'))['total_price__sum']
            unique_invoices = invoice_items.values('invoice').distinct().count()
            print(f"      {unique_invoices} factures distinctes")
            print(f"      Total ventes: ${total_sales}")
        
        # PurchaseOrderItems
        po_items = product.purchase_order_items.all()
        print(f"   🛒 Bons de commande: {po_items.count()}")
        if po_items.exists():
            total_purchased = po_items.aggregate(Sum('quantity'))['quantity__sum']
            print(f"      Quantité totale achetée: {total_purchased}")
        
        # ContractItems
        contract_items = product.contract_items.all()
        print(f"   📜 Contrats: {contract_items.count()}")
        
        # BidItems
        bid_items = product.bid_items.all()
        print(f"   🎯 Soumissions RFQ: {bid_items.count()}")
        
        # Stock movements
        movements = product.stock_movements.count()
        print(f"   🔄 Mouvements stock: {movements}")
    
    print("\n" + "="*60)
    print("RÉSUMÉ GLOBAL")
    print("="*60)
    print(f"Total produits: {Product.objects.count()}")
    print(f"Produits avec warehouse: {Product.objects.filter(warehouse__isnull=False).count()}")
    print(f"InvoiceItems liés: {InvoiceItem.objects.filter(product__isnull=False).count()}/{InvoiceItem.objects.count()}")
    print(f"PurchaseOrderItems liés: {PurchaseOrderItem.objects.filter(product__isnull=False).count()}/{PurchaseOrderItem.objects.count()}")
    print(f"BidItems liés: {BidItem.objects.filter(product__isnull=False).count()}/{BidItem.objects.count()}")
    print(f"ContractItems: {ContractItem.objects.count()}")
    print("="*60)
    
    print("\n✅ Tests terminés avec succès!")

if __name__ == '__main__':
    test_product_relationships()

