"""Tests de l'impact comptable des avoirs (create_credit_note_entry)."""
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import Organization, Client, CustomUser
from apps.accounting.models import Account, JournalEntry
from apps.invoicing.models import Invoice


@pytest.fixture
def organization(db):
    # Un plan comptable par défaut (dont 4100/7500) est déjà créé
    # automatiquement par le signal on_organization_created.
    org = Organization.objects.create(name="Org CN Accounting")
    Account.objects.get_or_create(
        organization=org, code='4100', defaults={'name': 'Clients', 'account_type': 'asset'},
    )
    Account.objects.get_or_create(
        organization=org, code='7500', defaults={'name': 'Ventes', 'account_type': 'revenue'},
    )
    return org


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="cnaccuser", email="cnacc@example.com",
        password="testpass123", organization=organization,
    )


@pytest.fixture
def client_obj(organization):
    return Client.objects.create(organization=organization, name="Client CN Acc", email="c@cnacc.com")


@pytest.mark.django_db
class TestCreditNoteAccounting:
    def test_partial_credit_creates_reversing_entry(self, organization, user, client_obj):
        invoice = Invoice.objects.create(
            organization=organization, created_by=user, client=client_obj,
            status='sent', subtotal=Decimal('100'), total_amount=Decimal('100'),
            due_date=timezone.localdate(),
        )
        # L'écriture de vente initiale a été créée automatiquement (signal on_invoice_save).
        assert JournalEntry.objects.filter(source_invoice=invoice, source='invoice').exists()

        credit_note = invoice.issue_credit_note(amount=Decimal('30'), user=user)

        entry = JournalEntry.objects.get(reference=credit_note.credit_note_number, source='credit_note')
        assert entry.total_debit == Decimal('30')   # débit produit (réduit le CA)
        assert entry.total_credit == Decimal('30')  # crédit client (réduit la créance)

        # L'écriture de vente d'origine N'EST PAS touchée (avoir partiel).
        original = JournalEntry.objects.get(source_invoice=invoice, source='invoice')
        assert original.total_debit == Decimal('100')

    def test_full_credit_reverses_original_entry_not_new_credit_note_entry(self, organization, user, client_obj):
        invoice = Invoice.objects.create(
            organization=organization, created_by=user, client=client_obj,
            status='sent', subtotal=Decimal('100'), total_amount=Decimal('100'),
            due_date=timezone.localdate(),
        )
        invoice.issue_credit_note(amount=Decimal('100'), user=user)

        # Avoir total -> le chemin EXISTANT (invoice_reversal via cancelled) est utilisé,
        # pas de nouvelle écriture 'credit_note'.
        assert JournalEntry.objects.filter(source_invoice=invoice, source='invoice_reversal').exists()
        assert not JournalEntry.objects.filter(source='credit_note').exists()
