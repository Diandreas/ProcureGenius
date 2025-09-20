#!/usr/bin/env python3
"""
Script pour créer des produits de test
"""

import os
import sys
import django
from decimal import Decimal

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

def create_test_products():
    """Crée des produits de test"""
    
    products_data = [
        {
            'name': 'Développement Site Web',
            'description': 'Création d\'un site web sur mesure avec React/Django',
            'product_type': 'service',
            'price': Decimal('75.00'),
            'cost_price': Decimal('45.00'),
        },
        {
            'name': 'Design UI/UX',
            'description': 'Conception d\'interface utilisateur moderne',
            'product_type': 'service',
            'price': Decimal('85.00'),
            'cost_price': Decimal('50.00'),
        },
        {
            'name': 'Consultation IT',
            'description': 'Conseil en architecture et stratégie IT',
            'product_type': 'service',
            'price': Decimal('120.00'),
            'cost_price': Decimal('70.00'),
        },
        {
            'name': 'Ordinateur Portable',
            'description': 'Laptop haute performance pour développement',
            'product_type': 'physical',
            'price': Decimal('1500.00'),
            'cost_price': Decimal('1200.00'),
            'stock_quantity': 5,
            'low_stock_threshold': 2,
        },
        {
            'name': 'Clavier Mécanique',
            'description': 'Clavier mécanique pour programmeurs',
            'product_type': 'physical',
            'price': Decimal('150.00'),
            'cost_price': Decimal('90.00'),
            'stock_quantity': 10,
            'low_stock_threshold': 3,
        },
        {
            'name': 'Souris Ergonomique',
            'description': 'Souris ergonomique haute précision',
            'product_type': 'physical',
            'price': Decimal('75.00'),
            'cost_price': Decimal('45.00'),
            'stock_quantity': 2,  # Stock bas
            'low_stock_threshold': 5,
        },
        {
            'name': 'Formation Django',
            'description': 'Formation complète au framework Django',
            'product_type': 'service',
            'price': Decimal('500.00'),
            'cost_price': Decimal('200.00'),
        },
        {
            'name': 'Licence Logiciel',
            'description': 'Licence annuelle pour logiciel de développement',
            'product_type': 'digital',
            'price': Decimal('299.00'),
            'cost_price': Decimal('150.00'),
            'stock_quantity': 0,  # En rupture
        },
    ]
    
    created_count = 0
    updated_count = 0
    
    for product_data in products_data:
        product, created = Product.objects.get_or_create(
            name=product_data['name'],
            defaults=product_data
        )
        
        if created:
            created_count += 1
            print(f"✅ Produit créé : {product.name} ({product.reference})")
        else:
            # Mettre à jour les données
            for key, value in product_data.items():
                setattr(product, key, value)
            product.save()
            updated_count += 1
            print(f"🔄 Produit mis à jour : {product.name} ({product.reference})")
    
    print(f"\n📊 Résumé :")
    print(f"   Produits créés : {created_count}")
    print(f"   Produits mis à jour : {updated_count}")
    print(f"   Total en base : {Product.objects.count()}")
    
    # Afficher les statuts de stock
    print(f"\n📦 État des stocks :")
    for product in Product.objects.filter(product_type='physical'):
        if product.is_out_of_stock:
            print(f"   ❌ {product.name} : RUPTURE")
        elif product.is_low_stock:
            print(f"   ⚠️  {product.name} : STOCK BAS ({product.stock_quantity})")
        else:
            print(f"   ✅ {product.name} : OK ({product.stock_quantity})")

if __name__ == "__main__":
    print("🚀 Création des produits de test...")
    try:
        create_test_products()
        print("\n🎉 Produits de test créés avec succès !")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
