"""Les prix affichés par Procura viennent de Stripe (sync_stripe_prices)."""
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.subscriptions.models import SubscriptionPlan


class FauxStripe:
    """Prix Stripe simulés : {id: (produit, montant, devise, intervalle, actif, créé)}."""

    def __init__(self, prix):
        self.prix = prix

    def _obj(self, i):
        prod, montant, devise, intervalle, actif, cree = self.prix[i]
        return SimpleNamespace(id=i, product=prod, unit_amount=montant, currency=devise, active=actif,
                               created=cree, recurring={'interval': intervalle, 'interval_count': 1})

    def retrieve(self, i):
        return self._obj(i)

    def list(self, product, active=True, limit=100):
        objs = [self._obj(i) for i, v in self.prix.items() if v[0] == product and (v[4] or not active)]
        return SimpleNamespace(auto_paging_iter=lambda: iter(objs))


def _plans():
    for code, nom in (('pro', 'Pro'), ('business', 'Business')):
        SubscriptionPlan.objects.update_or_create(code=code, defaults=dict(
            name=nom, price_monthly=Decimal('3500'), price_yearly=Decimal('35000'), currency='XAF',
            extra_user_price=Decimal('1500'), is_active=True,
            stripe_price_id_monthly='', stripe_price_id_yearly='',
            stripe_seat_price_id_monthly='', stripe_seat_price_id_yearly=''))


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY='sk_test_simule')
def test_premiere_liaison_puis_changement_de_prix():
    _plans()
    faux = FauxStripe({
        'price_pro_m': ('prod_pro', 530, 'eur', 'month', True, 1),
        'price_biz_m': ('prod_biz', 1500, 'eur', 'month', True, 1),
        'price_seat_m': ('prod_seat', 350, 'eur', 'month', True, 1),
    })
    with mock.patch('stripe.Price', faux):
        call_command('sync_stripe_prices', '--pro', 'prod_pro', '--business', 'prod_biz', '--seat', 'prod_seat')

    pro = SubscriptionPlan.objects.get(code='pro')
    assert (pro.price_monthly, pro.currency, pro.extra_user_price) == (Decimal('5.30'), 'EUR', Decimal('3.50'))
    assert pro.stripe_price_id_monthly == 'price_pro_m' and pro.stripe_seat_price_id_monthly == 'price_seat_m'
    assert pro.stripe_price_id_yearly == '' and pro.price_yearly == 0  # pas d'annuel dans Stripe

    # L'administrateur crée un nouveau prix dans Stripe et archive l'ancien :
    # la synchro sans argument retrouve le produit et suit.
    faux.prix['price_pro_m'] = ('prod_pro', 530, 'eur', 'month', False, 1)
    faux.prix['price_pro_m2'] = ('prod_pro', 600, 'eur', 'month', True, 2)
    faux.prix['price_pro_y'] = ('prod_pro', 6000, 'eur', 'year', True, 2)
    with mock.patch('stripe.Price', faux):
        call_command('sync_stripe_prices')
    pro.refresh_from_db()
    assert (pro.stripe_price_id_monthly, pro.price_monthly) == ('price_pro_m2', Decimal('6.00'))
    assert (pro.stripe_price_id_yearly, pro.price_yearly) == ('price_pro_y', Decimal('60.00'))


@pytest.mark.django_db
def test_api_publique_des_formules_sans_authentification():
    from rest_framework.test import APIClient
    _plans()
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION='Token jeton-expire')
    r = c.get('/api/v1/subscriptions/plans/')
    assert r.status_code == 200
    pro = next(p for p in r.data['plans'] if p['code'] == 'pro')
    assert pro['extra_user_price'] == '1500.00' and pro['yearly_available'] is False
