"""
Script pour générer des données de test complètes pour un utilisateur
Usage: py generate_test_data.py
"""
import os
import django
from decimal import Decimal
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import Client
from apps.invoicing.models import Product, ProductCategory, Invoice, InvoiceItem
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.suppliers.models import Supplier

User = get_user_model()

def print_header(text):
    print("\n" + "="*100)
    print(f"  {text}")
    print("="*100)

def generate_data_for_user(email):
    """Générer des données de test pour un utilisateur"""
    
    print_header(f"🚀 GÉNÉRATION DE DONNÉES DE TEST POUR: {email}")
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        print(f"❌ Utilisateur avec l'email '{email}' introuvable")
        return
    
    if not user.organization:
        print(f"❌ L'utilisateur n'a pas d'organisation")
        return
    
    org = user.organization
    print(f"✓ Organisation: {org.name}\n")
    
    # ========== CRÉER DES CATÉGORIES DE PRODUITS ==========
    print_header("📁 CRÉATION DES CATÉGORIES DE PRODUITS")
    
    categories_data = [
        ("Électronique", "Produits électroniques et high-tech"),
        ("Mobilier", "Meubles et équipements de bureau"),
        ("Consommables", "Fournitures et consommables"),
        ("Services", "Prestations de services"),
    ]
    
    categories = {}
    for name, desc in categories_data:
        cat, created = ProductCategory.objects.get_or_create(
            name=name,
            defaults={'description': desc}
        )
        categories[name] = cat
        status = "✓ Créée" if created else "→ Existante"
        print(f"  {status}: {name}")
    
    # ========== CRÉER DES PRODUITS ==========
    print_header("📦 CRÉATION DES PRODUITS (avec prix de revient)")
    
    products_data = [
        ("Ordinateur Portable Dell XPS", "Électronique", 1200.00, 900.00, "physical", 15, 5),
        ("Souris Sans Fil Logitech", "Électronique", 35.00, 20.00, "physical", 50, 10),
        ("Clavier Mécanique RGB", "Électronique", 85.00, 50.00, "physical", 30, 8),
        ("Bureau Ajustable Électrique", "Mobilier", 650.00, 400.00, "physical", 8, 2),
        ("Chaise Ergonomique", "Mobilier", 350.00, 200.00, "physical", 12, 3),
        ("Ramette Papier A4", "Consommables", 8.50, 4.00, "physical", 100, 20),
        ("Stylos (Lot de 10)", "Consommables", 6.00, 2.50, "physical", 80, 15),
        ("Formation Excel Avancé", "Services", 450.00, 300.00, "service", 0, 0),
        ("Consulting IT (Heure)", "Services", 120.00, 80.00, "service", 0, 0),
        ("Maintenance Informatique", "Services", 200.00, 120.00, "service", 0, 0),
    ]
    
    products = []
    for name, cat_name, price, cost, ptype, stock, threshold in products_data:
        product, created = Product.objects.get_or_create(
            organization=org,
            name=name,
            defaults={
                'description': f"Description de {name}",
                'category': categories[cat_name],
                'price': Decimal(str(price)),
                'cost_price': Decimal(str(cost)),
                'product_type': ptype,
                'stock_quantity': stock,
                'low_stock_threshold': threshold,
                'is_active': True
            }
        )
        products.append(product)
        status = "✓ Créé" if created else "→ Existant"
        margin = ((price - cost) / cost * 100) if cost > 0 else 0
        print(f"  {status}: {name} (Prix: {price}€, Coût: {cost}€, Marge: {margin:.1f}%)")
    
    # ========== CRÉER DES CLIENTS ==========
    print_header("👥 CRÉATION DES CLIENTS")
    
    clients_data = [
        ("TechCorp Solutions", "contact@techcorp.com", "+33 1 23 45 67 89", "Net 30"),
        ("Innovate Digital", "info@innovate.com", "+33 1 98 76 54 32", "Net 15"),
        ("Global Services SARL", "contact@globalserv.fr", "+33 2 11 22 33 44", "Net 30"),
        ("StartUp Dynamics", "hello@startup.io", "+33 6 77 88 99 00", "Immédiat"),
        ("Enterprise Plus", "sales@enterprise.com", "+33 3 55 66 77 88", "Net 45"),
    ]
    
    clients = []
    for name, email, phone, terms in clients_data:
        client, created = Client.objects.get_or_create(
            organization=org,
            name=name,
            defaults={
                'email': email,
                'phone': phone,
                'address': f"123 Rue de {name}, 75001 Paris",
                'payment_terms': terms,
                'is_active': True
            }
        )
        clients.append(client)
        status = "✓ Créé" if created else "→ Existant"
        print(f"  {status}: {name} ({email})")
    
    # ========== CRÉER DES FACTURES ==========
    print_header("📄 CRÉATION DES FACTURES (dates récentes)")
    
    now = timezone.now()
    invoices = []
    
    # Générer des factures sur les 60 derniers jours
    for i in range(15):
        # Date aléatoire dans les 60 derniers jours
        days_ago = random.randint(1, 60)
        created_date = now - timedelta(days=days_ago)
        
        # Client aléatoire
        client = random.choice(clients)
        
        # Statut aléatoire
        statuses = ['paid', 'paid', 'paid', 'sent', 'sent', 'overdue', 'draft']
        status = random.choice(statuses)
        
        # Date d'échéance
        due_date = (created_date + timedelta(days=30)).date()
        
        # Créer la facture avec numéro unique
        import time
        timestamp = int(time.time() * 1000) % 100000
        invoice_number = f"INV-TEST-{timestamp}{i}"
        
        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            title=f"Facture pour {client.name}",
            description=f"Vente de produits et services",
            client=client,
            created_by=user,
            status=status,
            due_date=due_date,
            created_at=created_date,
            subtotal=Decimal('0'),
            tax_amount=Decimal('0'),
            total_amount=Decimal('0')
        )
        
        # Ajouter 1-4 produits à la facture
        num_items = random.randint(1, 4)
        subtotal = Decimal('0')
        
        for _ in range(num_items):
            product = random.choice(products)
            quantity = random.randint(1, 10)
            unit_price = product.price
            total = unit_price * quantity
            
            InvoiceItem.objects.create(
                invoice=invoice,
                product=product,
                description=product.name,
                quantity=quantity,
                unit_price=unit_price,
                tax_rate=Decimal('20.00'),
                total_price=total
            )
            
            subtotal += total
        
        # Mettre à jour les montants de la facture
        tax_amount = subtotal * Decimal('0.20')  # 20% TVA
        total_amount = subtotal + tax_amount
        
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total_amount = total_amount
        invoice.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])
        
        invoices.append(invoice)
        
        age = days_ago
        print(f"  ✓ {invoice_number} - {client.name[:20]:20} | {status:8} | {total_amount:>10.2f}€ | il y a {age:2} jours")
    
    # ========== CRÉER DES FOURNISSEURS ==========
    print_header("🏭 CRÉATION DES FOURNISSEURS")
    
    suppliers_data = [
        ("Dell Technologies", "orders@dell.com", "+33 1 11 11 11 11"),
        ("Logitech France", "pro@logitech.fr", "+33 2 22 22 22 22"),
        ("Office Depot", "b2b@officedepot.fr", "+33 3 33 33 33 33"),
        ("Tech Wholesale", "sales@techwholesale.com", "+33 4 44 44 44 44"),
    ]
    
    suppliers = []
    for name, email, phone in suppliers_data:
        supplier, created = Supplier.objects.get_or_create(
            organization=org,
            name=name,
            defaults={
                'email': email,
                'phone': phone,
                'address': f"Zone industrielle de {name}",
                'is_active': True,
                'status': 'active'
            }
        )
        suppliers.append(supplier)
        status_text = "✓ Créé" if created else "→ Existant"
        print(f"  {status_text}: {name}")
    
    # ========== CRÉER DES BONS DE COMMANDE ==========
    print_header("🛒 CRÉATION DES BONS DE COMMANDE")
    
    for i in range(10):
        # Date aléatoire dans les 60 derniers jours
        days_ago = random.randint(1, 60)
        created_date = now - timedelta(days=days_ago)
        
        # Fournisseur aléatoire
        supplier = random.choice(suppliers)
        
        # Statut aléatoire
        statuses = ['draft', 'pending', 'approved', 'approved', 'sent', 'received']
        status = random.choice(statuses)
        
        # Date de livraison attendue
        expected_date = (created_date + timedelta(days=15)).date()
        
        # Créer le BC avec numéro unique
        import time
        timestamp = int(time.time() * 1000) % 100000
        po_number = f"PO-TEST-{timestamp}{i}"
        
        po = PurchaseOrder.objects.create(
            po_number=po_number,
            title=f"Commande chez {supplier.name}",
            description=f"Achat de matériel",
            supplier=supplier,
            created_by=user,
            status=status,
            required_date=expected_date,
            expected_delivery_date=expected_date,
            created_at=created_date,
            subtotal=Decimal('0'),
            tax_gst_hst=Decimal('0'),
            tax_qst=Decimal('0'),
            total_amount=Decimal('0')
        )
        
        # Ajouter 1-3 produits au BC
        num_items = random.randint(1, 3)
        subtotal = Decimal('0')
        
        for _ in range(num_items):
            product = random.choice([p for p in products if p.product_type == 'physical'])
            quantity = random.randint(5, 20)
            unit_price = product.cost_price  # Prix d'achat
            total = unit_price * quantity
            
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                product=product,
                description=product.name,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total
            )
            
            subtotal += total
        
        # Mettre à jour les montants du BC  
        tax_gst = subtotal * Decimal('0.05')  # 5% TPS
        tax_qst = subtotal * Decimal('0.09975')  # 9.975% TVQ
        total_amount = subtotal + tax_gst + tax_qst
        
        po.subtotal = subtotal
        po.tax_gst_hst = tax_gst
        po.tax_qst = tax_qst
        po.total_amount = total_amount
        po.save(update_fields=['subtotal', 'tax_gst_hst', 'tax_qst', 'total_amount'])
        
        age = days_ago
        print(f"  ✓ {po_number} - {supplier.name[:20]:20} | {status:8} | {total_amount:>10.2f}€ | il y a {age:2} jours")
    
    # ========== RÉSUMÉ ==========
    print_header("📊 RÉSUMÉ DES DONNÉES CRÉÉES")
    
    summary = {
        'Catégories': ProductCategory.objects.count(),
        'Produits': Product.objects.filter(organization=org).count(),
        'Clients': Client.objects.filter(organization=org).count(),
        'Factures': Invoice.objects.filter(created_by__organization=org).count(),
        'Lignes de factures': InvoiceItem.objects.filter(invoice__created_by__organization=org).count(),
        'Fournisseurs': Supplier.objects.filter(organization=org).count(),
        'Bons de commande': PurchaseOrder.objects.filter(created_by__organization=org).count(),
    }
    
    print()
    for key, value in summary.items():
        print(f"  ✅ {key:25} {value:>5}")
    
    print("\n" + "="*100)
    print("✅ DONNÉES GÉNÉRÉES AVEC SUCCÈS!")
    print("="*100)
    print("\n💡 ÉTAPES SUIVANTES:")
    print("  1. Connectez-vous avec: njandjeudavid@gmail.com")
    print("  2. Ouvrez le dashboard")
    print("  3. Changez la période sur 'Cette année' ou '90 jours'")
    print("  4. Tous les widgets devraient afficher des données!")
    print("\n🧪 TESTER LES WIDGETS:")
    print("  py test_widgets_user.py njandjeudavid@gmail.com")
    print()

if __name__ == '__main__':
    generate_data_for_user('njandjeudavid@gmail.com')

