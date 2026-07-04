"""Tests des verrous de monétisation du module subscriptions.

Couvre les protections ajoutées :
  - un seul essai gratuit par organisation (anti-abus /start-trial/) ;
  - impossible de s'auto-attribuer un plan payant sans paiement
    (/subscribe/ et /change-plan/) ;
  - compteurs de quota atomiques ;
  - commande reset_monthly_quotas.
"""
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Organization, User
from apps.subscriptions.models import Subscription, SubscriptionPlan


@pytest.fixture
def plans(db):
    free = SubscriptionPlan.objects.create(
        code='free', name='Libre', description='Gratuit',
        price_monthly=0, included_users=1,
    )
    pro = SubscriptionPlan.objects.create(
        code='pro', name='Pro', description='Pro',
        price_monthly=29, included_users=1,
        has_ai_assistant=True, has_purchase_orders=True, has_suppliers=True,
    )
    business = SubscriptionPlan.objects.create(
        code='business', name='Business', description='Business',
        price_monthly=59, included_users=3,
        has_ai_assistant=True, has_purchase_orders=True, has_suppliers=True,
    )
    return {'free': free, 'pro': pro, 'business': business}


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Test Org Subs")


@pytest.fixture
def user(db, organization):
    return User.objects.create_user(
        username="subuser", email="sub@example.com",
        password="testpass123", organization=organization,
    )


@pytest.fixture
def api(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _make_sub(organization, plan, **kwargs):
    defaults = dict(
        billing_period='monthly',
        status='active',
        current_period_start=timezone.now(),
        current_period_end=timezone.now() + timedelta(days=30),
    )
    defaults.update(kwargs)
    return Subscription.objects.create(organization=organization, plan=plan, **defaults)


# ── /start-trial/ : anti-abus ────────────────────────────────────────────────

@pytest.mark.django_db
class TestStartTrial:
    def test_first_trial_ok(self, api, plans):
        resp = api.post('/api/v1/subscriptions/start-trial/', {'plan_code': 'pro'})
        assert resp.status_code == 200
        sub = Subscription.objects.get()
        assert sub.status == 'trial'
        assert sub.plan.code == 'pro'
        assert sub.trial_ends_at is not None

    def test_tier_switch_during_trial_keeps_deadline(self, api, plans, organization):
        ends = timezone.now() + timedelta(days=10)
        _make_sub(organization, plans['pro'], status='trial', trial_ends_at=ends,
                  current_period_end=ends)

        resp = api.post('/api/v1/subscriptions/start-trial/', {'plan_code': 'business'})
        assert resp.status_code == 200
        sub = Subscription.objects.get()
        assert sub.plan.code == 'business'
        # La date de fin d'essai n'est PAS repoussée par le changement de palier.
        assert abs((sub.trial_ends_at - ends).total_seconds()) < 2

    def test_no_second_trial_after_expiry(self, api, plans, organization):
        # Essai consommé : trial_ends_at dans le passé, retombé en gratuit.
        _make_sub(organization, plans['free'], status='active',
                  trial_ends_at=timezone.now() - timedelta(days=5))

        resp = api.post('/api/v1/subscriptions/start-trial/', {'plan_code': 'pro'})
        assert resp.status_code == 403
        assert resp.data.get('trial_already_used') is True
        assert Subscription.objects.get().plan.code == 'free'

    def test_free_always_allowed(self, api, plans, organization):
        _make_sub(organization, plans['free'], status='active',
                  trial_ends_at=timezone.now() - timedelta(days=5))
        resp = api.post('/api/v1/subscriptions/start-trial/', {'plan_code': 'free'})
        assert resp.status_code == 200

    def test_stripe_subscription_untouched(self, api, plans, organization):
        _make_sub(organization, plans['pro'], stripe_subscription_id='sub_123')
        resp = api.post('/api/v1/subscriptions/start-trial/', {'plan_code': 'business'})
        assert resp.status_code == 400


# ── /subscribe/ : pas de plan payant sans paiement ───────────────────────────

@pytest.mark.django_db
class TestSubscribeLock:
    def test_paid_plan_requires_checkout(self, api, plans):
        resp = api.post('/api/v1/subscriptions/subscribe/', {
            'plan_code': 'business', 'billing_period': 'monthly',
            'payment_method': 'manual',
        })
        assert resp.status_code == 402
        assert resp.data.get('checkout_required') is True
        assert Subscription.objects.count() == 0

    def test_free_plan_ok(self, api, plans):
        resp = api.post('/api/v1/subscriptions/subscribe/', {
            'plan_code': 'free', 'billing_period': 'monthly',
            'payment_method': 'manual',
        })
        assert resp.status_code == 201
        assert Subscription.objects.get().plan.code == 'free'


# ── /change-plan/ : verrou + parcours Stripe ─────────────────────────────────

@pytest.mark.django_db
class TestChangePlanLock:
    def test_paid_upgrade_without_stripe_requires_checkout(self, api, plans, organization):
        _make_sub(organization, plans['free'])
        resp = api.post('/api/v1/subscriptions/change-plan/', {'new_plan_code': 'pro'})
        assert resp.status_code == 402
        assert resp.data.get('checkout_required') is True
        assert Subscription.objects.get().plan.code == 'free'

    def test_downgrade_to_free_without_stripe_ok(self, api, plans, organization):
        # Essai en cours (pas d'abonnement Stripe) : retour au gratuit direct.
        _make_sub(organization, plans['pro'], status='trial',
                  trial_ends_at=timezone.now() + timedelta(days=10))
        resp = api.post('/api/v1/subscriptions/change-plan/', {'new_plan_code': 'free'})
        assert resp.status_code == 200
        assert Subscription.objects.get().plan.code == 'free'


# ── Compteurs & commande de reset ────────────────────────────────────────────

@pytest.mark.django_db
class TestQuotaCounters:
    def test_increment_usage_atomic(self, plans, organization):
        sub = _make_sub(organization, plans['pro'])
        sub.increment_usage('ai_requests')
        sub.increment_usage('ai_requests')
        sub.refresh_from_db()
        assert sub.ai_requests_this_month == 2

    def test_increment_unknown_type_noop(self, plans, organization):
        sub = _make_sub(organization, plans['pro'])
        sub.increment_usage('inexistant')  # ne lève pas

    def test_reset_monthly_quotas_command(self, plans, organization):
        sub = _make_sub(organization, plans['pro'],
                        invoices_this_month=7, purchase_orders_this_month=3,
                        ai_requests_this_month=42)
        call_command('reset_monthly_quotas')
        sub.refresh_from_db()
        assert sub.invoices_this_month == 0
        assert sub.purchase_orders_this_month == 0
        assert sub.ai_requests_this_month == 0

    def test_downgrade_keeps_trial_marker(self, plans, organization):
        ends = timezone.now() - timedelta(days=1)
        sub = _make_sub(organization, plans['pro'], status='trial', trial_ends_at=ends)
        assert sub.downgrade_to_free() is True
        sub.refresh_from_db()
        assert sub.plan.code == 'free'
        assert sub.status == 'active'
        # La trace de l'essai consommé est conservée (anti-abus).
        assert sub.trial_ends_at is not None
        assert sub.has_used_trial is True
