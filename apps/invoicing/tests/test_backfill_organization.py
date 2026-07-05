"""Tests de backfill_invoice_organization (rattrapage des factures orphelines)."""
from decimal import Decimal

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import Organization, Client, CustomUser
from apps.invoicing.models import Invoice


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org Backfill")


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="backfilluser", email="bf@example.com",
        password="testpass123", organization=organization,
    )


@pytest.fixture
def client_with_org(organization):
    return Client.objects.create(organization=organization, name="Client BF", email="c@bf.com")


def _orphan_invoice(user, client=None):
    """Facture avec organization=NULL, en contournant l'auto-populate de save()."""
    invoice = Invoice(
        created_by=user, client=client, status='draft',
        subtotal=Decimal('10'), total_amount=Decimal('10'),
        due_date=timezone.localdate(),
    )
    invoice.invoice_number = "FAC-ORPHAN-TEST"  # évite generate_invoice_number()
    Invoice.objects.bulk_create([invoice])  # bulk_create contourne save()
    return Invoice.objects.get(pk=invoice.pk)


@pytest.mark.django_db
class TestBackfillInvoiceOrganization:
    def test_backfill_via_client(self, organization, user, client_with_org):
        invoice = _orphan_invoice(user, client=client_with_org)
        assert invoice.organization_id is None

        call_command('backfill_invoice_organization')

        invoice.refresh_from_db()
        assert invoice.organization_id == organization.id

    def test_backfill_via_created_by_when_no_client(self, organization, user):
        invoice = _orphan_invoice(user, client=None)
        assert invoice.organization_id is None

        call_command('backfill_invoice_organization')

        invoice.refresh_from_db()
        assert invoice.organization_id == organization.id

    def test_dry_run_does_not_modify(self, organization, user):
        invoice = _orphan_invoice(user, client=None)

        call_command('backfill_invoice_organization', '--dry-run')

        invoice.refresh_from_db()
        assert invoice.organization_id is None
