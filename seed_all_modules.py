#!/usr/bin/env python
"""
Script de seed complet pour ProcureGenius
Crée un compte particulier avec accès à TOUS les modules et des données d'exemple complètes

Utilisation:
    python manage.py shell < seed_all_modules.py
    ou
    python seed_all_modules.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Configuration Django
if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import Organization, Client, UserPreferences, UserPermissions
from apps.suppliers.models import Supplier, SupplierCategory
from apps.invoicing.models import Product, ProductCategory, Invoice, InvoiceItem, Warehouse, StockMovement
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.core.modules import Modules, PROFILE_MODULES, ProfileTypes

User = get_user_model()

# Couleurs pour console
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}→ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def create_organization():
    """Crée l'organisation avec profil ENTERPRISE (tous les modules)"""
    print_header("CRÉATION DE L'ORGANISATION")

    org, created = Organization.objects.get_or_create(
        name="Sophie - Pâtisserie Artisanale",
        defaults={
            'subscription_type': ProfileTypes.ENTERPRISE,  # Tous les modules
            'enabled_modules': PROFILE_MODULES[ProfileTypes.ENTERPRISE]
        }
    )

    if created:
        print_success(f"Organisation créée: {org.name}")
        print_info(f"Type d'abonnement: {org.get_subscription_type_display()}")
        print_info(f"Modules activés: {len(org.enabled_modules)}")
    else:
        print_warning(f"Organisation existante: {org.name}")

    return org


def create_user(org):
    """Crée l'utilisateur particulier avec rôle admin"""
    print_header("CRÉATION DE L'UTILISATEUR")

    user, created = User.objects.get_or_create(
        username="sophie.martin",
        defaults={
            'email': "sophie.martin@gmail.com",
            'first_name': "Sophie",
            'last_name': "Martin",
            'phone': "+33 6 12 34 56 78",
            'organization': org,
            'role': 'admin',  # Admin pour accès complet
            'is_staff': True,
            'is_active': True,
        }
    )

    if created:
        user.set_password('password123')
        user.save()
        print_success(f"Utilisateur créé: {user.get_full_name()} (@{user.username})")
        print_info(f"Email: {user.email}")
        print_info(f"Rôle: {user.get_role_display()}")
        print_info(f"Mot de passe: password123")
    else:
        print_warning(f"Utilisateur existant: {user.username}")

    # Vérifier les préférences et permissions
    prefs, _ = UserPreferences.objects.get_or_create(user=user)
    perms, _ = UserPermissions.objects.get_or_create(user=user)

    return user


def create_categories():
    """Crée les catégories de produits et fournisseurs"""
    print_header("CRÉATION DES CATÉGORIES")

    # Catégories de produits
    product_categories = [
        {'name': 'Gâteaux', 'slug': 'gateaux', 'description': 'Gâteaux personnalisés et sur mesure'},
        {'name': 'Pâtisseries', 'slug': 'patisseries', 'description': 'Tartes, éclairs, macarons'},
        {'name': 'Viennoiseries', 'slug': 'viennoiseries', 'description': 'Croissants, pains au chocolat'},
        {'name': 'Matières premières', 'slug': 'matieres-premieres', 'description': 'Ingrédients pour fabrication'},
    ]

    prod_cats = []
    for cat_data in product_categories:
        cat, created = ProductCategory.objects.get_or_create(
            slug=cat_data['slug'],
            defaults=cat_data
        )
        prod_cats.append(cat)
        if created:
            print_success(f"Catégorie produit: {cat.name}")

    # Catégories de fournisseurs
    supplier_categories = [
        {'name': 'Ingrédients de base', 'slug': 'ingredients-base', 'description': 'Farine, sucre, œufs'},
        {'name': 'Équipement', 'slug': 'equipement', 'description': 'Matériel de pâtisserie'},
        {'name': 'Emballages', 'slug': 'emballages', 'description': 'Boîtes, rubans, étiquettes'},
        {'name': 'Décoration', 'slug': 'decoration', 'description': 'Pâte à sucre, colorants'},
    ]

    supp_cats = []
    for cat_data in supplier_categories:
        cat, created = SupplierCategory.objects.get_or_create(
            slug=cat_data['slug'],
            defaults=cat_data
        )
        supp_cats.append(cat)
        if created:
            print_success(f"Catégorie fournisseur: {cat.name}")

    return {'products': prod_cats, 'suppliers': supp_cats}


