"""Tests de la commande send_trial_reminders (relances email J-7/J-1)."""
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import Organization, CustomUser
from apps.subscriptions.models import Subscription, SubscriptionPlan


@pytest.fixture
def plan(db):
    return SubscriptionPlan.objects.create(
        code='pro', name='Pro', description='Pro', price_monthly=29,
    )


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org TrialReminders")


@pytest.fixture
def admin_user(organization):
    return CustomUser.objects.create_user(
        username="trialadmin", email="admin@trial.com", password="testpass123",
        organization=organization, role='admin',
    )


def _trial_sub(organization, plan, days_until_end, **kwargs):
    now = timezone.now()
    defaults = dict(
        organization=organization, plan=plan, status='trial',
        billing_period='monthly',
        current_period_start=now, current_period_end=now + timedelta(days=days_until_end),
        trial_ends_at=now + timedelta(days=days_until_end),
    )
    defaults.update(kwargs)
    return Subscription.objects.create(**defaults)


@pytest.mark.django_db
class TestSendTrialReminders:
    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_sends_j7_reminder(self, mock_send, organization, plan, admin_user):
        mock_send.return_value = True
        sub = _trial_sub(organization, plan, days_until_end=7)

        call_command('send_trial_reminders')

        sub.refresh_from_db()
        assert sub.trial_reminder_7d_sent is True
        assert sub.trial_reminder_1d_sent is False
        mock_send.assert_called_once_with(admin_user, organization, plan.name, 7)

    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_sends_j1_reminder(self, mock_send, organization, plan, admin_user):
        mock_send.return_value = True
        sub = _trial_sub(organization, plan, days_until_end=1)

        call_command('send_trial_reminders')

        sub.refresh_from_db()
        assert sub.trial_reminder_1d_sent is True
        mock_send.assert_called_once_with(admin_user, organization, plan.name, 1)

    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_no_reminder_outside_window(self, mock_send, organization, plan, admin_user):
        _trial_sub(organization, plan, days_until_end=15)

        call_command('send_trial_reminders')

        mock_send.assert_not_called()

    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_idempotent_already_sent(self, mock_send, organization, plan, admin_user):
        _trial_sub(organization, plan, days_until_end=7, trial_reminder_7d_sent=True)

        call_command('send_trial_reminders')

        mock_send.assert_not_called()

    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_no_admin_user_skipped_without_crash(self, mock_send, organization, plan):
        # Pas d'admin_user fixture -> aucun utilisateur admin dans l'org
        _trial_sub(organization, plan, days_until_end=7)

        call_command('send_trial_reminders')

        mock_send.assert_not_called()

    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_dry_run_does_not_send_or_flag(self, mock_send, organization, plan, admin_user):
        sub = _trial_sub(organization, plan, days_until_end=7)

        call_command('send_trial_reminders', '--dry-run')

        sub.refresh_from_db()
        assert sub.trial_reminder_7d_sent is False
        mock_send.assert_not_called()

    @patch('apps.core.email_utils.send_trial_ending_email')
    def test_active_subscription_not_reminded(self, mock_send, organization, plan, admin_user):
        now = timezone.now()
        Subscription.objects.create(
            organization=organization, plan=plan, status='active',
            billing_period='monthly',
            current_period_start=now, current_period_end=now + timedelta(days=7),
            trial_ends_at=now + timedelta(days=7),  # essai déjà termine, plan actif
        )

        call_command('send_trial_reminders')

        mock_send.assert_not_called()
