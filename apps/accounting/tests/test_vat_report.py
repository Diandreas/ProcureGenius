"""Tests de la déclaration de TVA (apps/accounting/vat_report.py, GET /api/v1/accounting/vat-report/).

Scénario allemand (septembre 2026) :
- facture A (envoyée) : 1000 € à 19 % + 200 € à 7 %, remise globale 10 %
    → bases 900 / 180, TVA 171,00 / 12,60
- facture B (payée)   : 333,33 € à 19 % → TVA 63,33
- facture C (envoyée, historique, taxe globale 95 € sur 500 €) → 19 %, base 500
- avoir partiel de 119 € TTC sur C → base 100, TVA 19
- facture annulée sans avoir, brouillon, facture d'octobre, facture d'une autre organisation : exclues
- BC reçu : 1000 € + 190 € de TVA ; BC brouillon exclu
- dépense : 107 € TTC dont 7 € de TVA
"""
from datetime import date, datetime, timezone as dt_tz
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Organization, CustomUser
from apps.core.models import OrganizationSettings
from apps.invoicing.models import Invoice, InvoiceItem, CreditNote
from apps.purchase_orders.models import PurchaseOrder
from apps.accounting.models import Expense
from apps.accounting.vat_report import build_vat_report, period_bounds, last_complete_period

URL = '/api/v1/accounting/vat-report/'
SEPT = datetime(2026, 9, 15, 10, 0, tzinfo=dt_tz.utc)
OCT = datetime(2026, 10, 5, 10, 0, tzinfo=dt_tz.utc)
D = Decimal


def make_org(name, country='DE', small_business=False, currency='EUR'):
    org = Organization.objects.create(name=name)
    OrganizationSettings.objects.update_or_create(organization=org, defaults=dict(
        country=country, default_currency=currency, default_tax_rate=D('19'),
        vat_exempt_small_business=small_business, vat_filing_period='monthly',
    ))
    user = CustomUser.objects.create_user(
        username=f"u_{name}".replace(' ', '_'), email=f"{name.replace(' ', '')}@test.com",
        password="testpass123", organization=org, role='admin',
    )
    return org, user


def make_invoice(org, user, lines, status='sent', tax=D('0'), discount_pct=D('0'), when=SEPT):
    """lines : [(quantité, prix unitaire, taux)]"""
    inv = Invoice.objects.create(
        organization=org, created_by=user, status='draft', subtotal=0, total_amount=0,
        tax_amount=tax, discount_type='percent', discount_value=discount_pct, currency='EUR',
    )
    for i, (qty, price, rate) in enumerate(lines):
        InvoiceItem.objects.create(invoice=inv, service_code=f'S{i}', description=f'L{i}',
                                   quantity=qty, unit_price=price, tax_rate=rate)
    inv.refresh_from_db()
    if status != 'draft':
        inv.status = status
        inv.save()
    Invoice.objects.filter(pk=inv.pk).update(created_at=when)
    inv.refresh_from_db()
    return inv


def make_po(user, subtotal, tax, status='received', when=SEPT):
    po = PurchaseOrder.objects.create(
        title='BC', created_by=user, status=status, subtotal=subtotal,
        tax_gst_hst=tax, total_amount=subtotal + tax,
    )
    PurchaseOrder.objects.filter(pk=po.pk).update(created_at=when)
    return po


def make_expense(org, amount, tax, day=date(2026, 9, 20)):
    return Expense.objects.create(organization=org, date=day, description='Bürobedarf',
                                  amount=amount, tax_amount=tax, currency='EUR')


