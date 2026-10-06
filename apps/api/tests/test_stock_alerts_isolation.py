"""L'API des alertes de stock ne doit renvoyer que les produits de l'organisation de l'utilisateur."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Organization, User
from apps.invoicing.models import Product


@pytest.mark.django_db
def test_alertes_stock_limitees_a_l_organisation():
    a = Organization.objects.create(name='Org A')
    b = Organization.objects.create(name='Org B')
    ua = User.objects.create_user(username='sa', email='sa@a.test', password='x', organization=a)
    Product.objects.create(organization=a, name='Rupture A', price=Decimal('10'), stock_quantity=0, low_stock_threshold=5)
    Product.objects.create(organization=b, name='Rupture B secrete', price=Decimal('10'), stock_quantity=0, low_stock_threshold=5)
    Product.objects.create(organization=b, name='Bas B secret', price=Decimal('10'), stock_quantity=1, low_stock_threshold=5)

    c = APIClient()
    c.force_authenticate(user=ua)
    r = c.get('/api/v1/products/stock_alerts/')
    assert r.status_code == 200
    noms = [p['name'] for p in r.data['out_of_stock'] + r.data['low_stock']]
    assert 'Rupture A' in noms
    assert not any('B secret' in n for n in noms)
    assert r.data['out_of_stock_count'] == 1
