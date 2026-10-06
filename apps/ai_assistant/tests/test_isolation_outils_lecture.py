"""Isolation entre organisations : un outil de lecture de l'IA ne doit jamais
renvoyer les données d'une autre organisation (constaté : get_stock_alerts
listait les produits de tous les clients)."""
import json
from decimal import Decimal

import pytest
from asgiref.sync import async_to_sync

from apps.accounts.models import Client, Organization, User
from apps.ai_assistant._services_core import AsyncSafeUserContext
from apps.ai_assistant.public_demo import OUTILS_AUTORISES
from apps.ai_assistant.services.registry.tool_registry import registry
from apps.invoicing.models import Invoice, InvoiceItem, Product
from apps.suppliers.models import Supplier

SECRET = 'zzsecretorgb'


def _peupler(org, user, suffixe):
    f = Supplier.objects.create(organization=org, name=f'Fournisseur {suffixe}', email=f'f@{suffixe}.test')
    p = Product.objects.create(organization=org, name=f'Produit {suffixe}', price=Decimal('1000'),
                               cost_price=Decimal('600'), stock_quantity=0, low_stock_threshold=5, supplier=f)
    Product.objects.create(organization=org, name=f'Article {suffixe}', price=Decimal('500'),
                           stock_quantity=2, low_stock_threshold=5)
    c = Client.objects.create(organization=org, name=f'Client {suffixe}')
    inv = Invoice.objects.create(organization=org, client=c, created_by=user, invoice_number=f'F-{suffixe}',
                                 subtotal=Decimal(0), total_amount=Decimal(0), status='sent')
    InvoiceItem.objects.create(invoice=inv, product=p, description=p.name, quantity=2,
                               unit_price=p.price, total_price=p.price * 2)


@pytest.fixture
def deux_orgs(db):
    a = Organization.objects.create(name='Org A')
    b = Organization.objects.create(name=f'Org {SECRET}')
    ua = User.objects.create_user(username='ua', email='ua@a.test', password='x', organization=a)
    ub = User.objects.create_user(username='ub', email='ub@b.test', password='x', organization=b)
    _peupler(a, ua, 'aaa')
    _peupler(b, ub, SECRET)
    return ua


# Mots présents dans les DEUX organisations : un outil mal cloisonné renverrait
# aussi les fiches de l'organisation B (dont le nom contient SECRET).
CLES = ('query', 'search', 'name', 'search_term', 'product_name', 'client_name', 'supplier_name')
RECHERCHES = [{}] + [{k: mot for k in CLES} for mot in ('Produit', 'Article', 'Client', 'Fournisseur', 'F-')]


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize('outil', sorted(OUTILS_AUTORISES))
def test_outil_de_lecture_ne_voit_pas_une_autre_organisation(deux_orgs, outil):
    ctx = AsyncSafeUserContext.from_user(deux_orgs)
    for params in RECHERCHES:
        resultat = async_to_sync(registry.call)(outil, dict(params), ctx)
        texte = json.dumps(resultat, default=str, ensure_ascii=False).lower()
        assert SECRET not in texte, f'{outil} expose des données d\'une autre organisation : {texte[:300]}'
