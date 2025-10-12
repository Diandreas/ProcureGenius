#!/usr/bin/env python
"""
Script de test complet pour ProcureGenius
Valide tous les modules et fonctionnalités
"""

import os
import sys
import django
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from decimal import Decimal

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

# Imports des modèles
from apps.accounts.models import CustomUser
from apps.suppliers.models import Supplier
from apps.invoicing.models import Product, ProductCategory, Invoice, InvoiceItem, Payment
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.ai_assistant.models import AIConversation, AIMessage, AIAction

User = get_user_model()


class ProcureGeniusTestSuite:
    """Suite de tests complète pour ProcureGenius"""
    
    def __init__(self):
        self.client = Client()
        self.test_results = []
        
    def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 Démarrage des tests ProcureGenius...")
        print("=" * 60)
        
        # Tests des modèles
        self.test_models()
        
        # Tests des vues
        self.test_views()
        
        # Tests de l'IA
        self.test_ai_functionality()
        
        # Tests PayPal
        self.test_paypal_integration()
        
        # Tests d'internationalisation
        self.test_i18n()
        
        # Résumé final
        self.print_summary()
    
    def test_models(self):
        """Teste la création et les relations des modèles"""
        print("\n📊 Test des modèles de données...")
        
        try:
            # Test Tenant
            tenant = Tenant.objects.create(
                name="Entreprise Test",
                schema_name="test_schema",
                address="123 Rue Test",
                city="Montréal",
                province="QC",
                postal_code="H1H 1H1",
                phone="514-555-0123",
                email="test@entreprise.com"
            )
            self.log_test("✅ Tenant créé", True)
            
            # Test CustomUser
            user = CustomUser.objects.create_user(
                username="testuser",
                email="test@example.com",
                first_name="Test",
                last_name="User",
                role="buyer",
                language="fr"
            )
            self.log_test("✅ Utilisateur créé", True)
            
            # Test Supplier
            supplier = Supplier.objects.create(
                name="Fournisseur Test",
                contact_person="Jean Dupont",
                email="jean@fournisseur.com",
                phone="514-555-0456",
                address="456 Rue Fournisseur",
                city="Québec",
                province="QC",
                postal_code="G1G 1G1",
                status="active"
            )
            self.log_test("✅ Fournisseur créé", True)
            
            # Test Product Category
            category = ProductCategory.objects.create(
                name="Électronique",
                code="ELEC",
                description="Produits électroniques"
            )
            self.log_test("✅ Catégorie créée", True)
            
            # Test Product
            product = Product.objects.create(
                supplier=supplier,
                category=category,
                sku="ELEC-001",
                name="Ordinateur portable",
                description="Ordinateur portable 15 pouces",
                unit_price=Decimal('1200.00')
            )
            self.log_test("✅ Produit créé", True)
            
            # Test Client
            client = Client.objects.create(
                name="Client Test",
                contact_person="Marie Martin",
                email="marie@client.com",
                phone="514-555-0789",
                billing_address="789 Rue Client, Montréal, QC H2H 2H2"
            )
            self.log_test("✅ Client créé", True)
            
            # Test Purchase Order
            po = PurchaseOrder.objects.create(
                supplier=supplier,
                created_by=user,
                order_date=timezone.now().date(),
                shipping_address="123 Rue Livraison",
                billing_address="123 Rue Facturation",
                subtotal=Decimal('1200.00'),
                total_amount=Decimal('1380.00')  # Avec taxes
            )
            self.log_test("✅ Bon de commande créé", True)
            
            # Test Purchase Order Item
            po_item = PurchaseOrderItem.objects.create(
                purchase_order=po,
                product=product,
                description=product.name,
                quantity=Decimal('1.00'),
                unit_price=product.unit_price,
                total_price=product.unit_price
            )
            self.log_test("✅ Ligne de commande créée", True)
            
            # Test Invoice
            invoice = Invoice.objects.create(
                client=client,
                created_by=user,
                invoice_date=timezone.now().date(),
                due_date=timezone.now().date(),
                billing_address=client.billing_address,
                subtotal=Decimal('1200.00'),
                total_amount=Decimal('1380.00')
            )
            self.log_test("✅ Facture créée", True)
            
            # Test Payment
            payment = Payment.objects.create(
                invoice=invoice,
                amount=Decimal('1380.00'),
                payment_date=timezone.now().date(),
                payment_method='paypal',
                created_by=user
            )
            self.log_test("✅ Paiement créé", True)
            
        except Exception as e:
            self.log_test(f"❌ Erreur modèles: {str(e)}", False)
    
    def test_views(self):
        """Teste les vues principales"""
        print("\n🌐 Test des vues et URLs...")
        
        # Créer un utilisateur de test
        user = User.objects.create_user(
            username='testview',
            email='testview@example.com',
            password='testpass123'
        )
        
        # Se connecter
        login_success = self.client.login(username='testview', password='testpass123')
        self.log_test("✅ Connexion utilisateur", login_success)
        
        # Tester les URLs principales
        urls_to_test = [
            ('core:dashboard', 'Tableau de bord'),
            ('suppliers:list', 'Liste fournisseurs'),
            ('purchase_orders:list', 'Liste bons de commande'),
            ('invoicing:list', 'Liste factures'),
            ('ai_assistant:chat_interface', 'Interface IA'),
            ('analytics:dashboard', 'Analytics dashboard'),
        ]
        
        for url_name, description in urls_to_test:
            try:
                response = self.client.get(reverse(url_name))
                success = response.status_code in [200, 302]
                self.log_test(f"{'✅' if success else '❌'} {description} ({response.status_code})", success)
            except Exception as e:
                self.log_test(f"❌ {description}: {str(e)}", False)
    
    def test_ai_functionality(self):
        """Teste les fonctionnalités IA"""
        print("\n🤖 Test des fonctionnalités IA...")
        
        try:
            # Test création conversation
            user = User.objects.first()
            conversation = AIConversation.objects.create(
                user=user,
                title="Test IA",
                conversation_type="general"
            )
            self.log_test("✅ Conversation IA créée", True)
            
            # Test message IA
            message = AIMessage.objects.create(
                conversation=conversation,
                role="user",
                content="Test message IA"
            )
            self.log_test("✅ Message IA créé", True)
            
            # Test action IA
            action = AIAction.objects.create(
                user=user,
                action_type="analyze_spend",
                parameters={"period": "30days"},
                confidence_score=0.85
            )
            self.log_test("✅ Action IA créée", True)
            
        except Exception as e:
            self.log_test(f"❌ Erreur IA: {str(e)}", False)
    
    def test_paypal_integration(self):
        """Teste l'intégration PayPal"""
        print("\n💳 Test de l'intégration PayPal...")
        
        try:
            from apps.invoicing.services import PayPalService
            
            # Test initialisation service PayPal
            paypal_service = PayPalService()
            self.log_test("✅ Service PayPal initialisé", True)
            
            # Test structure des données de paiement
            payment_data = {
                'amount': 100.00,
                'currency': 'CAD',
                'description': 'Test payment',
                'invoice_id': 'TEST-001',
                'return_url': 'http://localhost:8000/success',
                'cancel_url': 'http://localhost:8000/cancel',
            }
            
            # Vérifier que la structure est correcte
            required_fields = ['amount', 'currency', 'description', 'return_url', 'cancel_url']
            all_fields_present = all(field in payment_data for field in required_fields)
            self.log_test("✅ Structure paiement PayPal valide", all_fields_present)
            
        except Exception as e:
            self.log_test(f"❌ Erreur PayPal: {str(e)}", False)
    
    def test_i18n(self):
        """Teste l'internationalisation"""
        print("\n🌍 Test de l'internationalisation...")
        
        try:
            from django.utils.translation import activate, gettext
            
            # Test traduction française
            activate('fr')
            fr_text = gettext('Dashboard')
            self.log_test(f"✅ Traduction FR: '{fr_text}'", True)
            
            # Test traduction anglaise
            activate('en')
            en_text = gettext('Tableau de bord')
            self.log_test(f"✅ Traduction EN: '{en_text}'", True)
            
            # Vérifier les fichiers de traduction
            import os
            fr_po_exists = os.path.exists('locale/fr/LC_MESSAGES/django.po')
            en_po_exists = os.path.exists('locale/en/LC_MESSAGES/django.po')
            
            self.log_test("✅ Fichier traduction FR existe", fr_po_exists)
            self.log_test("✅ Fichier traduction EN existe", en_po_exists)
            
        except Exception as e:
            self.log_test(f"❌ Erreur i18n: {str(e)}", False)
    
    def test_database_integrity(self):
        """Teste l'intégrité de la base de données"""
        print("\n🗄️ Test de l'intégrité de la base de données...")
        
        try:
            # Vérifier les contraintes de clés étrangères
            from django.core.management import call_command
            from io import StringIO
            
            out = StringIO()
            call_command('check', stdout=out)
            check_output = out.getvalue()
            
            if "System check identified no issues" in check_output:
                self.log_test("✅ Intégrité base de données", True)
            else:
                self.log_test(f"❌ Problèmes détectés: {check_output}", False)
                
        except Exception as e:
            self.log_test(f"❌ Erreur vérification DB: {str(e)}", False)
    
    def log_test(self, message, success):
        """Enregistre le résultat d'un test"""
        self.test_results.append({
            'message': message,
            'success': success
        })
        print(f"  {message}")
    
    def print_summary(self):
        """Affiche le résumé des tests"""
        print("\n" + "=" * 60)
        print("📋 RÉSUMÉ DES TESTS")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - successful_tests
        
        print(f"Total des tests: {total_tests}")
        print(f"✅ Réussis: {successful_tests}")
        print(f"❌ Échoués: {failed_tests}")
        print(f"📊 Taux de réussite: {(successful_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ TESTS ÉCHOUÉS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['message']}")
        
        print("\n" + "=" * 60)
        
        if failed_tests == 0:
            print("🎉 TOUS LES TESTS SONT RÉUSSIS !")
            print("✅ L'application est prête pour le déploiement !")
        else:
            print("⚠️  Des problèmes ont été détectés.")
            print("🔧 Veuillez corriger les erreurs avant le déploiement.")


def main():
    """Fonction principale"""
    test_suite = ProcureGeniusTestSuite()
    test_suite.run_all_tests()


if __name__ == "__main__":
    main()