def create_suppliers(categories):
    """Crée les fournisseurs"""
    print_header("CRÉATION DES FOURNISSEURS")

    suppliers_data = [
        {
            'name': 'Minoterie du Moulin',
            'email': 'contact@minoterie-moulin.fr',
            'phone': '01 23 45 67 89',
            'contact_person': 'Jean Dupont',
            'address': '15 Rue de la Farine',
            'city': 'Paris',
            'province': 'QC',
            'status': 'active',
            'rating': 4.8,
            'is_local': True,
            'categories': [categories['suppliers'][0]],  # Ingrédients de base
        },
        {
            'name': 'Pâtisserie Pro Équipement',
            'email': 'vente@patisseriepro.fr',
            'phone': '01 98 76 54 32',
            'contact_person': 'Marie Leblanc',
            'address': '42 Avenue des Professionnels',
            'city': 'Lyon',
            'province': 'ON',
            'status': 'active',
            'rating': 4.5,
            'is_local': False,
            'categories': [categories['suppliers'][1]],  # Équipement
        },
        {
            'name': 'Emballages Créatifs',
            'email': 'hello@emballagescrea.com',
            'phone': '02 34 56 78 90',
            'contact_person': 'Pierre Martin',
            'address': '8 Rue du Commerce',
            'city': 'Marseille',
            'province': 'BC',
            'status': 'active',
            'rating': 4.2,
            'is_local': True,
            'is_woman_owned': True,
            'categories': [categories['suppliers'][2]],  # Emballages
        },
        {
            'name': 'Déco Sucre & Cie',
            'email': 'contact@decosucre.fr',
            'phone': '03 45 67 89 01',
            'contact_person': 'Amélie Rousseau',
            'address': '25 Boulevard des Artisans',
            'city': 'Toulouse',
            'province': 'AB',
            'status': 'active',
            'rating': 4.9,
            'is_local': False,
            'is_woman_owned': True,
            'categories': [categories['suppliers'][3]],  # Décoration
        },
        {
            'name': 'Bio Ingrédients Local',
            'email': 'bio@ingredients-local.fr',
            'phone': '04 56 78 90 12',
            'contact_person': 'Laurent Bio',
            'address': '12 Rue Écologique',
            'city': 'Bordeaux',
            'province': 'QC',
            'status': 'pending',
            'rating': 4.0,
            'is_local': True,
            'categories': [categories['suppliers'][0]],  # Ingrédients
        },
    ]

    suppliers = []
    for supp_data in suppliers_data:
        cats = supp_data.pop('categories', [])
        supplier, created = Supplier.objects.get_or_create(
            email=supp_data['email'],
            defaults=supp_data
        )
        if created:
            supplier.categories.set(cats)
            print_success(f"Fournisseur: {supplier.name} (Note: {supplier.rating}/5)")
        suppliers.append(supplier)

    return suppliers


def create_warehouses(org):
    """Crée les entrepôts"""
    print_header("CRÉATION DES ENTREPÔTS")

    warehouses_data = [
        {
            'organization': org,
            'name': 'Atelier Principal',
            'code': 'ATELIER-01',
            'address': '10 Rue de la Pâtisserie',
            'city': 'Paris',
            'province': 'Île-de-France',
            'postal_code': '75001',
            'country': 'France',
            'is_active': True,
        },
        {
            'organization': org,
            'name': 'Stock Réserve',
            'code': 'STOCK-01',
            'address': '10 Rue de la Pâtisserie (Cave)',
            'city': 'Paris',
            'province': 'Île-de-France',
            'postal_code': '75001',
            'country': 'France',
            'is_active': True,
        },
    ]

    warehouses = []
    for wh_data in warehouses_data:
        wh, created = Warehouse.objects.get_or_create(
            code=wh_data['code'],
            defaults=wh_data
        )
        warehouses.append(wh)
        if created:
            print_success(f"Entrepôt: {wh.name} ({wh.code})")

    return warehouses


