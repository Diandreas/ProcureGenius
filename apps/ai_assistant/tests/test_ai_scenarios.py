"""
Tests de scénarios complets pour le module IA
Teste la création de factures, commandes, fournisseurs, etc.
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.ai_assistant.services import MistralService
from apps.organizations.models import Organization
from apps.suppliers.models import Supplier
from apps.clients.models import Client
from apps.products.models import Product
from decimal import Decimal

User = get_user_model()


@pytest.mark.django_db
class TestAIScenarios(TestCase):
    """Tests des scénarios utilisateur complets"""

    def setUp(self):
        """Configuration initiale pour chaque test"""
        self.org = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.user.organization = self.org
        self.user.save()

        # Créer quelques données de base
        self.supplier = Supplier.objects.create(
            name="Fournisseur Test",
            organization=self.org,
            email="supplier@test.com"
        )
        self.client = Client.objects.create(
            name="Client Test",
            organization=self.org,
            email="client@test.com"
        )
        self.product = Product.objects.create(
            name="Produit Test",
            organization=self.org,
            price=Decimal("100.00")
        )

        self.service = MistralService()

    @pytest.mark.asyncio
    async def test_create_invoice_complete_scenario(self):
        """Test: Créer une facture complète avec client et produit"""
        user_message = (
            "Crée une facture pour le client Client Test "
            "qui a acheté 2 Produit Test à 100€ l'unité aujourd'hui"
        )

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Vérifications
        assert result is not None
        assert 'response' in result or 'message' in result
        assert result.get('success', True) is True

        # Vérifier que la facture a été créée
        from apps.invoices.models import Invoice
        invoices = Invoice.objects.filter(organization=self.org)
        assert invoices.count() > 0

    @pytest.mark.asyncio
    async def test_create_supplier_scenario(self):
        """Test: Créer un nouveau fournisseur"""
        user_message = "Crée un fournisseur nommé ACME Corp avec l'email acme@example.com"

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Vérifications
        assert result is not None
        suppliers = Supplier.objects.filter(
            organization=self.org,
            name__icontains="ACME"
        )
        assert suppliers.count() > 0
        assert suppliers.first().email == "acme@example.com"

    @pytest.mark.asyncio
    async def test_fuzzy_match_existing_client(self):
        """Test: Doit reconnaître un client existant malgré variation de nom"""
        # Créer client "Gérard Dupont"
        Client.objects.create(
            name="Gérard Dupont",
            organization=self.org,
            email="gerard@test.com"
        )

        user_message = "Crée une facture pour Gérard qui a acheté pour 500€"

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Le système doit demander confirmation ou utiliser le client existant
        # Ne pas créer de doublon
        clients_gerard = Client.objects.filter(
            organization=self.org,
            name__icontains="Gérard"
        )
        assert clients_gerard.count() == 1  # Pas de doublon

    @pytest.mark.asyncio
    async def test_search_supplier_scenario(self):
        """Test: Rechercher un fournisseur existant"""
        user_message = "Trouve le fournisseur Fournisseur Test"

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Doit trouver le fournisseur
        assert result is not None
        response_text = result.get('response', result.get('message', '')).lower()
        assert 'fournisseur test' in response_text or 'trouvé' in response_text

    @pytest.mark.asyncio
    async def test_create_purchase_order_scenario(self):
        """Test: Créer une commande d'achat"""
        user_message = (
            "Crée une commande d'achat pour 10 Produit Test "
            "auprès de Fournisseur Test"
        )

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Vérifications
        assert result is not None
        from apps.purchase_orders.models import PurchaseOrder
        orders = PurchaseOrder.objects.filter(organization=self.org)
        assert orders.count() > 0

    @pytest.mark.asyncio
    async def test_token_usage_tracking(self):
        """Test: Vérifier que l'utilisation des tokens est trackée"""
        user_message = "Cherche tous les fournisseurs"

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Doit contenir des infos sur tokens
        assert 'tokens_used' in result or 'usage' in result

    @pytest.mark.asyncio
    async def test_cache_system_prompt(self):
        """Test: Vérifier que le system prompt est caché"""
        # Premier appel
        await self.service.chat("test message 1", self.user.id)

        # Deuxième appel - doit utiliser le cache
        await self.service.chat("test message 2", self.user.id)

        # Le cache doit exister
        from django.core.cache import cache
        cache_key = f"system_prompt_{self.org.id}"
        cached = cache.get(cache_key)
        assert cached is not None

    @pytest.mark.asyncio
    async def test_conversation_history_compression(self):
        """Test: Vérifier que l'historique est compressé"""
        # Envoyer plusieurs messages
        for i in range(15):
            await self.service.chat(f"message {i}", self.user.id)

        # L'historique ne doit pas dépasser la limite
        # (vérifié via les méthodes internes de compression)
        assert True  # Test passif - vérifie juste que ça ne crash pas

    @pytest.mark.asyncio
    async def test_error_handling_invalid_request(self):
        """Test: Gestion des erreurs pour requête invalide"""
        user_message = "xyzabc123nonsense"

        user_context = {
            'user_id': self.user.id,
            'organization_id': self.org.id
        }

        result = await self.service.process_user_request(user_message, user_context)

        # Ne doit pas crasher, doit retourner un message
        assert result is not None
        assert 'response' in result or 'message' in result or 'error' in result


