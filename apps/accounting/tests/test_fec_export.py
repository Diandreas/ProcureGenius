"""Tests de l'export FEC (GET /api/v1/accounting/exports/fec/).

Couvre : gating par plan (advanced_exports = Business/Enterprise), format des
lignes (18 colonnes, dates AAAAMMJJ, virgule décimale), périmètre (écritures
validées de la période uniquement).
"""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Organization, CustomUser
from apps.subscriptions.models import Subscription, SubscriptionPlan
from apps.accounting.models import Account, AccountingJournal, JournalEntry, JournalEntryLine

FEC_URL = '/api/v1/accounting/exports/fec/'


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Org FEC")


@pytest.fixture
def user(organization):
    return CustomUser.objects.create_user(
        username="fecuser", email="fec@test.com", password="testpass123",
        organization=organization, role='admin',
    )


@pytest.fixture
def client_api(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def make_subscription(organization, plan_code):
    plan = SubscriptionPlan.objects.create(
        code=plan_code, name=plan_code.title(), description=plan_code, price_monthly=99,
    )
    now = timezone.now()
    return Subscription.objects.create(
        organization=organization, plan=plan, status='active',
        billing_period='monthly',
        current_period_start=now, current_period_end=now + timedelta(days=30),
    )


@pytest.fixture
def posted_entry(organization):
    journal = AccountingJournal.objects.create(
        organization=organization, code='VT', name='Journal des Ventes', journal_type='sales',
    )
    debit_acc = Account.objects.create(
        organization=organization, code='411000', name='Clients', account_type='asset',
    )
    credit_acc = Account.objects.create(
        organization=organization, code='707000', name='Ventes de marchandises', account_type='revenue',
    )
    entry = JournalEntry.objects.create(
        organization=organization, journal=journal,
        entry_number='VT-2026-00001', date=date(2026, 3, 15),
        description='Facture F-001', reference='F-001', status='posted', source='invoice',
    )
    JournalEntryLine.objects.create(entry=entry, account=debit_acc, debit=Decimal('1200.50'))
    JournalEntryLine.objects.create(entry=entry, account=credit_acc, credit=Decimal('1200.50'))
    return entry


@pytest.mark.django_db
class TestFECExportGating:
    def test_free_plan_forbidden(self, client_api, organization):
        make_subscription(organization, 'free')
        res = client_api.get(FEC_URL)
        assert res.status_code == 403
        assert res.json()['feature'] == 'advanced_exports'

    def test_pro_plan_forbidden(self, client_api, organization):
        make_subscription(organization, 'pro')
        assert client_api.get(FEC_URL).status_code == 403

    def test_no_subscription_forbidden(self, client_api):
        assert client_api.get(FEC_URL).status_code == 403

    def test_business_plan_allowed(self, client_api, organization):
        make_subscription(organization, 'business')
        res = client_api.get(FEC_URL)
        assert res.status_code == 200
        assert 'attachment' in res['Content-Disposition']

    def test_anonymous_unauthorized(self, db):
        assert APIClient().get(FEC_URL).status_code in (401, 403)


@pytest.mark.django_db
class TestFECExportContent:
    def test_format_and_content(self, client_api, organization, posted_entry):
        make_subscription(organization, 'business')
        res = client_api.get(FEC_URL, {'start': '2026-01-01', 'end': '2026-12-31'})
        assert res.status_code == 200

        body = res.content.decode('iso-8859-15')
        lines = [l for l in body.split('\r\n') if l]
        # En-tête + 2 lignes d'écriture
        assert len(lines) == 3
        header = lines[0].split('\t')
        assert header[0] == 'JournalCode'
        assert len(header) == 18

        debit_row = lines[1].split('\t')
        assert len(debit_row) == 18
        assert debit_row[0] == 'VT'
        assert debit_row[2] == 'VT-2026-00001'
        assert debit_row[3] == '20260315'          # EcritureDate AAAAMMJJ
        assert debit_row[4] == '411000'
        assert debit_row[8] == 'F-001'             # PieceRef
        assert debit_row[11] == '1200,50'          # Debit, virgule décimale
        assert debit_row[12] == '0,00'

        credit_row = lines[2].split('\t')
        assert credit_row[4] == '707000'
        assert credit_row[11] == '0,00'
        assert credit_row[12] == '1200,50'

        # Nom de fichier légal : <id fiscal>FEC<AAAAMMJJ>.txt
        assert 'FEC20261231.txt' in res['Content-Disposition']

    def test_excludes_draft_and_out_of_period(self, client_api, organization, posted_entry):
        make_subscription(organization, 'business')
        # Brouillon dans la période : exclu
        draft = JournalEntry.objects.create(
            organization=organization, journal=posted_entry.journal,
            entry_number='VT-2026-00002', date=date(2026, 3, 20),
            description='Brouillon', status='draft',
        )
        JournalEntryLine.objects.create(
            entry=draft, account=posted_entry.lines.first().account, debit=Decimal('10'),
        )
        res = client_api.get(FEC_URL, {'start': '2026-04-01', 'end': '2026-12-31'})
        body = res.content.decode('iso-8859-15')
        lines = [l for l in body.split('\r\n') if l]
        assert len(lines) == 1  # en-tête seul : l'écriture validée est hors période

    def test_invalid_dates_400(self, client_api, organization):
        make_subscription(organization, 'business')
        assert client_api.get(FEC_URL, {'start': 'oops'}).status_code == 400
        assert client_api.get(FEC_URL, {'start': '2026-12-31', 'end': '2026-01-01'}).status_code == 400