def create_products(org, categories, suppliers):
    """Crée les produits"""
    print_header("CRÉATION DES PRODUITS")

    products_data = [
        # Produits finis (à vendre)
        {
            'organization': org,
            'name': 'Gâteau Anniversaire Personnalisé',
            'description': 'Gâteau sur mesure avec décoration personnalisée',
            'product_type': 'physical',
            'source_type': 'manufactured',
            'category': categories['products'][0],  # Gâteaux
            'price': Decimal('65.00'),
            'cost_price': Decimal('25.00'),
            'stock_quantity': 0,  # Fabriqué sur commande
            'low_stock_threshold': 0,
        },
        {
            'organization': org,
            'name': 'Tarte aux Fruits de Saison',
            'description': 'Tarte artisanale avec fruits frais',
            'product_type': 'physical',
            'source_type': 'manufactured',
            'category': categories['products'][1],  # Pâtisseries
            'price': Decimal('28.00'),
            'cost_price': Decimal('12.00'),
            'stock_quantity': 5,
            'low_stock_threshold': 2,
        },
        {
            'organization': org,
            'name': 'Macarons Assortis (Boîte de 6)',
            'description': 'Assortiment de macarons artisanaux',
            'product_type': 'physical',
            'source_type': 'manufactured',
            'category': categories['products'][1],  # Pâtisseries
            'price': Decimal('15.00'),
            'cost_price': Decimal('6.00'),
            'stock_quantity': 12,
            'low_stock_threshold': 5,
        },
        {
            'organization': org,
            'name': 'Croissants Pur Beurre (x4)',
            'description': 'Croissants artisanaux au beurre',
            'product_type': 'physical',
            'source_type': 'manufactured',
            'category': categories['products'][2],  # Viennoiseries
            'price': Decimal('8.50'),
            'cost_price': Decimal('3.00'),
            'stock_quantity': 20,
            'low_stock_threshold': 10,
        },
        {
            'organization': org,
            'name': 'Atelier Pâtisserie Enfants',
            'description': 'Atelier de 2h pour apprendre à faire des cupcakes',
            'product_type': 'service',
            'source_type': 'manufactured',
            'category': categories['products'][0],
            'price': Decimal('45.00'),
            'cost_price': Decimal('15.00'),
            'stock_quantity': 0,
            'low_stock_threshold': 0,
        },

        # Matières premières (achetées)
        {
            'organization': org,
            'name': 'Farine T55 (25kg)',
            'description': 'Farine de blé type 55 pour pâtisserie',
            'product_type': 'physical',
            'source_type': 'purchased',
            'category': categories['products'][3],  # Matières premières
            'supplier': suppliers[0],  # Minoterie
            'price': Decimal('35.00'),
            'cost_price': Decimal('28.00'),
            'stock_quantity': 3,
            'low_stock_threshold': 1,
        },
        {
            'organization': org,
            'name': 'Sucre en poudre (10kg)',
            'description': 'Sucre blanc en poudre',
            'product_type': 'physical',
            'source_type': 'purchased',
            'category': categories['products'][3],
            'supplier': suppliers[0],  # Minoterie
            'price': Decimal('15.00'),
            'cost_price': Decimal('12.00'),
            'stock_quantity': 5,
            'low_stock_threshold': 2,
        },
        {
            'organization': org,
            'name': 'Œufs Bio (x30)',
            'description': 'Œufs de poules élevées en plein air',
            'product_type': 'physical',
            'source_type': 'purchased',
            'category': categories['products'][3],
            'supplier': suppliers[4],  # Bio Ingrédients
            'price': Decimal('9.00'),
            'cost_price': Decimal('7.50'),
            'stock_quantity': 8,
            'low_stock_threshold': 3,
        },
        {
            'organization': org,
            'name': 'Pâte à sucre (1kg)',
            'description': 'Pâte à sucre pour décoration',
            'product_type': 'physical',
            'source_type': 'purchased',
            'category': categories['products'][3],
            'supplier': suppliers[3],  # Déco Sucre
            'price': Decimal('18.00'),
            'cost_price': Decimal('14.00'),
            'stock_quantity': 2,
            'low_stock_threshold': 1,
        },
        {
            'organization': org,
            'name': 'Boîte à gâteau premium (x10)',
            'description': 'Boîtes cartonnées avec fenêtre',
            'product_type': 'physical',
            'source_type': 'purchased',
            'category': categories['products'][3],
            'supplier': suppliers[2],  # Emballages Créatifs
            'price': Decimal('25.00'),
            'cost_price': Decimal('18.00'),
            'stock_quantity': 15,
            'low_stock_threshold': 5,
        },
    ]

    products = []
    for prod_data in products_data:
        # Générer référence unique
        existing = Product.objects.filter(name=prod_data['name'], organization=org).first()
        if existing:
            products.append(existing)
            print_warning(f"Produit existant: {existing.name}")
        else:
            product = Product.objects.create(**prod_data)
            products.append(product)
            margin_pct = ((product.price - product.cost_price) / product.cost_price * 100) if product.cost_price > 0 else 0
            print_success(f"Produit: {product.name} | Prix: {product.price}€ | Marge: {margin_pct:.1f}% | Stock: {product.stock_quantity}")

    return products