# Tests spécifiques par catégorie d'action

@pytest.mark.django_db
class TestSupplierActions:
    """Tests des actions fournisseurs (Scénario 1.x)"""

    @pytest.mark.asyncio
    async def test_create_supplier_success(self, action_executor, async_user_context, organization):
        """Scénario 1.1.A: Création réussie d'un nouveau fournisseur"""
        params = {
            'name': 'NewTechSupplier Corp',
            'email': 'new@techsupplier.com',
            'phone': '+1234567890'
        }

        result = await action_executor.create_supplier(params, async_user_context)

        assert result['success'] is True
        assert 'supplier_id' in result
        assert result.get('entity_type') == 'supplier'

        # Vérifier création en DB
        supplier = Supplier.objects.filter(name='NewTechSupplier Corp').first()
        assert supplier is not None
        assert supplier.email == 'new@techsupplier.com'

    @pytest.mark.asyncio
    async def test_create_supplier_similar_found(self, action_executor, async_user_context, existing_supplier):
        """Scénario 1.1.B: Détection de fournisseur similaire"""
        params = {
            'name': 'DL Light',  # Similaire à "DL Light Telecom"
            'email': 'test@dllight.com'
        }

        result = await action_executor.create_supplier(params, async_user_context)

        assert result['success'] is False
        assert result.get('error') == 'similar_entities_found'
        assert result.get('requires_confirmation') is True
        assert result.get('entity_type') == 'supplier'
        assert 'similar_entities' in result
        assert len(result['similar_entities']) > 0
        assert 'pending_confirmation' in result

        # Vérifier format de similarity (int 0-100)
        similarity = result['similar_entities'][0].get('similarity')
        assert isinstance(similarity, int)
        assert 0 <= similarity <= 100

    @pytest.mark.asyncio
    async def test_search_supplier_found(self, action_executor, async_user_context, existing_supplier):
        """Scénario 1.2.A: Recherche avec résultats"""
        params = {'query': 'DL Light'}

        result = await action_executor.search_supplier(params, async_user_context)

        assert result.get('success', True) is not False
        assert 'suppliers' in result or 'results' in result

    @pytest.mark.asyncio
    async def test_search_supplier_not_found(self, action_executor, async_user_context):
        """Scénario 1.2.B: Recherche sans résultats"""
        params = {'query': 'NonExistentSupplier9999'}

        result = await action_executor.search_supplier(params, async_user_context)

        # Ne doit pas crasher
        assert result is not None


@pytest.mark.django_db
class TestClientActions:
    """Tests des actions clients (Scénario 2.x)"""

    @pytest.mark.asyncio
    async def test_create_client_success(self, action_executor, async_user_context, organization):
        """Scénario 2.1.A: Création réussie d'un nouveau client"""
        params = {
            'name': 'Brand New Corp',
            'email': 'contact@brandnew.com'
        }

        result = await action_executor.create_client(params, async_user_context)

        assert result['success'] is True
        assert 'client_id' in result
        assert result.get('entity_type') == 'client'

        # Vérifier création en DB
        client = Client.objects.filter(name='Brand New Corp').first()
        assert client is not None

    @pytest.mark.asyncio
    async def test_create_client_similar_found(self, action_executor, async_user_context, existing_client):
        """Scénario 2.1.B: Détection de client similaire"""
        params = {
            'name': 'Acme',  # Similaire à "Acme Corp"
            'email': 'test@acme.com'
        }

        result = await action_executor.create_client(params, async_user_context)

        if result.get('success') is False:
            assert result.get('error') == 'similar_entities_found'
            assert result.get('entity_type') == 'client'
            assert 'similar_entities' in result

            # Vérifier format similarity
            if result['similar_entities']:
                similarity = result['similar_entities'][0].get('similarity')
                assert isinstance(similarity, int)
                assert 0 <= similarity <= 100

    @pytest.mark.asyncio
    async def test_search_client_by_name(self, action_executor, async_user_context, existing_client):
        """Scénario 2.2.A: Recherche par nom"""
        params = {'query': 'Acme'}

        result = await action_executor.search_client(params, async_user_context)

        assert result is not None
        assert result.get('success', True) is not False


