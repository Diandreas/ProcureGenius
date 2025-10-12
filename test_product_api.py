#!/usr/bin/env python
"""
Test de l'API Product avec les nouvelles fonctionnalités
"""
import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from apps.api.views import ProductViewSet
from apps.invoicing.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()

def test_product_api():
    """Teste l'API Product avec les nouveaux endpoints"""
    print("="*70)
    print("TEST DE L'API PRODUCT")
    print("="*70)
    
    # Setup
    factory = APIRequestFactory()
    user = User.objects.first()
    
    if not user:
        print("❌ Aucun utilisateur trouvé. Créez un utilisateur d'abord.")
        return
    
    # Test 1: List products
    print("\n1️⃣ TEST: GET /api/products/")
    request = factory.get('/api/products/')
    force_authenticate(request, user=user)
    view = ProductViewSet.as_view({'get': 'list'})
    response = view(request)
    
    if response.status_code == 200:
        products_count = len(response.data.get('results', response.data))
        print(f"   ✅ Liste produits: {products_count} produits")
        
        # Vérifier les nouveaux champs
        if products_count > 0:
            first_product = response.data.get('results', response.data)[0]
            print(f"   📦 Premier produit: {first_product.get('name')}")
            print(f"      - warehouse_name: {first_product.get('warehouse_name', 'Non défini')}")
            print(f"      - total_invoices: {first_product.get('total_invoices', 0)}")
            print(f"      - total_sales_amount: ${first_product.get('total_sales_amount', 0)}")
    else:
        print(f"   ❌ Erreur: {response.status_code}")
    
    # Test 2: Get product details
    product = Product.objects.first()
    if not product:
        print("\n❌ Aucun produit trouvé")
        return
    
    print(f"\n2️⃣ TEST: GET /api/products/{product.id}/")
    request = factory.get(f'/api/products/{product.id}/')
    force_authenticate(request, user=user)
    view = ProductViewSet.as_view({'get': 'retrieve'})
    response = view(request, pk=str(product.id))
    
    if response.status_code == 200:
        print(f"   ✅ Détails produit: {response.data.get('name')}")
        print(f"      - Référence: {response.data.get('reference')}")
        print(f"      - Warehouse: {response.data.get('warehouse_name', 'N/A')}")
        print(f"      - Stock: {response.data.get('stock_quantity')}")
    else:
        print(f"   ❌ Erreur: {response.status_code}")
    
    # Test 3: Statistics endpoint (NOUVEAU)
    print(f"\n3️⃣ TEST: GET /api/products/{product.id}/statistics/")
    request = factory.get(f'/api/products/{product.id}/statistics/')
    force_authenticate(request, user=user)
    view = ProductViewSet.as_view({'get': 'statistics'})
    response = view(request, pk=str(product.id))
    
    if response.status_code == 200:
        stats = response.data
        print(f"   ✅ Statistiques récupérées pour: {stats.get('product_name')}")
        print(f"\n   📊 VENTES:")
        print(f"      - Total factures: {stats['sales_summary']['total_invoices']}")
        print(f"      - Montant total: ${stats['sales_summary']['total_sales_amount']}")
        print(f"      - Clients uniques: {stats['sales_summary']['unique_clients']}")
        
        print(f"\n   🛒 ACHATS:")
        print(f"      - Total BCs: {stats['purchase_summary']['total_purchase_orders']}")
        print(f"      - Quantité achetée: {stats['purchase_summary']['total_quantity_purchased']}")
        
        print(f"\n   📜 CONTRATS:")
        print(f"      - Contrats actifs: {stats['contract_summary']['active_contracts']}")
        
        print(f"\n   🏪 ENTREPÔT:")
        print(f"      - Nom: {stats['warehouse_info']['warehouse_name']}")
        print(f"      - Code: {stats['warehouse_info']['warehouse_code']}")
        print(f"      - Localisation: {stats['warehouse_info']['location']}")
        print(f"      - Stock actuel: {stats['warehouse_info']['current_stock']}")
        
        print(f"\n   📈 TENDANCE (30 jours):")
        print(f"      - Période actuelle: ${stats['sales_trend']['last_30_days']}")
        print(f"      - Période précédente: ${stats['sales_trend']['previous_30_days']}")
        print(f"      - Évolution: {stats['sales_trend']['trend_percent']}%")
        
        print(f"\n   👥 TOP CLIENTS: {len(stats['top_clients'])} clients")
        for idx, client in enumerate(stats['top_clients'][:3], 1):
            client_name = client.get('invoice__client__first_name', '') + ' ' + client.get('invoice__client__last_name', '')
            if not client_name.strip():
                client_name = client.get('invoice__client__username', 'Client inconnu')
            print(f"      {idx}. {client_name} - ${client['total_purchases']}")
        
        print(f"\n   📄 FACTURES RÉCENTES: {len(stats['recent_invoices'])} factures")
        for invoice in stats['recent_invoices'][:3]:
            print(f"      - {invoice['invoice_number']}: {invoice['client_name']} - ${invoice['total_price']}")
    else:
        print(f"   ❌ Erreur: {response.status_code}")
        if hasattr(response, 'data'):
            print(f"      Détails: {response.data}")
    
    # Test 4: Stock movements
    print(f"\n4️⃣ TEST: GET /api/products/{product.id}/stock_movements/")
    request = factory.get(f'/api/products/{product.id}/stock_movements/')
    force_authenticate(request, user=user)
    view = ProductViewSet.as_view({'get': 'stock_movements'})
    response = view(request, pk=str(product.id))
    
    if response.status_code == 200:
        movements_count = len(response.data.get('results', response.data))
        print(f"   ✅ Mouvements de stock: {movements_count} enregistrements")
    else:
        print(f"   ❌ Erreur: {response.status_code}")
    
    print("\n" + "="*70)
    print("✅ TOUS LES TESTS API TERMINÉS")
    print("="*70)

if __name__ == '__main__':
    test_product_api()