def create_clients(org):
    """Crée les clients"""
    print_header("CRÉATION DES CLIENTS")

    clients_data = [
        {
            'name': 'Restaurant Le Gourmet',
            'email': 'commandes@legourmet.fr',
            'phone': '01 11 22 33 44',
            'address': '25 Avenue des Champs-Élysées, 75008 Paris',
            'contact_person': 'Chef Jacques',
            'tax_id': 'FR12345678901',
            'is_active': True,
        },
        {
            'name': 'Marie Dubois',
            'email': 'marie.dubois@gmail.com',
            'phone': '06 12 34 56 78',
            'address': '8 Rue de la Paix, 75002 Paris',
            'contact_person': 'Marie Dubois',
            'is_active': True,
        },
        {
            'name': 'Entreprise TechCorp',
            'email': 'events@techcorp.com',
            'phone': '01 23 45 67 89',
            'address': '50 Boulevard Haussmann, 75009 Paris',
            'contact_person': 'Responsable Événements',
            'tax_id': 'FR98765432109',
            'is_active': True,
        },
        {
            'name': 'École Sainte-Marie',
            'email': 'administration@ecole-sm.fr',
            'phone': '01 34 56 78 90',
            'address': '12 Rue de l\'École, 75011 Paris',
            'contact_person': 'Directrice',
            'is_active': True,
        },
        {
            'name': 'Pierre & Julie Martin',
            'email': 'pjmartin@orange.fr',
            'phone': '06 98 76 54 32',
            'address': '33 Rue du Commerce, 75015 Paris',
            'contact_person': 'Pierre Martin',
            'is_active': True,
        },
    ]

    clients = []
    for client_data in clients_data:
        client, created = Client.objects.get_or_create(
            email=client_data['email'],
            defaults=client_data
        )
        clients.append(client)
        if created:
            print_success(f"Client: {client.name}")

    return clients


