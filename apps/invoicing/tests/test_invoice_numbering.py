"""Tests de la numérotation légale des factures (Invoice.generate_invoice_number).

Vérifie : séquence continue SANS rupture par organisation, PAS de remise à
zéro mensuelle, isolation entre organisations, conversion devis->facture
qui obtient un numéro FAC conforme neuf.
"""
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import Organization, Client, CustomUser
from apps.invoicing.models import Invoice


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org Numbering")


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="numuser", email="num@example.com",
        password="testpass123", organization=organization,
    )


@pytest.fixture
def client_obj(organization):
    return Client.objects.create(organization=organization, name="Client Num", email="c@num.com")


def _make_invoice(organization, user, client, status='draft', due_date=None):
    return Invoice.objects.create(
        organization=organization, created_by=user, client=client,
        status=status, subtotal=Decimal('10'), total_amount=Decimal('10'),
        due_date=due_date or timezone.localdate(),
    )


@pytest.mark.django_db
class TestInvoiceNumbering:
    def test_new_format_per_organization_year(self, organization, user, client_obj):
        invoice = _make_invoice(organization, user, client_obj)
        year = timezone.now().year
        assert invoice.invoice_number == f"FAC-{year}-00001"

    def test_sequential_continuous_within_organization(self, organization, user, client_obj):
        inv1 = _make_invoice(organization, user, client_obj)
        inv2 = _make_invoice(organization, user, client_obj)
        inv3 = _make_invoice(organization, user, client_obj)

        n1 = int(inv1.invoice_number.rsplit('-', 1)[1])
        n2 = int(inv2.invoice_number.rsplit('-', 1)[1])
        n3 = int(inv3.invoice_number.rsplit('-', 1)[1])
        assert [n2, n3] == [n1 + 1, n1 + 2]

    def test_no_monthly_reset(self, organization, user, client_obj):
        """Le préfixe ne contient plus le mois (contrairement à l'ancien
        schéma FAC{année}{mois}...) : la séquence ne peut donc plus être
        remise à zéro chaque mois."""
        inv1 = _make_invoice(organization, user, client_obj)
        inv2 = _make_invoice(organization, user, client_obj)
        prefix1 = inv1.invoice_number.rsplit('-', 1)[0]
        prefix2 = inv2.invoice_number.rsplit('-', 1)[0]
        assert prefix1 == prefix2  # même préfixe {FAC}-{année}- (pas de mois)

    def test_isolated_sequence_per_organization(self, organization, user, client_obj):
        org_b = Organization.objects.create(name="Org Numbering B")
        user_b = CustomUser.objects.create_user(
            username="numuserb", email="numb@example.com", password="x", organization=org_b,
        )
        client_b = Client.objects.create(organization=org_b, name="Client B", email="b@num.com")

        inv_a = _make_invoice(organization, user, client_obj)
        inv_b = _make_invoice(org_b, user_b, client_b)

        # Chaque organisation démarre sa propre séquence à 00001.
        assert inv_a.invoice_number.endswith('-00001')
        assert inv_b.invoice_number.endswith('-00001')

    def test_quote_uses_dev_prefix_same_scoping(self, organization, user, client_obj):
        quote = _make_invoice(organization, user, client_obj, status='quote')
        year = timezone.now().year
        assert quote.invoice_number == f"DEV-{year}-00001"

    def test_quote_conversion_gets_fresh_compliant_fac_number(self, organization, user, client_obj):
        # Une facture FAC existe déjà (numéro FAC-...-00001 pris).
        _make_invoice(organization, user, client_obj, status='draft')

        quote = _make_invoice(organization, user, client_obj, status='quote')
        assert quote.invoice_number.startswith('DEV-')

        quote.convert_quote_to_draft()
        quote.refresh_from_db()
        # Le devis converti obtient un numero FAC neuf, distinct de son
        # ancien numero DEV, et suit la sequence FAC de l'organisation
        # (00002, puisque le brouillon initial a deja pris 00001).
        assert quote.invoice_number.startswith('FAC-')
        assert quote.invoice_number.endswith('-00002')

    def test_existing_historical_numbers_untouched(self, organization, user, client_obj):
        """Un numéro déjà attribué (ancien format global) n'est jamais
        régénéré : un numéro de facture émis est immuable."""
        invoice = _make_invoice(organization, user, client_obj)
        old_style_number = "FAC202601999"
        invoice.invoice_number = old_style_number
        invoice.save()

        invoice.refresh_from_db()
        assert invoice.invoice_number == old_style_number  # inchangé, pas régénéré

    def test_organization_auto_populated_from_created_by_when_no_client(self, organization, user):
        """Sans client (ou client sans organisation), l'organisation est
        renseignée depuis created_by — corrige un vrai cas trouvé en prod
        (134/147 factures historiques avec organization=NULL)."""
        invoice = Invoice.objects.create(
            created_by=user, client=None, status='draft',
            subtotal=Decimal('10'), total_amount=Decimal('10'),
            due_date=timezone.localdate(),
        )
        invoice.refresh_from_db()
        assert invoice.organization_id == organization.id
        assert invoice.invoice_number.startswith('FAC-')  # nouveau schéma, pas le repli

    def test_no_organization_falls_back_to_old_global_scheme_without_crashing(self, user):
        """Filet de sécurité : si l'organisation est indéterminable (ne
        devrait plus arriver en pratique), la génération ne plante pas."""
        invoice = Invoice(
            created_by=None, status='draft',
            subtotal=Decimal('10'), total_amount=Decimal('10'),
            due_date=timezone.localdate(),
        )
        number = invoice.generate_invoice_number()
        assert number.startswith('FAC')
        assert '-' not in number  # ancien format sans tirets
