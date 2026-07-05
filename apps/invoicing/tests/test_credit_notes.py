"""Tests des avoirs (notes de crédit) — Invoice.issue_credit_note()."""
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import Organization, Client, CustomUser
from apps.invoicing.models import Invoice, CreditNote


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org CreditNotes")


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="cnuser", email="cn@example.com",
        password="testpass123", organization=organization,
    )


@pytest.fixture
def client_obj(organization):
    return Client.objects.create(organization=organization, name="Client CN", email="client@cn.com")


def _make_invoice(organization, user, client, status='sent', total=Decimal('100')):
    return Invoice.objects.create(
        organization=organization, created_by=user, client=client,
        status=status, subtotal=total, total_amount=total,
        due_date=timezone.localdate(),
    )


@pytest.mark.django_db
class TestIssueCreditNote:
    def test_full_credit_cancels_invoice(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)

        cn = invoice.issue_credit_note(reason="Retour marchandise", user=user)

        invoice.refresh_from_db()
        assert invoice.status == 'cancelled'
        assert cn.amount == Decimal('100')
        assert cn.credit_note_number.startswith(f"AV-{timezone.now().year}-")
        assert cn.reason == "Retour marchandise"

    def test_partial_credit_keeps_invoice_active(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)

        cn = invoice.issue_credit_note(amount=Decimal('30'), user=user)

        invoice.refresh_from_db()
        assert invoice.status == 'sent'  # inchangé
        assert cn.amount == Decimal('30')
        assert invoice.total_credited() == Decimal('30')

    def test_multiple_partial_credits_sum_to_full_cancels_on_last(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)

        invoice.issue_credit_note(amount=Decimal('60'), user=user)
        invoice.refresh_from_db()
        assert invoice.status == 'sent'

        invoice.issue_credit_note(amount=Decimal('40'), user=user)
        invoice.refresh_from_db()
        assert invoice.status == 'cancelled'
        assert invoice.total_credited() == Decimal('100')

    def test_default_amount_is_remaining_creditable(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)
        invoice.issue_credit_note(amount=Decimal('20'), user=user)

        cn2 = invoice.issue_credit_note(user=user)  # pas de montant -> solde restant

        assert cn2.amount == Decimal('80')

    def test_over_crediting_rejected(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)
        invoice.issue_credit_note(amount=Decimal('70'), user=user)

        with pytest.raises(ValueError, match="dépasse"):
            invoice.issue_credit_note(amount=Decimal('50'), user=user)

    def test_negative_or_zero_amount_rejected(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)
        with pytest.raises(ValueError, match="positif"):
            invoice.issue_credit_note(amount=Decimal('0'), user=user)

    @pytest.mark.parametrize('status', ['draft', 'quote', 'cancelled'])
    def test_ineligible_statuses_rejected(self, organization, user, client_obj, status):
        invoice = _make_invoice(organization, user, client_obj, status=status)
        with pytest.raises(ValueError, match="Seule une facture"):
            invoice.issue_credit_note(user=user)

    def test_paid_invoice_can_be_credited(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj, status='paid')
        cn = invoice.issue_credit_note(user=user)
        invoice.refresh_from_db()
        assert invoice.status == 'cancelled'
        assert cn.amount == Decimal('100')

    def test_credit_note_numbering_sequential_per_organization(self, organization, user, client_obj):
        inv1 = _make_invoice(organization, user, client_obj, total=Decimal('50'))
        inv2 = _make_invoice(organization, user, client_obj, total=Decimal('50'))

        cn1 = inv1.issue_credit_note(amount=Decimal('10'), user=user)
        cn2 = inv2.issue_credit_note(amount=Decimal('10'), user=user)

        num1 = int(cn1.credit_note_number.rsplit('-', 1)[1])
        num2 = int(cn2.credit_note_number.rsplit('-', 1)[1])
        assert num2 == num1 + 1

    def test_numbering_isolated_per_organization(self, organization, user, client_obj):
        org_b = Organization.objects.create(name="Org B CN")
        user_b = CustomUser.objects.create_user(
            username="cnuserb", email="cnb@example.com", password="x", organization=org_b,
        )
        client_b = Client.objects.create(organization=org_b, name="Client B", email="b@cn.com")

        inv_a = _make_invoice(organization, user, client_obj, total=Decimal('50'))
        inv_b = _make_invoice(org_b, user_b, client_b, total=Decimal('50'))

        cn_a = inv_a.issue_credit_note(amount=Decimal('10'), user=user)
        cn_b = inv_b.issue_credit_note(amount=Decimal('10'), user=user_b)

        # Chaque organisation démarre sa propre séquence à 0001.
        assert cn_a.credit_note_number.endswith('-0001')
        assert cn_b.credit_note_number.endswith('-0001')

    def test_total_credited_excludes_cancelled_credit_notes(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)
        cn = invoice.issue_credit_note(amount=Decimal('30'), user=user)
        cn.status = 'cancelled'
        cn.save()

        assert invoice.total_credited() == Decimal('0')
        # Le solde redevient donc entièrement disponible.
        cn2 = invoice.issue_credit_note(user=user)
        assert cn2.amount == Decimal('100')
