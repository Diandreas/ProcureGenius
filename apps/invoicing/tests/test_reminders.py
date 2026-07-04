"""Tests de la commande send_invoice_reminders (dunning automatique)."""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import Organization, Client, CustomUser
from apps.core.models import OrganizationSettings
from apps.invoicing.models import Invoice, InvoiceReminderLog


@pytest.fixture
def organization(db):
    org = Organization.objects.create(name="Org Reminders")
    OrganizationSettings.objects.create(
        organization=org,
        auto_reminders_enabled=True,
        reminder_delay_1=3, reminder_delay_2=10, reminder_delay_3=30,
        reminder_max_count=3,
    )
    return org


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="reminderuser", email="u@example.com",
        password="testpass123", organization=organization,
    )


@pytest.fixture
def client_with_email(organization):
    return Client.objects.create(organization=organization, name="Client A", email="client@a.com")


def _make_invoice(organization, user, client, due_days_ago, **kwargs):
    defaults = dict(
        organization=organization, created_by=user, client=client,
        status='sent', subtotal=Decimal('100'), total_amount=Decimal('100'),
        due_date=timezone.localdate() - timedelta(days=due_days_ago),
    )
    defaults.update(kwargs)
    return Invoice.objects.create(**defaults)


@pytest.mark.django_db
class TestSendInvoiceReminders:
    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_sends_first_reminder_after_delay(self, mock_send, organization, user, client_with_email):
        mock_send.return_value = {'success': True}
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4)

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 1
        assert invoice.last_reminder_sent_at is not None
        assert InvoiceReminderLog.objects.filter(invoice=invoice, success=True).count() == 1
        mock_send.assert_called_once()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_no_reminder_before_delay(self, mock_send, organization, user, client_with_email):
        mock_send.return_value = {'success': True}
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=1)  # < delay_1=3

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_opt_out_per_invoice_skipped(self, mock_send, organization, user, client_with_email):
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4, reminders_disabled=True)

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_org_not_opted_in_skipped(self, mock_send, organization, user, client_with_email):
        organization.settings.auto_reminders_enabled = False
        organization.settings.save()
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4)

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_fully_paid_invoice_skipped(self, mock_send, organization, user, client_with_email):
        from apps.invoicing.models import Payment
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4)
        Payment.objects.create(
            invoice=invoice, created_by=user, amount=Decimal('100'),
            payment_date=timezone.localdate(),
        )

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_max_reminders_reached_stops(self, mock_send, organization, user, client_with_email):
        mock_send.return_value = {'success': True}
        invoice = _make_invoice(
            organization, user, client_with_email, due_days_ago=40,
            reminder_count=3,  # == reminder_max_count
        )

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 3  # inchangé
        mock_send.assert_not_called()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_failed_send_does_not_increment_count(self, mock_send, organization, user, client_with_email):
        mock_send.return_value = {'success': False, 'message': 'SMTP error'}
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4)

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0  # pas incrémenté sur échec
        assert InvoiceReminderLog.objects.filter(invoice=invoice, success=False).exists()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_no_client_email_logged_and_skipped(self, mock_send, organization, user):
        client_no_email = Client.objects.create(organization=organization, name="No Email", email="")
        invoice = _make_invoice(organization, user, client_no_email, due_days_ago=4)

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()
        assert InvoiceReminderLog.objects.filter(invoice=invoice, success=False).exists()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_dry_run_sends_nothing(self, mock_send, organization, user, client_with_email):
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4)

        call_command('send_invoice_reminders', '--dry-run')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_idempotent_within_48h(self, mock_send, organization, user, client_with_email):
        mock_send.return_value = {'success': True}
        invoice = _make_invoice(
            organization, user, client_with_email, due_days_ago=4,
            reminder_count=1, last_reminder_sent_at=timezone.now() - timedelta(hours=2),
            next_reminder_date=timezone.localdate() - timedelta(days=1),
        )

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 1  # inchangé (idempotence)
        mock_send.assert_not_called()

    def test_sent_invoice_past_due_becomes_overdue(self, organization, user, client_with_email):
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=1, status='sent')
        organization.settings.auto_reminders_enabled = False
        organization.settings.save()

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.status == 'overdue'

    @patch('apps.api.services.email_service.InvoiceEmailService.send_invoice_email')
    def test_quote_never_reminded(self, mock_send, organization, user, client_with_email):
        invoice = _make_invoice(organization, user, client_with_email, due_days_ago=4, status='quote')

        call_command('send_invoice_reminders')

        invoice.refresh_from_db()
        assert invoice.reminder_count == 0
        mock_send.assert_not_called()