@pytest.fixture
def german(db):
    org, user = make_org('Muster GmbH')
    a = make_invoice(org, user, [(10, D('100'), D('19')), (5, D('40'), D('7'))],
                     tax=D('183.60'), discount_pct=D('10'))
    make_invoice(org, user, [(1, D('333.33'), D('19'))], status='paid', tax=D('63.33'))
    c = make_invoice(org, user, [(2, D('250'), D('0'))], tax=D('95.00'))  # historique
    make_invoice(org, user, [(1, D('1000'), D('19'))], status='cancelled', tax=D('190'))
    make_invoice(org, user, [(1, D('1000'), D('19'))], status='draft', tax=D('190'))
    make_invoice(org, user, [(1, D('1000'), D('19'))], tax=D('190'), when=OCT)

    cn = c.issue_credit_note(amount=D('119.00'), user=user)
    CreditNote.objects.filter(pk=cn.pk).update(created_at=SEPT)

    make_po(user, D('1000'), D('190'))
    make_po(user, D('5000'), D('950'), status='draft')
    make_expense(org, D('107.00'), D('7.00'))
    make_expense(org, D('50.00'), D('9.50'), day=date(2026, 10, 2))  # hors période

    # Une autre organisation : rien ne doit fuiter
    other, other_user = make_org('Andere GmbH')
    make_invoice(other, other_user, [(1, D('9999'), D('19'))], tax=D('1899.81'))
    make_po(other_user, D('800'), D('152'))
    make_expense(other, D('119'), D('19'))
    return {'org': org, 'user': user, 'invoice_a': a, 'other': other, 'other_user': other_user}


def rows(lst):
    return {r['rate']: (r['base'], r['vat']) for r in lst}


@pytest.mark.django_db
class TestPeriods:
    def test_bounds(self):
        assert period_bounds('month', 2026, 2) == (date(2026, 2, 1), date(2026, 2, 28))
        assert period_bounds('quarter', 2026, 3) == (date(2026, 7, 1), date(2026, 9, 30))
        assert period_bounds('year', 2025) == (date(2025, 1, 1), date(2025, 12, 31))
        with pytest.raises(ValueError):
            period_bounds('month', 2026, 13)

    def test_last_complete(self):
        assert last_complete_period('month', date(2026, 10, 18)) == (2026, 9)
        assert last_complete_period('month', date(2026, 1, 3)) == (2025, 12)
        assert last_complete_period('quarter', date(2026, 10, 18)) == (2026, 3)
        assert last_complete_period('quarter', date(2026, 2, 1)) == (2025, 4)
        assert last_complete_period('yearly', date(2026, 10, 18)) == (2025, None)


@pytest.mark.django_db
class TestGermanReport:
    def test_sales_by_rate(self, german):
        r = build_vat_report(german['org'], date(2026, 9, 1), date(2026, 9, 30))
        assert r['country'] == 'DE' and r['currency'] == 'EUR'
        assert r['sales']['invoice_count'] == 3
        assert rows(r['sales']['by_rate']) == {
            D('19'): (D('1733.33'), D('329.33')),
            D('7'): (D('180.00'), D('12.60')),
        }
        assert r['sales']['base_total'] == D('1913.33')
        assert r['sales']['vat_total'] == D('341.93')

    def test_credit_notes(self, german):
        r = build_vat_report(german['org'], date(2026, 9, 1), date(2026, 9, 30))
        assert r['credit_notes']['count'] == 1
        assert r['credit_notes']['base'] == D('100.00')
        assert r['credit_notes']['vat'] == D('19.00')
        assert rows(r['net_sales']['by_rate'])[D('19')] == (D('1633.33'), D('310.33'))

    def test_purchases(self, german):
        r = build_vat_report(german['org'], date(2026, 9, 1), date(2026, 9, 30))
        p = r['purchases']
        assert p['po_vat'] == D('190.00') and p['po_count'] == 1
        assert p['expense_vat'] == D('7.00') and p['expense_count'] == 1
        assert p['vat_total'] == D('197.00')
        assert rows(p['by_rate']) == {D('19'): (D('1000.00'), D('190.00')), D('7'): (D('100.00'), D('7.00'))}

    def test_payable_and_ustva(self, german):
        r = build_vat_report(german['org'], date(2026, 9, 1), date(2026, 9, 30))
        # 341,93 − 19,00 − 197,00
        assert r['output_vat'] == D('322.93')
        assert r['payable'] == D('125.93')
        assert r['is_refund'] is False
        u = r['ustva']
        assert u['kz81'] == 1633            # 1633,33 → euros entiers, centimes abandonnés
        assert u['kz81_vat'] == D('310.33')
        assert u['kz86'] == 180
        assert u['kz86_vat'] == D('12.60')
        assert u['kz66'] == D('197.00')
        assert u['kz83'] == D('125.93')
        assert u['deadline'] == date(2026, 10, 12)          # le 10/10/2026 est un samedi
        assert u['deadline_extended'] == date(2026, 11, 10)  # Dauerfristverlängerung

    def test_refund_when_input_exceeds_output(self, german):
        make_po(german['user'], D('10000'), D('1900'))
        r = build_vat_report(german['org'], date(2026, 9, 1), date(2026, 9, 30))
        assert r['payable'] == D('125.93') - D('1900')
        assert r['is_refund'] is True
        assert r['ustva']['kz83'] == r['payable']

    def test_quarter_includes_october_excluded(self, german):
        q3 = build_vat_report(german['org'], *period_bounds('quarter', 2026, 3))
        assert q3['sales']['invoice_count'] == 3
        q4 = build_vat_report(german['org'], *period_bounds('quarter', 2026, 4))
        assert q4['sales']['invoice_count'] == 1
        assert q4['purchases']['expense_vat'] == D('9.50')

    def test_isolation(self, german):
        r = build_vat_report(german['other'], date(2026, 9, 1), date(2026, 9, 30))
        assert r['sales']['invoice_count'] == 1
        assert r['sales']['vat_total'] == D('1899.81')
        assert r['credit_notes']['count'] == 0
        assert r['purchases']['po_vat'] == D('152.00')
        assert r['purchases']['expense_vat'] == D('19.00')