def create_purchase_orders(user, suppliers, products):
    """Crée les bons de commande"""
    print_header("CRÉATION DES BONS DE COMMANDE")

    # BC 1: Commande matières premières Minoterie
    po1_items = [
        {'product': products[5], 'quantity': 2, 'unit_price': Decimal('28.00')},  # Farine
        {'product': products[6], 'quantity': 3, 'unit_price': Decimal('12.00')},  # Sucre
    ]

    po1 = PurchaseOrder.objects.create(
        title="Réapprovisionnement Farine & Sucre",
        description="Commande mensuelle ingrédients de base",
        status='received',
        priority='normal',
        created_by=user,
        approved_by=user,
        supplier=suppliers[0],  # Minoterie
        required_date=timezone.now().date() - timedelta(days=5),
        expected_delivery_date=timezone.now().date() - timedelta(days=3),
        delivery_address="10 Rue de la Pâtisserie, 75001 Paris",
        subtotal=Decimal('92.00'),
        tax_gst_hst=Decimal('4.60'),
        tax_qst=Decimal('9.17'),
        total_amount=Decimal('105.77'),
        shipping_cost=Decimal('0.00'),
    )

    for item_data in po1_items:
        PurchaseOrderItem.objects.create(
            purchase_order=po1,
            product_reference=item_data['product'].reference,
            product_code=item_data['product'].reference,
            description=item_data['product'].name,
            quantity=item_data['quantity'],
            unit_price=item_data['unit_price'],
            total_price=item_data['quantity'] * item_data['unit_price'],
            unit_of_measure="unité",
        )

    print_success(f"BC reçu: {po1.po_number} - {po1.title} ({po1.total_amount}€)")

    # BC 2: Commande emballages
    po2_items = [
        {'product': products[9], 'quantity': 5, 'unit_price': Decimal('18.00')},  # Boîtes
    ]

    po2 = PurchaseOrder.objects.create(
        title="Boîtes à gâteaux premium",
        description="Stock emballages pour commandes clients",
        status='approved',
        priority='normal',
        created_by=user,
        approved_by=user,
        supplier=suppliers[2],  # Emballages Créatifs
        required_date=timezone.now().date() + timedelta(days=7),
        expected_delivery_date=timezone.now().date() + timedelta(days=10),
        delivery_address="10 Rue de la Pâtisserie, 75001 Paris",
        subtotal=Decimal('90.00'),
        tax_gst_hst=Decimal('4.50'),
        tax_qst=Decimal('8.98'),
        total_amount=Decimal('103.48'),
        shipping_cost=Decimal('0.00'),
    )

    for item_data in po2_items:
        PurchaseOrderItem.objects.create(
            purchase_order=po2,
            product_reference=item_data['product'].reference,
            product_code=item_data['product'].reference,
            description=item_data['product'].name,
            quantity=item_data['quantity'],
            unit_price=item_data['unit_price'],
            total_price=item_data['quantity'] * item_data['unit_price'],
            unit_of_measure="lot",
        )

    print_success(f"BC approuvé: {po2.po_number} - {po2.title} ({po2.total_amount}€)")

    # BC 3: Commande urgente décoration
    po3_items = [
        {'product': products[8], 'quantity': 3, 'unit_price': Decimal('14.00')},  # Pâte à sucre
    ]

    po3 = PurchaseOrder.objects.create(
        title="Pâte à sucre - URGENT",
        description="Besoin urgent pour commande mariage",
        status='sent',
        priority='urgent',
        created_by=user,
        approved_by=user,
        supplier=suppliers[3],  # Déco Sucre
        required_date=timezone.now().date() + timedelta(days=2),
        expected_delivery_date=timezone.now().date() + timedelta(days=3),
        delivery_address="10 Rue de la Pâtisserie, 75001 Paris",
        subtotal=Decimal('42.00'),
        tax_gst_hst=Decimal('2.10'),
        tax_qst=Decimal('4.19'),
        total_amount=Decimal('48.29'),
        shipping_cost=Decimal('0.00'),
        special_conditions="Livraison express demandée",
    )

    for item_data in po3_items:
        PurchaseOrderItem.objects.create(
            purchase_order=po3,
            product_reference=item_data['product'].reference,
            product_code=item_data['product'].reference,
            description=item_data['product'].name,
            quantity=item_data['quantity'],
            unit_price=item_data['unit_price'],
            total_price=item_data['quantity'] * item_data['unit_price'],
            unit_of_measure="kg",
        )

    print_success(f"BC envoyé (URGENT): {po3.po_number} - {po3.title} ({po3.total_amount}€)")

    return [po1, po2, po3]


