"""Tests d'isolation multi-tenant (Phase 2).

Garantit qu'une organisation ne voit JAMAIS les données d'une autre via l'API.
Ce filet fait échouer tout viewset qui oublierait le filtre `organization`
(régression = fuite de données entre clients = incident majeur pour un SaaS).

Couvre les entités principales + les deux viewsets qui filtraient de façon
divergente (warehouses, product-categories) et un utilisateur SANS organisation
(qui ne doit rien voir plutôt que tout voir).
"""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Organization, CustomUser, Client
from apps.suppliers.models import Supplier
from apps.invoicing.models import Product, ProductCategory, Warehouse


@pytest.fixture
def org_a(db):
    return Organization.objects.create(name="Org A")


@pytest.fixture
def org_b(db):
    return Organization.objects.create(name="Org B")


def _user(org, username, email):
    u = CustomUser.objects.create_user(
        username=username, email=email, password="testpass123", organization=org,
    )
    # Débloquer tous les modules pour que HasModuleAccess ne masque pas le 403.
    from apps.core.modules import Modules
    org.enabled_modules = [
        Modules.SUPPLIERS, Modules.PRODUCTS, Modules.CLIENTS, Modules.INVOICES,
    ]
    org.save(update_fields=['enabled_modules'])
    return u


@pytest.fixture
def client_b(org_b):
    api = APIClient()
    api.force_authenticate(user=_user(org_b, "userb", "b@example.com"))
    return api


@pytest.fixture
def data_in_org_a(org_a):
    """Crée une donnée de chaque type dans l'organisation A."""
    return {
        'warehouse': Warehouse.objects.create(organization=org_a, name="Dépôt A", code="WH-A"),
        'category': ProductCategory.objects.create(organization=org_a, name="Cat A", slug="cat-a"),
        'product': Product.objects.create(
            organization=org_a, name="Produit A", reference="P-A",
            product_type='physical', price=Decimal('10'), cost_price=Decimal('5'),
        ),
        'client': Client.objects.create(organization=org_a, name="Client A", email="ca@a.com"),
        'supplier': Supplier.objects.create(organization=org_a, name="Fourn A", status='active'),
    }


@pytest.mark.django_db
class TestTenantIsolation:
    """L'organisation B ne doit voir AUCUNE donnée de l'organisation A."""

    def _ids(self, resp):
        data = resp.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        return [r.get('id') for r in results] if isinstance(results, list) else []

    def test_warehouses_isolated(self, client_b, data_in_org_a):
        resp = client_b.get('/api/v1/warehouses/')
        assert resp.status_code == 200
        assert str(data_in_org_a['warehouse'].id) not in [str(i) for i in self._ids(resp)]

    def test_product_categories_isolated(self, client_b, data_in_org_a):
        resp = client_b.get('/api/v1/product-categories/')
        assert resp.status_code == 200
        assert str(data_in_org_a['category'].id) not in [str(i) for i in self._ids(resp)]

    def test_products_isolated(self, client_b, data_in_org_a):
        resp = client_b.get('/api/v1/products/')
        assert resp.status_code == 200
        assert str(data_in_org_a['product'].id) not in [str(i) for i in self._ids(resp)]

    def test_clients_isolated(self, client_b, data_in_org_a):
        resp = client_b.get('/api/v1/clients/')
        assert resp.status_code == 200
        assert str(data_in_org_a['client'].id) not in [str(i) for i in self._ids(resp)]

    def test_suppliers_isolated(self, client_b, data_in_org_a):
        resp = client_b.get('/api/v1/suppliers/')
        assert resp.status_code == 200
        assert str(data_in_org_a['supplier'].id) not in [str(i) for i in self._ids(resp)]

    def test_cannot_retrieve_other_org_warehouse_by_id(self, client_b, data_in_org_a):
        # Accès direct par ID d'une ressource d'un autre tenant -> 404 (pas 200).
        resp = client_b.get(f"/api/v1/warehouses/{data_in_org_a['warehouse'].id}/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestNoOrgUserSeesNothing:
    """Un utilisateur sans organisation ne doit voir aucune donnée (défaut sûr)."""

    def test_no_org_user_sees_no_warehouses(self, data_in_org_a):
        user = CustomUser.objects.create_user(
            username="noorg", email="noorg@example.com", password="testpass123",
            organization=None,
        )
        api = APIClient()
        api.force_authenticate(user=user)
        resp = api.get('/api/v1/warehouses/')
        # 200 avec liste vide, ou 403 si un garde module intervient — jamais les
        # données d'un autre tenant.
        if resp.status_code == 200:
            data = resp.json()
            results = data.get('results', data) if isinstance(data, dict) else data
            assert results == [] or results == {}