@pytest.mark.django_db
class TestFullCreditNote:
    def test_cancelled_by_credit_note_nets_to_zero(self, db):
        org, user = make_org('Storno GmbH')
        inv = make_invoice(org, user, [(1, D('100'), D('19'))], tax=D('19'))
        cn = inv.issue_credit_note(user=user)   # avoir total → facture annulée
        CreditNote.objects.filter(pk=cn.pk).update(created_at=SEPT)
        inv.refresh_from_db()
        assert inv.status == 'cancelled'
        r = build_vat_report(org, date(2026, 9, 1), date(2026, 9, 30))
        assert r['sales']['vat_total'] == D('19.00')
        assert r['credit_notes']['vat'] == D('19.00')
        assert r['credit_notes']['base'] == D('100.00')
        assert r['payable'] == D('0.00')


@pytest.mark.django_db
class TestSmallBusiness:
    def test_kleinunternehmer(self, db):
        org, user = make_org('Klein', small_business=True)
        make_invoice(org, user, [(1, D('1000'), D('0'))])
        make_expense(org, D('119'), D('19'))
        r = build_vat_report(org, date(2026, 9, 1), date(2026, 9, 30))
        assert r['small_business'] is True
        assert r['small_business_reason'] == 'kleinunternehmer'
        assert r['sales']['base_total'] == D('1000.00')
        assert r['sales']['vat_total'] == D('0')
        assert r['purchases']['vat_total'] == D('19.00')
        assert r['purchases']['deductible'] is False
        assert r['input_vat'] == D('0')
        assert r['payable'] == D('0')
        assert r['ustva'] is None