def create_invoices(user, clients, products):
    """Crée les factures"""
    print_header("CRÉATION DES FACTURES")

    # Facture 1: Gâteau anniversaire Marie
    inv1 = Invoice.objects.create(
        title="Gâteau Anniversaire Sophie - 8 ans",
        description="Gâteau thème Princesse avec décoration personnalisée",
        status='paid',
        created_by=user,
        client=None,  # Client particulier non enregistré
        due_date=timezone.now().date() - timedelta(days=10),
        subtotal=Decimal('65.00'),
        tax_amount=Decimal('13.00'),
        total_amount=Decimal('78.00'),
        billing_address="Marie Dubois, 8 Rue de la Paix, 75002 Paris",
        payment_terms="Paiement comptant",
        payment_method="Carte bancaire",
        currency="EUR",
    )

    InvoiceItem.objects.create(
        invoice=inv1,
        service_code="GAT-001",
        product_reference=products[0].reference,
        description=products[0].name,
        detailed_description="Gâteau 6-8 personnes, thème Princesse, couleurs rose et doré",
        quantity=1,
        unit_price=Decimal('65.00'),
        total_price=Decimal('65.00'),
        unit_of_measure="unité",
        discount_percent=Decimal('0.00'),
        tax_rate=Decimal('20.00'),
    )

    print_success(f"Facture payée: {inv1.invoice_number} - {inv1.title} ({inv1.total_amount}€)")

    # Facture 2: Commande restaurant
    inv2 = Invoice.objects.create(
        title="Fourniture Pâtisseries - Le Gourmet",
        description="Commande hebdomadaire desserts restaurant",
        status='sent',
        created_by=user,
        client=None,
        due_date=timezone.now().date() + timedelta(days=30),
        subtotal=Decimal('186.00'),
        tax_amount=Decimal('37.20'),
        total_amount=Decimal('223.20'),
        billing_address="Restaurant Le Gourmet, 25 Avenue des Champs-Élysées, 75008 Paris",
        payment_terms="Net 30 jours",
        payment_method="Virement bancaire",
        currency="EUR",
    )

    InvoiceItem.objects.create(
        invoice=inv2,
        service_code="PAT-001",
        product_reference=products[1].reference,
        description=products[1].name,
        quantity=4,
        unit_price=Decimal('28.00'),
        total_price=Decimal('112.00'),
        unit_of_measure="unité",
    )

    InvoiceItem.objects.create(
        invoice=inv2,
        service_code="PAT-002",
        product_reference=products[2].reference,
        description=products[2].name,
        detailed_description="Parfums: chocolat, vanille, framboise, pistache",
        quantity=4,
        unit_price=Decimal('15.00'),
        total_price=Decimal('60.00'),
        unit_of_measure="boîte",
    )

    InvoiceItem.objects.create(
        invoice=inv2,
        service_code="VIE-001",
        product_reference=products[3].reference,
        description=products[3].name,
        quantity=1,
        unit_price=Decimal('8.50'),
        total_price=Decimal('8.50'),
        unit_of_measure="lot",
        discount_percent=Decimal('10.00'),
    )

    inv2.recalculate_totals()
    print_success(f"Facture envoyée: {inv2.invoice_number} - {inv2.title} ({inv2.total_amount}€)")

    # Facture 3: Événement entreprise
    inv3 = Invoice.objects.create(
        title="Buffet Pâtisserie - Séminaire TechCorp",
        description="Prestation buffet pour 50 personnes",
        status='sent',
        created_by=user,
        client=None,
        due_date=timezone.now().date() + timedelta(days=15),
        subtotal=Decimal('780.00'),
        tax_amount=Decimal('156.00'),
        total_amount=Decimal('936.00'),
        billing_address="TechCorp, 50 Boulevard Haussmann, 75009 Paris",
        payment_terms="Net 15 jours",
        payment_method="Virement bancaire",
        currency="EUR",
    )

    InvoiceItem.objects.create(
        invoice=inv3,
        service_code="GAT-002",
        description="Gâteaux variés (50 parts)",
        detailed_description="Assortiment: chocolat, fraisier, opéra",
        quantity=3,
        unit_price=Decimal('120.00'),
        total_price=Decimal('360.00'),
        unit_of_measure="gâteau",
    )

    InvoiceItem.objects.create(
        invoice=inv3,
        service_code="PAT-003",
        product_reference=products[2].reference,
        description="Macarons assortis",
        quantity=20,
        unit_price=Decimal('15.00'),
        total_price=Decimal('300.00'),
        unit_of_measure="boîte",
        discount_percent=Decimal('5.00'),
    )

    InvoiceItem.objects.create(
        invoice=inv3,
        service_code="SVC-001",
        description="Service et installation buffet",
        detailed_description="Installation sur site + service pendant 2h",
        quantity=1,
        unit_price=Decimal('150.00'),
        total_price=Decimal('150.00'),
        unit_of_measure="prestation",
    )

    inv3.recalculate_totals()
    print_success(f"Facture envoyée: {inv3.invoice_number} - {inv3.title} ({inv3.total_amount}€)")

    # Facture 4: Atelier pâtisserie école
    inv4 = Invoice.objects.create(
        title="Atelier Pâtisserie - École Sainte-Marie",
        description="Animation pâtisserie pour classe de CE2",
        status='draft',
        created_by=user,
        client=None,
        due_date=timezone.now().date() + timedelta(days=45),
        subtotal=Decimal('450.00'),
        tax_amount=Decimal('90.00'),
        total_amount=Decimal('540.00'),
        billing_address="École Sainte-Marie, 12 Rue de l'École, 75011 Paris",
        payment_terms="Net 45 jours",
        payment_method="Chèque",
        currency="EUR",
    )

    InvoiceItem.objects.create(
        invoice=inv4,
        service_code="SVC-002",
        product_reference=products[4].reference,
        description=products[4].name,
        detailed_description="Atelier cupcakes pour 15 enfants + ingrédients fournis",
        quantity=10,
        unit_price=Decimal('45.00'),
        total_price=Decimal('450.00'),
        unit_of_measure="atelier",
    )

    print_success(f"Facture brouillon: {inv4.invoice_number} - {inv4.title} ({inv4.total_amount}€)")

    # Facture 5: Mariage (En retard)
    inv5 = Invoice.objects.create(
        title="Gâteau de Mariage + Pièce montée",
        description="Mariage Pierre & Julie - 120 personnes",
        status='overdue',
        created_by=user,
        client=None,
        due_date=timezone.now().date() - timedelta(days=5),
        subtotal=Decimal('850.00'),
        tax_amount=Decimal('170.00'),
        total_amount=Decimal('1020.00'),
        billing_address="Pierre & Julie Martin, 33 Rue du Commerce, 75015 Paris",
        payment_terms="Net 30 jours",
        payment_method="Virement bancaire",
        currency="EUR",
    )

    InvoiceItem.objects.create(
        invoice=inv5,
        service_code="GAT-MAR-001",
        description="Pièce montée 120 personnes",
        detailed_description="3 étages, décoration fleurs en sucre, couleurs blanc et or",
        quantity=1,
        unit_price=Decimal('850.00'),
        total_price=Decimal('850.00'),
        unit_of_measure="pièce",
    )

    print_success(f"Facture EN RETARD: {inv5.invoice_number} - {inv5.title} ({inv5.total_amount}€) ⚠️")

    return [inv1, inv2, inv3, inv4, inv5]


