"""Fixtures communes pour les tests du module IA"""
import pytest
from decimal import Decimal
from django.utils import timezone
from apps.accounts.models import User, Organization, Client
from apps.suppliers.models import Supplier
from apps.invoicing.models import Invoice, Product
from apps.ai_assistant.services import ActionExecutor, AsyncSafeUserContext


@pytest.fixture
def organization(db):
    """Organisation de test"""
    return Organization.objects.create(
        name="Test Organization",
        slug="test-org"
    )


@pytest.fixture
def user(db, organization):
    """Utilisateur de test"""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        organization=organization
    )


@pytest.fixture
def user_context(user, organization):
    """Contexte utilisateur pour ActionExecutor"""
    return {
        'id': user.id,
        'organization': organization,
        'username': user.username
    }


@pytest.fixture
def async_user_context(user):
    """Contexte async-safe pour ActionExecutor"""
    return AsyncSafeUserContext.from_user(user)


@pytest.fixture
def action_executor():
    """Instance d'ActionExecutor"""
    return ActionExecutor()


@pytest.fixture
def existing_client(db, organization):
    """Client existant pour tests"""
    return Client.objects.create(
        name="Acme Corp",
        email="contact@acme.com",
        phone="+33123456789",
        organization=organization,
        is_active=True
    )


@pytest.fixture
def existing_supplier(db, organization):
    """Fournisseur existant pour tests"""
    return Supplier.objects.create(
        name="DL Light Telecom",
        email="contact@dllight.com",
        phone="+33987654321",
        organization=organization,
        status='active',
        is_active=True
    )


@pytest.fixture
def existing_product(db, organization):
    """Produit existant pour tests"""
    return Product.objects.create(
        name="Lenovo Radian XR 4",
        reference="LENOVO-XR4",
        product_type='physical',
        price=Decimal('12000.00'),
        cost_price=Decimal('10000.00'),
        organization=organization,
        stock_quantity=100,
        low_stock_threshold=10,
        is_active=True
    )


@pytest.fixture
def similar_client(db, organization):
    """Client avec nom similaire pour tester entity matching"""
    return Client.objects.create(
        name="Acme Corporation",  # Similaire à "Acme Corp"
        email="info@acmecorp.com",
        organization=organization,
        is_active=True
    )


@pytest.fixture
def similar_supplier(db, organization):
    """Fournisseur avec nom similaire pour tester entity matching"""
    return Supplier.objects.create(
        name="DL Light",  # Similaire à "DL Light Telecom"
        email="contact@dllight.fr",
        organization=organization,
        status='active',
        is_active=True
    )