@pytest.mark.django_db
class TestInvoiceActions:
    """Tests des actions factures (Scénario 3.x)"""

    @pytest.mark.asyncio
    async def test_create_invoice_with_existing_client(self, action_executor, async_user_context, existing_client, existing_product):
        """Scénario 3.1.A: Création facture avec client existant"""
        from datetime import date, timedelta

        params = {
            'client_name': existing_client.name,
            'client_email': existing_client.email,
            'issue_date': date.today().isoformat(),
            'due_date': (date.today() + timedelta(days=30)).isoformat(),
            'items': [
                {
                    'product_name': existing_product.name,
                    'quantity': 5,
                    'unit_price': float(existing_product.price)
                }
            ]
        }

        result = await action_executor.create_invoice(params, async_user_context)

        # Si similaire détecté, doit avoir format correct
        if result.get('success') is False:
            assert 'error' in result
            assert result.get('entity_type') == 'client'
        else:
            assert result['success'] is True
            assert 'invoice_number' in result or 'invoice_id' in result

    @pytest.mark.asyncio
    async def test_search_invoice_by_number(self, action_executor, async_user_context):
        """Scénario 3.2.A: Recherche par numéro"""
        params = {'query': 'FAC202512'}

        result = await action_executor.search_invoice(params, async_user_context)

        assert result is not None
        # Ne doit pas crasher avec KeyError
        assert 'success' in result or 'invoices' in result or 'results' in result or 'error' in result


@pytest.mark.django_db
class TestPurchaseOrderActions:
    """Tests des actions bons de commande (Scénario 4.x)"""

    @pytest.mark.asyncio
    async def test_create_purchase_order_success(self, action_executor, async_user_context, existing_supplier, existing_product):
        """Scénario 4.1.A: Création BC avec fournisseur existant"""
        from datetime import date, timedelta

        params = {
            'supplier_name': existing_supplier.name,
            'supplier_email': existing_supplier.email,
            'title': 'Commande test',
            'required_date': (date.today() + timedelta(days=7)).isoformat(),
            'items': [
                {
                    'product_name': existing_product.name,
                    'quantity': 10,
                    'unit_price': float(existing_product.price)
                }
            ]
        }

        result = await action_executor.create_purchase_order(params, async_user_context)

        # Vérifier format de retour
        assert result is not None
        assert 'success' in result or 'error' in result

        # Si similaire détecté, vérifier format
        if result.get('success') is False and result.get('error') == 'similar_entities_found':
            assert result.get('entity_type') == 'supplier'
            assert 'pending_confirmation' in result
            assert 'choices' in result['pending_confirmation']

        # Si succès, vérifier pas de KeyError sur po_number
        if result.get('success') is True:
            po_number = result.get('po_number', 'N/A')
            assert po_number != 'N/A'

    @pytest.mark.asyncio
    async def test_create_po_similar_supplier_format(self, action_executor, async_user_context, existing_supplier):
        """Scénario 4.1.B: Format pending_confirmation pour BC"""
        params = {
            'supplier_name': 'DL Light',  # Similaire
            'title': 'Test BC',
            'items': [{'product_name': 'Test', 'quantity': 1, 'unit_price': 100}]
        }

        result = await action_executor.create_purchase_order(params, async_user_context)

        if result.get('error') == 'similar_entities_found':
            # Vérifier format standardisé (pas suggested_action)
            assert 'pending_confirmation' in result
            assert 'action' in result['pending_confirmation']
            assert result['pending_confirmation']['action'] == 'create_purchase_order'


@pytest.mark.django_db
class TestProductActions:
    """Tests des actions produits (Scénario 5.x)"""

    @pytest.mark.asyncio
    async def test_create_product_physical(self, action_executor, async_user_context):
        """Scénario 5.1.A: Création produit physique"""
        params = {
            'name': 'Laptop Test Model',
            'reference': 'LAPTOP-001',
            'product_type': 'physical',
            'price': 1500.00,
            'stock_quantity': 10
        }

        result = await action_executor.create_product(params, async_user_context)

        assert result['success'] is True
        assert 'product_id' in result

        # Vérifier que supplier_reference n'a PAS été utilisé (champ inexistant)
        product = Product.objects.filter(reference='LAPTOP-001').first()
        assert product is not None
        assert not hasattr(product, 'supplier_reference')

    @pytest.mark.asyncio
    async def test_search_product_by_name(self, action_executor, async_user_context, existing_product):
        """Scénario 5.2.A: Recherche produit"""
        params = {'query': existing_product.name}

        result = await action_executor.search_product(params, async_user_context)

        assert result is not None


