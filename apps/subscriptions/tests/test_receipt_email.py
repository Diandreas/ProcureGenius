"""Tests du reçu de paiement par email (StripeService._send_receipt_email +
gating sur nouveau paiement uniquement dans _handle_payment_succeeded)."""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest
from django.utils import timezone

from apps.accounts.models import Organization, CustomUser
from apps.subscriptions.models import Subscription, SubscriptionPlan, SubscriptionPayment
from apps.subscriptions.stripe_service import StripeService


@pytest.fixture
def plan(db):
    return SubscriptionPlan.objects.create(
        code='pro', name='Pro', description='Pro', price_monthly=29,
    )


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org Receipt")


@pytest.fixture
def admin_user(organization):
    return CustomUser.objects.create_user(
        username="receiptadmin", email="admin@receipt.com", password="testpass123",
        organization=organization, role='admin',
    )


@pytest.fixture
def subscription(organization, plan):
    now = timezone.now()
    return Subscription.objects.create(
        organization=organization, plan=plan, status='active',
        billing_period='monthly',
        current_period_start=now, current_period_end=now + timedelta(days=30),
        stripe_subscription_id='sub_test123',
    )


@pytest.mark.django_db
class TestSendReceiptEmail:
    @patch('apps.core.email_utils.send_subscription_receipt_email')
    def test_sends_to_admin(self, mock_send, subscription, admin_user):
        mock_send.return_value = True
        StripeService._send_receipt_email(subscription, Decimal('29'), 'EUR')
        mock_send.assert_called_once_with(admin_user, subscription.organization, 'Pro', Decimal('29'), 'EUR')

    @patch('apps.core.email_utils.send_subscription_receipt_email')
    def test_no_admin_no_crash(self, mock_send, subscription):
        # Pas d'admin_user fixture -> aucun admin dans l'organisation
        StripeService._send_receipt_email(subscription, Decimal('29'), 'EUR')
        mock_send.assert_not_called()

    @patch('apps.core.email_utils.send_subscription_receipt_email')
    def test_email_failure_does_not_raise(self, mock_send, subscription, admin_user):
        mock_send.side_effect = Exception("SMTP down")
        # Ne doit jamais lever (le webhook ne doit pas echouer a cause de l'email)
        StripeService._send_receipt_email(subscription, Decimal('29'), 'EUR')


@pytest.mark.django_db
class TestPaymentSucceededReceiptGating:
    @patch('apps.subscriptions.stripe_service.StripeService._send_receipt_email')
    @patch('apps.subscriptions.stripe_service.stripe.Subscription.retrieve')
    def test_new_payment_sends_receipt(self, mock_retrieve, mock_send_receipt, subscription):
        now = timezone.now()
        mock_retrieve.return_value = {
            'current_period_start': int(now.timestamp()),
            'current_period_end': int((now + timedelta(days=30)).timestamp()),
        }
        invoice = {
            'subscription': 'sub_test123', 'id': 'in_new_001',
            'amount_paid': 2900, 'currency': 'eur', 'payment_intent': 'pi_1',
        }
        StripeService._handle_payment_succeeded(invoice)

        assert SubscriptionPayment.objects.filter(transaction_id='in_new_001').exists()
        mock_send_receipt.assert_called_once()

    @patch('apps.subscriptions.stripe_service.StripeService._send_receipt_email')
    @patch('apps.subscriptions.stripe_service.stripe.Subscription.retrieve')
    def test_replayed_webhook_does_not_resend_receipt(self, mock_retrieve, mock_send_receipt, subscription):
        now = timezone.now()
        mock_retrieve.return_value = {
            'current_period_start': int(now.timestamp()),
            'current_period_end': int((now + timedelta(days=30)).timestamp()),
        }
        invoice = {
            'subscription': 'sub_test123', 'id': 'in_replay_001',
            'amount_paid': 2900, 'currency': 'eur', 'payment_intent': 'pi_1',
        }
        StripeService._handle_payment_succeeded(invoice)
        StripeService._handle_payment_succeeded(invoice)  # rejeu du meme evenement

        assert SubscriptionPayment.objects.filter(transaction_id='in_replay_001').count() == 1
        mock_send_receipt.assert_called_once()  # pas de doublon