@pytest.mark.django_db
class TestOtherCountry:
    def test_france_no_ustva(self, db):
        org, user = make_org('SARL Test', country='FR')
        make_invoice(org, user, [(1, D('100'), D('20')), (1, D('100'), D('5.5'))], tax=D('25.50'))
        r = build_vat_report(org, date(2026, 9, 1), date(2026, 9, 30))
        assert rows(r['sales']['by_rate']) == {D('20'): (D('100.00'), D('20.00')),
                                              D('5.5'): (D('100.00'), D('5.50'))}
        assert r['payable'] == D('25.50')
        assert r['ustva'] is None

    def test_france_ca3_lines(self, db):
        org, user = make_org('SARL CA3', country='FR')
        make_invoice(org, user, [(1, D('1000.40'), D('20')), (2, D('100'), D('10')), (1, D('300'), D('5.5')),
                                 (1, D('50'), D('0'))], tax=D('236.58'))
        make_po(user, D('500'), D('100'))
        make_expense(org, D('60.00'), D('10.00'))
        r = build_vat_report(org, date(2026, 9, 1), date(2026, 9, 30))
        c = r['ca3']
        assert c['lines']['08'] == {'base': 1000, 'vat': 200}      # 1000,40 € / 200,08 € arrondis à l'euro
        assert c['lines']['9B'] == {'base': 200, 'vat': 20}
        assert c['lines']['09'] == {'base': 300, 'vat': 17}        # 16,50 € -> 17 €
        assert c['a1'] == 1500 and c['e2'] == 50
        assert c['l16'] == 237 and c['l20'] == 110 and c['l23'] == 110
        assert c['l28'] == 127 and c['l25'] == 0
        assert c['deadline_from'] == date(2026, 10, 15) and c['deadline_to'] == date(2026, 10, 24)
        # une année = régime simplifié (CA12) : pas de lignes CA3
        assert build_vat_report(org, date(2026, 1, 1), date(2026, 12, 31))['ca3'] is None

    def test_france_ca3_credit(self, db):
        org, user = make_org('SARL Credit', country='FR')
        make_invoice(org, user, [(1, D('100'), D('20'))], tax=D('20'))
        make_po(user, D('1000'), D('200'))
        c = build_vat_report(org, date(2026, 9, 1), date(2026, 9, 30))['ca3']
        assert c['l28'] == 0 and c['l25'] == 180

    def test_foreign_currency_excluded_and_flagged(self, db):
        org, user = make_org('Douala SA', country='CM', currency='XAF')
        inv = make_invoice(org, user, [(1, D('1000'), D('19.25'))], tax=D('192.50'))
        Invoice.objects.filter(pk=inv.pk).update(currency='EUR')
        r = build_vat_report(org, date(2026, 9, 1), date(2026, 9, 30))
        assert r['sales']['invoice_count'] == 0
        assert {'code': 'foreign_currency_invoices', 'count': 1} in r['warnings']


@pytest.mark.django_db
class TestEndpoint:
    def _client(self, user):
        c = APIClient()
        c.force_authenticate(user=user)
        return c

    def test_json(self, german):
        res = self._client(german['user']).get(URL, {'period': 'month', 'year': 2026, 'index': 9})
        assert res.status_code == 200
        data = res.json()
        assert data['period'] == {'start': '2026-09-01', 'end': '2026-09-30', 'kind': 'month',
                                  'year': 2026, 'index': 9, 'filing_period': 'monthly'}
        assert data['payable'] == '125.93'
        assert data['sales']['by_rate'][0] == {'rate': 19.0, 'base': '1733.33', 'vat': '329.33'}
        assert data['ustva']['kz81'] == 1633
        assert data['ustva']['kz83'] == '125.93'
        assert data['ustva']['deadline'] == '2026-10-12'

    def test_default_period_uses_filing_frequency(self, german):
        st = german['org'].settings
        st.vat_filing_period = 'quarterly'
        st.save()
        res = self._client(german['user']).get(URL)
        assert res.status_code == 200
        assert res.json()['period']['kind'] == 'quarter'

    def test_invalid_params(self, german):
        c = self._client(german['user'])
        assert c.get(URL, {'period': 'week'}).status_code == 400
        assert c.get(URL, {'period': 'month', 'year': 2026, 'index': 13}).status_code == 400

    def test_csv_german(self, german):
        res = self._client(german['user']).get(URL, {'period': 'month', 'year': 2026, 'index': 9,
                                                     'format': 'csv', 'lang': 'de'})
        assert res.status_code == 200
        assert res['Content-Type'].startswith('text/csv')
        assert 'umsatzsteuer-voranmeldung_2026-09.csv' in res['Content-Disposition']
        body = res.content.decode('utf-8')
        assert body.startswith('﻿')
        assert 'Summen;Zahllast;;;125,93' in body
        assert 'UStVA;Kz 81;19;1633;310,33' in body

    def test_csv_english_decimal_point(self, german):
        res = self._client(german['user']).get(URL, {'period': 'month', 'year': 2026, 'index': 9,
                                                     'format': 'csv', 'lang': 'en'})
        assert 'Totals;VAT payable;;;125.93' in res.content.decode('utf-8')

    def test_scoped_to_user_org(self, german):
        res = self._client(german['other_user']).get(URL, {'period': 'month', 'year': 2026, 'index': 9})
        assert res.json()['sales']['invoice_count'] == 1
        assert res.json()['sales']['vat_total'] == '1899.81'

    def test_requires_auth(self, db):
        assert APIClient().get(URL).status_code in (401, 403)
