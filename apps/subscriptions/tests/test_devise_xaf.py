"""Tarifs en FCFA : pas de centimes chez Stripe (3 500 FCFA = 3500, pas 350000)."""
from decimal import Decimal
from unittest import mock

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.subscriptions.models import SubscriptionPlan
from apps.subscriptions.stripe_service import montant_stripe


def test_montant_stripe_devises():
    assert montant_stripe(3500, 'xaf') == 3500
    assert montant_stripe(3500, 'XOF') == 3500
    assert montant_stripe(900, 'eur') == 9
    assert montant_stripe(None, 'eur') == 0


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY='sk_test_simule')
def test_setup_stripe_prices_en_fcfa():
    SubscriptionPlan.objects.update(is_active=False)
    plan, _ = SubscriptionPlan.objects.update_or_create(code='pro', defaults=dict(
        name='Pro', price_monthly=Decimal('3500'), price_yearly=Decimal('35000'), currency='XAF',
        extra_user_price=Decimal('1500'), is_active=True,
        stripe_price_id_monthly='', stripe_price_id_yearly='',
        stripe_seat_price_id_monthly='', stripe_seat_price_id_yearly=''))
    crees = []

    def prix(**kw):
        crees.append(kw)
        return mock.Mock(id=f'price_{len(crees)}')

    with mock.patch('stripe.Product.create', return_value=mock.Mock(id='prod_x')), \
            mock.patch('stripe.Price.create', side_effect=prix):
        call_command('setup_stripe_prices')

    montants = sorted((c['currency'], c['unit_amount'], c['recurring']['interval']) for c in crees)
    assert montants == sorted([('xaf', 3500, 'month'), ('xaf', 35000, 'year'),
                               ('xaf', 1500, 'month'), ('xaf', 15000, 'year')])
    plan.refresh_from_db()
    assert plan.stripe_price_id_monthly and plan.stripe_seat_price_id_yearly