def create_stock_movements(user, products):
    """Crée des mouvements de stock variés"""
    print_header("CRÉATION DES MOUVEMENTS DE STOCK")

    movements_count = 0

    # Stock initial pour matières premières
    for product in [products[5], products[6], products[7], products[8], products[9]]:
        if product.product_type == 'physical':
            movement = product.adjust_stock(
                quantity=product.stock_quantity,
                movement_type='initial',
                reference_type='manual',
                notes=f"Stock initial - {product.name}",
                user=user
            )
            if movement:
                movements_count += 1

    # Simulation ventes (sorties)
    products[1].adjust_stock(  # Tarte fruits
        quantity=-3,
        movement_type='sale',
        reference_type='invoice',
        notes="Vente Restaurant Le Gourmet",
        user=user
    )
    movements_count += 1

    products[2].adjust_stock(  # Macarons
        quantity=-5,
        movement_type='sale',
        reference_type='invoice',
        notes="Vente événement TechCorp",
        user=user
    )
    movements_count += 1

    # Simulation perte
    products[3].adjust_stock(  # Croissants
        quantity=-2,
        movement_type='loss',
        reference_type='loss_report',
        notes="Produits invendus fin de journée - don association",
        user=user
    )
    movements_count += 1

    # Ajustement manuel
    products[6].adjust_stock(  # Sucre
        quantity=-1,
        movement_type='adjustment',
        reference_type='manual',
        notes="Correction inventaire - sac endommagé",
        user=user
    )
    movements_count += 1

    print_success(f"Mouvements de stock créés: {movements_count}")

    # Afficher alertes stock bas
    low_stock_products = [p for p in products if hasattr(p, 'is_low_stock') and p.is_low_stock]
    if low_stock_products:
        print_warning(f"\n⚠️  ALERTES STOCK BAS ({len(low_stock_products)} produits):")
        for p in low_stock_products:
            print_warning(f"   - {p.name}: {p.stock_quantity} unités (seuil: {p.low_stock_threshold})")


