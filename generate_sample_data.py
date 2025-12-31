"""
Script de génération de données d'exemple pour ProcureGenius
Représente 80% de l'utilisation typique des utilisateurs

Usage:
    python generate_sample_data.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Fix Windows encoding issue
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Organization, Client
from apps.core.models import OrganizationSettings
from apps.suppliers.models import Supplier
from apps.invoicing.models import Product, ProductCategory, Warehouse, Invoice, InvoiceItem
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem

User = get_user_model()


class SampleDataGenerator:
    """Générateur de données d'exemple réalistes"""

    def __init__(self):
        self.user = None
        self.organization = None
        self.suppliers = []
        self.clients = []
        self.categories = []
        self.warehouses = []
        self.products = []
        self.invoices = []
        self.purchase_orders = []

        # Données réalistes pour l'Afrique francophone
        self.supplier_names = [
            "SARL TechDistrib Cameroun",
            "ETS Fournitures Modernes",
            "Société Générale d'Approvisionnement",
            "Import Export Africain",
            "Distribution Centrale CEMAC",
            "Comptoir Commercial du Littoral",
            "Entreprise Logistique Douala",
            "Négoce International Yaoundé"
        ]

        self.client_names = [
            "Hôtel Président",
            "Restaurant Le Palais",
            "Société BTP Construction",
            "Cabinet Médical Central",
            "Pharmacie du Centre",
            "École Internationale",
            "Supermarché Champion",
            "Boulangerie Moderne",
            "Garage Auto Service",
            "Institut de Formation",
            "Clinique Avicenne",
            "Café Terrasse",
            "Épicerie du Quartier",
            "Bureau d'Études SARL"
        ]

        self.product_categories_data = [
            {"name": "Fournitures de Bureau", "description": "Papeterie, classeurs, stylos"},
            {"name": "Matériel Informatique", "description": "Ordinateurs, périphériques, câbles"},
            {"name": "Mobilier", "description": "Bureaux, chaises, armoires"},
            {"name": "Consommables", "description": "Cartouches d'encre, papier, toner"},
            {"name": "Électronique", "description": "Téléphones, tablettes, accessoires"},
            {"name": "Matériel de Nettoyage", "description": "Produits d'entretien, équipements"},
            {"name": "Alimentation", "description": "Produits alimentaires et boissons"},
            {"name": "Équipement Médical", "description": "Matériel médical et consommables"}
        ]

        self.products_data = [
            # Fournitures de Bureau
            {"name": "Ramette papier A4 80g", "category_idx": 0, "price": 3500, "cost": 2800, "stock": 150},
            {"name": "Stylos BIC bleu (boîte 50)", "category_idx": 0, "price": 5000, "cost": 3500, "stock": 80},
            {"name": "Classeur à levier", "category_idx": 0, "price": 1500, "cost": 1000, "stock": 120},
            {"name": "Agrafeuse professionnelle", "category_idx": 0, "price": 8000, "cost": 6000, "stock": 45},

            # Matériel Informatique
            {"name": "Ordinateur portable Dell", "category_idx": 1, "price": 450000, "cost": 380000, "stock": 12},
            {"name": "Souris sans fil Logitech", "category_idx": 1, "price": 15000, "cost": 11000, "stock": 65},
            {"name": "Clavier USB standard", "category_idx": 1, "price": 8000, "cost": 5500, "stock": 55},
            {"name": "Écran 24 pouces LED", "category_idx": 1, "price": 120000, "cost": 95000, "stock": 18},

            # Mobilier
            {"name": "Bureau professionnel 160cm", "category_idx": 2, "price": 85000, "cost": 65000, "stock": 25},
            {"name": "Chaise de bureau ergonomique", "category_idx": 2, "price": 45000, "cost": 35000, "stock": 40},
            {"name": "Armoire métallique 2 portes", "category_idx": 2, "price": 65000, "cost": 50000, "stock": 15},

            # Consommables
            {"name": "Cartouche HP 305 noir", "category_idx": 3, "price": 25000, "cost": 18000, "stock": 90},
            {"name": "Toner Samsung MLT-D101S", "category_idx": 3, "price": 35000, "cost": 28000, "stock": 75},

            # Électronique
            {"name": "Téléphone Samsung A15", "category_idx": 4, "price": 125000, "cost": 98000, "stock": 30},
            {"name": "Casque Bluetooth", "category_idx": 4, "price": 18000, "cost": 13000, "stock": 50},

            # Matériel de Nettoyage
            {"name": "Javel 5L", "category_idx": 5, "price": 3500, "cost": 2200, "stock": 200},
            {"name": "Balai microfibre + manche", "category_idx": 5, "price": 8500, "cost": 6000, "stock": 60},

            # Alimentation
            {"name": "Eau minérale 1.5L (pack 6)", "category_idx": 6, "price": 2500, "cost": 1800, "stock": 300},
            {"name": "Café soluble 200g", "category_idx": 6, "price": 4500, "cost": 3200, "stock": 120},

            # Équipement Médical
            {"name": "Gants latex (boîte 100)", "category_idx": 7, "price": 12000, "cost": 9000, "stock": 85},
            {"name": "Masques chirurgicaux (boîte 50)", "category_idx": 7, "price": 8000, "cost": 5500, "stock": 150}
        ]

    def create_user_and_organization(self):
        """Crée un utilisateur d'exemple et son organisation"""
        print("📝 Création de l'utilisateur et de l'organisation...")

        # Créer ou récupérer l'organisation
        self.organization, created = Organization.objects.get_or_create(
            name="Entreprise Exemple SARL",
            defaults={
                'subscription_type': 'professional',
                'enabled_modules': [
                    'dashboard', 'suppliers', 'purchase_orders',
                    'invoices', 'products', 'clients', 'contracts'
                ]
            }
        )

        if created:
            print(f"  ✓ Organisation créée: {self.organization.name}")
        else:
            print(f"  ℹ Organisation existante: {self.organization.name}")

        # Configurer les paramètres de l'organisation (devise FCFA)
        settings, created = OrganizationSettings.objects.get_or_create(
            organization=self.organization,
            defaults={
                'tax_region': 'cameroon',
                'company_name': 'Entreprise Exemple SARL',
                'company_address': '123 Avenue de la Réunification, Douala',
                'company_phone': '+237 6 99 99 99 99',
                'company_email': 'contact@exemple-sarl.cm',
                'company_niu': 'M012023012345A',
                'company_rc_number': 'RC/DLA/2023/B/1234'
            }
        )

        if created:
            print(f"  ✓ Paramètres créés - Région: Cameroun (FCFA)")

        # Créer ou récupérer l'utilisateur
        username = 'demo'
        self.user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': 'demo@exemple-sarl.cm',
                'first_name': 'Utilisateur',
                'last_name': 'Démo',
                'is_staff': False,
                'is_superuser': False,
                'organization': self.organization
            }
        )

        if created:
            self.user.set_password('demo123')
            self.user.save()
            print(f"  ✓ Utilisateur créé: {username} / demo123")
        else:
            print(f"  ℹ Utilisateur existant: {username}")

        return self.user

    def create_suppliers(self):
        """Crée des fournisseurs réalistes"""
        print("\n🏢 Création des fournisseurs...")

        for i, name in enumerate(self.supplier_names[:6]):  # 6 fournisseurs
            supplier, created = Supplier.objects.get_or_create(
                name=name,
                organization=self.organization,
                defaults={
                    'email': f'contact@{name.lower().replace(" ", "").replace("sarl", "").replace("ets", "")[:15]}.cm',
                    'phone': f'+237 6 {random.randint(70, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}',
                    'address': f'{random.randint(1, 999)} Rue {random.choice(["du Commerce", "de la Paix", "Joss", "Gallieni"])}, {random.choice(["Douala", "Yaoundé", "Bafoussam"])}',
                    'is_active': True
                }
            )

            self.suppliers.append(supplier)
            if created:
                print(f"  ✓ {name}")

        print(f"  Total: {len(self.suppliers)} fournisseurs")

    def create_clients(self):
        """Crée des clients réalistes"""
        print("\n👥 Création des clients...")

        for name in self.client_names[:12]:  # 12 clients
            # Générer un email valide
            import re
            email_base = re.sub(r'[^a-z0-9]', '', name.lower().replace("é", "e").replace("è", "e").replace("ê", "e"))[:20]

            client, created = Client.objects.get_or_create(
                name=name,
                organization=self.organization,
                defaults={
                    'email': f'{email_base}@email.cm',
                    'phone': f'+237 6 {random.randint(70, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}',
                    'address': f'{random.randint(1, 500)} {random.choice(["Bd", "Rue", "Avenue"])} {random.choice(["de la Liberté", "du Président", "Ahidjo", "Kennedy"])}',
                    'is_active': True,
                    'payment_terms': str(random.choice([15, 30, 45, 60]))
                }
            )

            self.clients.append(client)
            if created:
                print(f"  ✓ {name}")

        print(f"  Total: {len(self.clients)} clients")

    def create_warehouses(self):
        """Crée des entrepôts"""
        print("\n🏭 Création des entrepôts...")

        warehouses_data = [
            {"name": "Entrepôt Principal Douala", "code": "DLA01", "city": "Douala"},
            {"name": "Entrepôt Yaoundé", "code": "YDE01", "city": "Yaoundé"},
        ]

        for i, data in enumerate(warehouses_data):
            warehouse, created = Warehouse.objects.get_or_create(
                code=data['code'],
                organization=self.organization,
                defaults={
                    'name': data['name'],
                    'address': 'Zone Industrielle',
                    'city': data.get('city', 'Douala'),
                    'country': 'Cameroun',
                    'is_default': i == 0  # Premier entrepôt par défaut
                }
            )

            self.warehouses.append(warehouse)
            if created:
                print(f"  ✓ {data['name']}")

        print(f"  Total: {len(self.warehouses)} entrepôts")

    def create_product_categories(self):
        """Crée les catégories de produits"""
        print("\n📦 Création des catégories de produits...")

        from django.utils.text import slugify

        for cat_data in self.product_categories_data:
            slug = slugify(cat_data['name'])
            category, created = ProductCategory.objects.get_or_create(
                slug=slug,
                organization=self.organization,
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description']
                }
            )

            self.categories.append(category)
            if created:
                print(f"  ✓ {cat_data['name']}")

        print(f"  Total: {len(self.categories)} catégories")

    def create_products(self):
        """Crée des produits réalistes"""
        print("\n🛍️ Création des produits...")

        for product_data in self.products_data:
            category = self.categories[product_data['category_idx']]
            supplier = random.choice(self.suppliers)
            warehouse = random.choice(self.warehouses)

            # Générer une référence unique
            ref_prefix = ''.join([word[0] for word in product_data['name'].split()[:3]]).upper()
            reference = f"{ref_prefix}-{random.randint(1000, 9999)}"

            product, created = Product.objects.get_or_create(
                reference=reference,
                organization=self.organization,
                defaults={
                    'name': product_data['name'],
                    'description': f"Description détaillée de {product_data['name']}",
                    'category': category,
                    'supplier': supplier,
                    'warehouse': warehouse,
                    'price': Decimal(str(product_data['price'])),
                    'cost_price': Decimal(str(product_data['cost'])),
                    'stock_quantity': product_data['stock'],
                    'low_stock_threshold': max(10, product_data['stock'] // 10),
                    'product_type': 'physical',
                    'source_type': 'purchased',
                    'is_active': True
                }
            )

            if created:
                self.products.append(product)
                print(f"  ✓ {product_data['name']} - {product_data['price']} FCFA")

        print(f"  Total: {len(self.products)} produits créés")

    def create_purchase_orders(self):
        """Crée des bons de commande réalistes"""
        print("\n📋 Création des bons de commande...")

        # Créer 8-12 bons de commande sur les 3 derniers mois
        num_pos = random.randint(8, 12)

        for i in range(num_pos):
            supplier = random.choice(self.suppliers)

            # Date aléatoire dans les 90 derniers jours
            days_ago = random.randint(5, 90)
            order_date = datetime.now().date() - timedelta(days=days_ago)
            expected_date = order_date + timedelta(days=random.randint(7, 21))

            # Statut basé sur l'ancienneté (utiliser les choix valides du modèle)
            if days_ago > 60:
                status = random.choice(['received', 'received', 'cancelled'])
            elif days_ago > 30:
                status = random.choice(['approved', 'received', 'sent'])
            else:
                status = random.choice(['draft', 'approved', 'sent'])

            priority_text = ['standard', 'prioritaire', 'urgente'][random.randint(0, 2)]

            po = PurchaseOrder.objects.create(
                title=f"Commande {supplier.name[:30]}",
                supplier=supplier,
                required_date=order_date,
                expected_delivery_date=expected_date,
                status=status,
                priority='high' if priority_text == 'urgente' else 'normal',
                notes=f"Commande {priority_text}",
                subtotal=Decimal('0'),  # Sera mis à jour après ajout des items
                total_amount=Decimal('0'),  # Sera mis à jour après ajout des items
                created_by=self.user
            )

            # Ajouter 2-6 articles au bon de commande
            num_items = random.randint(2, 6)
            selected_products = random.sample(self.products, min(num_items, len(self.products)))

            subtotal = Decimal('0')
            for product in selected_products:
                quantity = random.randint(5, 50)
                unit_price = product.cost_price
                total_price = unit_price * quantity
                subtotal += total_price

                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product=product,
                    product_reference=product.reference,
                    description=product.name,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                )

            # Calculer les montants (Cameroun TVA 19.25%)
            po.subtotal = subtotal
            po.tax_gst_hst = subtotal * Decimal('0.1925')  # TVA 19.25%
            po.tax_qst = Decimal('0')
            po.total_amount = po.subtotal + po.tax_gst_hst
            po.save()

            self.purchase_orders.append(po)
            print(f"  ✓ BC-{po.po_number} - {supplier.name} - {po.total_amount:,.0f} FCFA ({status})")

        print(f"  Total: {len(self.purchase_orders)} bons de commande créés")

    def create_invoices(self):
        """Crée des factures réalistes"""
        print("\n💰 Création des factures...")

        # Créer 15-20 factures sur les 6 derniers mois
        num_invoices = random.randint(15, 20)

        for i in range(num_invoices):
            client = random.choice(self.clients)

            # Date aléatoire dans les 180 derniers jours
            days_ago = random.randint(1, 180)
            issue_date = datetime.now().date() - timedelta(days=days_ago)
            payment_days = int(client.payment_terms) if client.payment_terms else 30
            due_date = issue_date + timedelta(days=payment_days)

            # Statut basé sur l'ancienneté et la date d'échéance
            today = datetime.now().date()
            if due_date < today - timedelta(days=10):
                status = random.choice(['paid', 'paid', 'paid', 'overdue'])
            elif due_date < today:
                status = random.choice(['paid', 'paid', 'sent', 'overdue'])
            elif days_ago > 30:
                status = random.choice(['paid', 'sent'])
            else:
                status = random.choice(['draft', 'sent', 'paid'])

            invoice = Invoice.objects.create(
                client=client,
                title=f"Facture {random.choice(['mensuelle', 'commande', 'prestation', 'fournitures'])} {client.name.split()[0]}",
                description=f"Facturation pour services et produits fournis",
                due_date=due_date,
                status=status,
                payment_terms=client.payment_terms,
                subtotal=Decimal('0'),  # Sera mis à jour après ajout des items
                total_amount=Decimal('0'),  # Sera mis à jour après ajout des items
                currency='XAF',  # Franc CFA
                created_by=self.user
            )

            # Ajouter 1-5 articles à la facture
            num_items = random.randint(1, 5)
            selected_products = random.sample(self.products, min(num_items, len(self.products)))

            subtotal = Decimal('0')
            for product in selected_products:
                quantity = random.randint(1, 20)
                unit_price = product.price
                total_price = unit_price * quantity
                subtotal += total_price

                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    description=product.name,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                )

            # Calculer les montants
            invoice.subtotal = subtotal
            invoice.tax_amount = subtotal * Decimal('0.1925')  # TVA 19.25%
            invoice.total_amount = invoice.subtotal + invoice.tax_amount
            invoice.save()

            self.invoices.append(invoice)
            status_icon = {'draft': '📝', 'sent': '📤', 'paid': '✅', 'overdue': '⚠️'}.get(status, '📄')
            print(f"  {status_icon} FAC-{invoice.invoice_number} - {client.name[:25]} - {invoice.total_amount:,.0f} FCFA ({status})")

        print(f"  Total: {len(self.invoices)} factures créées")

    def print_summary(self):
        """Affiche un résumé des données créées"""
        print("\n" + "="*70)
        print("✨ GÉNÉRATION TERMINÉE AVEC SUCCÈS!")
        print("="*70)

        print(f"\n📊 RÉSUMÉ DES DONNÉES CRÉÉES:")
        print(f"  • Organisation: {self.organization.name}")
        print(f"  • Utilisateur: {self.user.username} (mot de passe: demo123)")
        print(f"  • Devise: XAF (FCFA)")
        print(f"  • Fournisseurs: {len(self.suppliers)}")
        print(f"  • Clients: {len(self.clients)}")
        print(f"  • Entrepôts: {len(self.warehouses)}")
        print(f"  • Catégories de produits: {len(self.categories)}")
        print(f"  • Produits: {len(self.products)}")
        print(f"  • Bons de commande: {len(self.purchase_orders)}")
        print(f"  • Factures: {len(self.invoices)}")

        # Statistiques des factures
        if self.invoices:
            total_revenue = sum(inv.total_amount for inv in self.invoices if inv.status == 'paid')
            pending_amount = sum(inv.total_amount for inv in self.invoices if inv.status == 'sent')
            overdue_amount = sum(inv.total_amount for inv in self.invoices if inv.status == 'overdue')

            print(f"\n💰 STATISTIQUES FINANCIÈRES:")
            print(f"  • Revenus encaissés: {total_revenue:,.0f} FCFA")
            print(f"  • En attente de paiement: {pending_amount:,.0f} FCFA")
            print(f"  • En retard: {overdue_amount:,.0f} FCFA")

        print(f"\n🔐 CONNEXION:")
        print(f"  Username: {self.user.username}")
        print(f"  Password: demo123")

        print("\n" + "="*70)

    def run(self):
        """Exécute la génération complète des données"""
        print("\n" + "="*70)
        print("🚀 GÉNÉRATION DES DONNÉES D'EXEMPLE POUR PROCUREGENIUS")
        print("="*70)

        try:
            self.create_user_and_organization()
            self.create_suppliers()
            self.create_clients()
            self.create_warehouses()
            self.create_product_categories()
            self.create_products()
            self.create_purchase_orders()
            self.create_invoices()
            self.print_summary()

        except Exception as e:
            print(f"\n❌ ERREUR: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == '__main__':
    generator = SampleDataGenerator()
    generator.run()