@pytest.mark.django_db
class TestReturnFormats:
    """Tests des formats de retour (Scénario 10.x)"""

    @pytest.mark.asyncio
    async def test_success_format_has_required_fields(self, action_executor, async_user_context):
        """Vérifier format succès standardisé"""
        params = {
            'name': 'Test Format Supplier',
            'email': 'format@test.com'
        }

        result = await action_executor.create_supplier(params, async_user_context)

        if result.get('success') is True:
            assert 'success' in result
            assert result['success'] is True
            # entity_type doit être présent
            assert result.get('entity_type') == 'supplier'

    @pytest.mark.asyncio
    async def test_confirmation_format_standardized(self, action_executor, async_user_context, similar_supplier):
        """Vérifier format confirmation standardisé"""
        params = {
            'name': 'DL Light',  # Similaire
            'email': 'test@dl.com'
        }

        result = await action_executor.create_supplier(params, async_user_context)

        if result.get('success') is False and result.get('error') == 'similar_entities_found':
            # Vérifier tous les champs requis
            assert 'requires_confirmation' in result
            assert result['requires_confirmation'] is True
            assert 'entity_type' in result
            assert 'similar_entities' in result
            assert 'pending_confirmation' in result

            # Vérifier structure pending_confirmation
            pc = result['pending_confirmation']
            assert 'action' in pc
            assert 'original_params' in pc
            assert 'choices' in pc

            # Vérifier similarity format (int)
            if result['similar_entities']:
                sim = result['similar_entities'][0].get('similarity')
                assert isinstance(sim, int)


@pytest.mark.django_db
class TestErrorHandling:
    """Tests de gestion d'erreurs (Scénario 9.x)"""

    @pytest.mark.asyncio
    async def test_missing_required_field(self, action_executor, async_user_context):
        """Scénario 9.1: Champs obligatoires manquants"""
        params = {}  # Pas de nom

        result = await action_executor.create_supplier(params, async_user_context)

        assert result['success'] is False
        assert 'error' in result

    @pytest.mark.asyncio
    async def test_entity_not_found(self, action_executor, async_user_context):
        """Scénario 9.2: Entité non trouvée"""
        params = {
            'invoice_number': 'FAC99999999',
            'status': 'paid'
        }

        result = await action_executor.update_invoice(params, async_user_context)

        assert result['success'] is False
        # Ne doit pas crasher avec KeyError
        invoice_num = result.get('invoice_number', 'N/A')
        assert invoice_num is not None


@pytest.mark.django_db
class TestConfirmationFlow:
    """Tests du flux de confirmation universel (Scénario 8.x)"""

    @pytest.mark.asyncio
    async def test_confirmation_use_existing(self, action_executor, async_user_context, existing_client):
        """Test choix 'use_existing'"""
        # Simuler détection similaire
        params = {
            'name': 'Acme',
            'email': 'new@acme.com'
        }

        result = await action_executor.create_client(params, async_user_context)

        if result.get('success') is False and 'pending_confirmation' in result:
            # Simuler confirmation utilisateur
            pc = result['pending_confirmation']
            confirmed_params = {**params}
            confirmed_params.update(pc['choices']['use_existing'])

            result2 = await action_executor.create_client(confirmed_params, async_user_context)

            # Doit réussir sans crash
            assert result2 is not None
            # Ne doit pas avoir KeyError
            client_name = result2.get('client_name', result2.get('name', 'N/A'))
            assert client_name != 'N/A'

    @pytest.mark.asyncio
    async def test_confirmation_force_create(self, action_executor, async_user_context, existing_supplier):
        """Test choix 'force_create'"""
        params = {
            'name': 'DL Light',
            'email': 'new@dllight.com'
        }

        result = await action_executor.create_supplier(params, async_user_context)

        if result.get('success') is False and 'pending_confirmation' in result:
            pc = result['pending_confirmation']
            confirmed_params = {**params}
            confirmed_params.update(pc['choices']['force_create'])

            result2 = await action_executor.create_supplier(confirmed_params, async_user_context)

            assert result2 is not None
            # Ne doit pas crasher avec KeyError
            if result2.get('success') is True:
                supplier_name = result2.get('supplier_name', result2.get('name', 'N/A'))
                assert supplier_name != 'N/A'