def generate_summary(org, user, suppliers, products, invoices, purchase_orders):
    """Génère un résumé complet"""
    print_header("RÉSUMÉ DES DONNÉES CRÉÉES")

    print(f"{Colors.BOLD}Organisation:{Colors.ENDC}")
    print(f"  • Nom: {org.name}")
    print(f"  • Abonnement: {org.get_subscription_type_display()}")
    print(f"  • Modules actifs: {len(org.enabled_modules)}")

    print(f"\n{Colors.BOLD}Utilisateur principal:{Colors.ENDC}")
    print(f"  • Nom: {user.get_full_name()}")
    print(f"  • Username: {user.username}")
    print(f"  • Email: {user.email}")
    print(f"  • Rôle: {user.get_role_display()}")
    print(f"  • Mot de passe: password123")

    print(f"\n{Colors.BOLD}📊 Statistiques:{Colors.ENDC}")
    print(f"  • Fournisseurs: {len(suppliers)}")
    print(f"  • Produits: {len(products)} (dont {sum(1 for p in products if p.product_type == 'physical')} physiques)")
    print(f"  • Bons de commande: {len(purchase_orders)}")
    print(f"  • Factures: {len(invoices)}")

    print(f"\n{Colors.BOLD}💰 Chiffres clés:{Colors.ENDC}")

    # Calculs ventes
    total_invoices = sum(inv.total_amount for inv in invoices)
    paid_invoices = sum(inv.total_amount for inv in invoices if inv.status == 'paid')
    pending_invoices = sum(inv.total_amount for inv in invoices if inv.status in ['sent', 'overdue'])

    print(f"  • CA total facturé: {total_invoices}€")
    print(f"  • Factures payées: {paid_invoices}€")
    print(f"  • Factures en attente: {pending_invoices}€")

    # Calculs achats
    total_po = sum(po.total_amount for po in purchase_orders)
    print(f"  • Achats totaux: {total_po}€")

    # Marges
    products_sold = [p for p in products if p.product_type == 'physical' and p.source_type == 'manufactured']
    avg_margin = sum(p.margin_percent for p in products_sold) / len(products_sold) if products_sold else 0
    print(f"  • Marge moyenne produits: {avg_margin:.1f}%")

    print(f"\n{Colors.BOLD}📦 État des stocks:{Colors.ENDC}")
    physical_products = [p for p in products if p.product_type == 'physical']
    low_stock = [p for p in physical_products if p.is_low_stock]
    out_stock = [p for p in physical_products if p.is_out_of_stock]

    print(f"  • Produits physiques: {len(physical_products)}")
    print(f"  • Stock bas: {len(low_stock)} produits")
    print(f"  • Rupture: {len(out_stock)} produits")

    print(f"\n{Colors.BOLD}📋 Statuts:{Colors.ENDC}")
    print(f"  • Factures:")
    for status, label in Invoice.STATUS_CHOICES:
        count = sum(1 for inv in invoices if inv.status == status)
        if count > 0:
            print(f"    - {label}: {count}")

    print(f"  • Bons de commande:")
    for status, label in PurchaseOrder.STATUS_CHOICES:
        count = sum(1 for po in purchase_orders if po.status == status)
        if count > 0:
            print(f"    - {label}: {count}")

    print(f"\n{Colors.BOLD}✅ Modules testables:{Colors.ENDC}")
    modules_to_test = [
        ("Dashboard", "Vue d'ensemble avec KPIs"),
        ("Fournisseurs", f"{len(suppliers)} fournisseurs avec notes et catégories"),
        ("Bons de commande", f"{len(purchase_orders)} BC (brouillon, approuvé, reçu, urgent)"),
        ("Factures", f"{len(invoices)} factures (payée, envoyée, brouillon, en retard)"),
        ("Produits", f"{len(products)} produits (physiques, services, achetés, fabriqués)"),
        ("Clients", "5 clients variés (entreprises, particuliers)"),
        ("Stock", f"{StockMovement.objects.count()} mouvements (ventes, pertes, ajustements)"),
        ("Analytics", "Données pour analyses (CA, marges, achats)"),
    ]

    for module, desc in modules_to_test:
        print(f"  ✓ {module}: {desc}")

    print(f"\n{Colors.BOLD}🔑 Connexion:{Colors.ENDC}")
    print(f"  Username: {user.username}")
    print(f"  Password: password123")
    print(f"  URL: http://localhost:3000/")


def main():
    """Fonction principale"""
    try:
        print_header("SEED PROCUREGENIUS - COMPTE PARTICULIER COMPLET")
        print_info("Création d'un compte avec accès à tous les modules et données complètes\n")

        # Créer l'organisation
        org = create_organization()

        # Créer l'utilisateur
        user = create_user(org)

        # Créer les catégories
        categories = create_categories()

        # Créer les fournisseurs
        suppliers = create_suppliers(categories)

        # Créer les entrepôts
        warehouses = create_warehouses(org)

        # Créer les produits
        products = create_products(org, categories, suppliers)

        # Créer les clients
        clients = create_clients(org)

        # Créer les bons de commande
        purchase_orders = create_purchase_orders(user, suppliers, products)

        # Créer les factures
        invoices = create_invoices(user, clients, products)

        # Créer les mouvements de stock
        create_stock_movements(user, products)

        # Générer le résumé
        generate_summary(org, user, suppliers, products, invoices, purchase_orders)

        print_header("SEED TERMINÉ AVEC SUCCÈS ✓")

    except Exception as e:
        print_error(f"Erreur lors du seed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
