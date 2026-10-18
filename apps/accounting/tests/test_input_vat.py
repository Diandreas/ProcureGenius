"""TVA sur les achats (Vorsteuer) : dépenses et bons de commande reçus.

- TVA récupérable au débit (SKR03 1576 à 19 %, 1571 à 7 %) pour une entreprise assujettie ;
- petite entreprise exonérée (Kleinunternehmerregelung § 19 UStG, franchise en base) :
  pas de TVA déductible, toute la dépense (TTC) va en charge ;
- API des bons de commande : TVA enregistrée dans tax_gst_hst, total et tax_amount renvoyés.
"""
from decimal import Decimal

import pytest
from django.template.loader import render_to_string
from django.utils import translation
from rest_framework.test import APIClient

from apps.accounts.models import Organization, CustomUser
from apps.core.models import OrganizationSettings
from apps.core.modules import Modules
from apps.accounting.charts import apply_switch
from apps.accounting.expenses import create_expense, deductible_vat_account
from apps.accounting.models import JournalEntry
from apps.accounting.signals import create_purchase_order_entry
from apps.purchase_orders.models import PurchaseOrder

D = Decimal


def make_org(name, small_business=False, standard='skr03'):
    org = Organization.objects.create(name=name)
    OrganizationSettings.objects.update_or_create(organization=org, defaults=dict(
        country='DE', default_currency='EUR', default_tax_rate=D('19'),
        vat_exempt_small_business=small_business, tax_region='eu',
    ))
    org.refresh_from_db()
    apply_switch(org, standard)
    org.refresh_from_db()
    user = CustomUser.objects.create_user(
        username=f"u_{name}".replace(' ', '_'), email=f"{name.replace(' ', '')}@test.com",
        password="testpass123", organization=org, role='admin',
    )
    return org, user


def lines_of(entry):
    return sorted((l.account.code, l.debit, l.credit) for l in entry.lines.select_related('account'))


@pytest.fixture
def gmbh(db):
    return make_org('Muster GmbH')


@pytest.fixture
def kleinunternehmer(db):
    return make_org('Klein Einzelunternehmen', small_business=True)


# ------------------------------------------------------------------ dépenses

def test_expense_vat_19_is_deductible(gmbh):
    org, user = gmbh
    exp, err = create_expense(org, user, amount='119', tax_amount='19', description='Bürobedarf',
                              category='exp_office', payment_method='bank_transfer')
    assert err is None
    assert lines_of(exp.journal_entry) == sorted([
        ('4930', D('100.00'), D('0.00')),   # Bürobedarf netto
        ('1576', D('19.00'), D('0.00')),    # Vorsteuer 19 %
        ('1200', D('0.00'), D('119.00')),   # Bank
    ])


def test_expense_vat_7_goes_to_reduced_input_vat_account(gmbh):
    org, user = gmbh
    exp, err = create_expense(org, user, amount='107', tax_amount='7', description='Fachbücher',
                              category='exp_office', payment_method='cash')
    assert err is None
    assert lines_of(exp.journal_entry) == sorted([
        ('4930', D('100.00'), D('0.00')),
        ('1571', D('7.00'), D('0.00')),     # Vorsteuer 7 %
        ('1000', D('0.00'), D('107.00')),   # Kasse
    ])


def test_small_business_expense_books_gross_amount(kleinunternehmer):
    org, user = kleinunternehmer
    exp, err = create_expense(org, user, amount='119', tax_amount='19', description='Bürobedarf',
                              category='exp_office', payment_method='cash')
    assert err is None
    lines = lines_of(exp.journal_entry)
    assert lines == sorted([('4930', D('119.00'), D('0.00')), ('1000', D('0.00'), D('119.00'))])
    assert not any(code in ('1576', '1571') for code, _, _ in lines)


def test_deductible_vat_account_without_vat(gmbh):
    org, _ = gmbh
    assert deductible_vat_account(org, D('100'), D('0')) is None
    assert deductible_vat_account(org, D('100'), D('100')) is None


# ------------------------------------------------------------------ bons de commande reçus

def make_po(user, subtotal, tax, shipping=D('0')):
    return PurchaseOrder.objects.create(
        title='BC', created_by=user, status='draft', subtotal=subtotal, tax_gst_hst=tax,
        shipping_cost=shipping, total_amount=subtotal + tax + shipping,
    )


def test_purchase_order_entry_with_input_vat(gmbh):
    org, user = gmbh
    po = make_po(user, D('1000'), D('190'))
    entry = create_purchase_order_entry(po)
    assert lines_of(entry) == sorted([
        ('3400', D('1000.00'), D('0.00')),  # Wareneingang 19 %
        ('1576', D('190.00'), D('0.00')),
        ('1600', D('0.00'), D('1190.00')),  # Verbindlichkeiten aLuL
    ])


def test_purchase_order_entry_reduced_rate_with_shipping(gmbh):
    org, user = gmbh
    po = make_po(user, D('1000'), D('70'), shipping=D('50'))
    entry = create_purchase_order_entry(po)
    codes = {code for code, _, _ in lines_of(entry)}
    assert '1571' in codes and '1576' not in codes


def test_small_business_purchase_order_entry_has_no_input_vat(kleinunternehmer):
    org, user = kleinunternehmer
    po = make_po(user, D('1000'), D('190'))
    entry = create_purchase_order_entry(po)
    assert lines_of(entry) == sorted([('3400', D('1190.00'), D('0.00')), ('1600', D('0.00'), D('1190.00'))])


def test_received_purchase_order_signal_books_entry(gmbh):
    org, user = gmbh
    po = make_po(user, D('200'), D('38'))
    po.status = 'received'
    po.save()
    entry = JournalEntry.objects.get(organization=org, source='purchase_order', reference=po.po_number)
    assert ('1576', D('38.00'), D('0.00')) in lines_of(entry)


# ------------------------------------------------------------------ API des bons de commande

def test_purchase_order_api_stores_vat_in_gst_field(gmbh):
    org, user = gmbh
    org.enabled_modules = [Modules.SUPPLIERS, Modules.PURCHASE_ORDERS]
    org.save(update_fields=['enabled_modules'])
    client = APIClient()
    client.force_authenticate(user)
    payload = {
        'title': 'Büromaterial', 'status': 'draft',
        'tax_gst_hst': '19.00', 'tax_qst': '0.00',
        'items': [{'description': 'Papier', 'quantity': 2, 'unit_price': '50.00'}],
    }
    r = client.post('/api/v1/purchase-orders/', payload, format='json')
    assert r.status_code == 201, r.data
    po = PurchaseOrder.objects.get(pk=r.data['id'])
    assert po.subtotal == D('100.00')
    assert po.tax_gst_hst == D('19.00') and po.tax_qst == D('0.00')
    assert po.total_amount == D('119.00')

    r = client.get(f'/api/v1/purchase-orders/{po.pk}/')
    assert r.status_code == 200
    assert D(str(r.data['tax_amount'])) == D('19.00')


# ------------------------------------------------------------------ PDF du bon de commande

@pytest.mark.parametrize('lang,expected', [('de', 'USt.'), ('fr', 'TVA'), ('en', 'VAT')])
def test_po_pdf_vat_label_outside_canada(gmbh, lang, expected):
    org, user = gmbh
    po = make_po(user, D('100'), D('19'))
    with translation.override(lang):
        html = render_to_string('purchase_orders/pdf_templates/po_classic.html', {
            'po': po, 'organization': {'tax_region': 'eu', 'currency': 'EUR'}, 'items': [],
        })
    assert f'<span>{expected}:</span>' in html
    assert '<span>GST/HST:</span>' not in html


def test_po_pdf_keeps_gst_label_in_canada(gmbh):
    org, user = gmbh
    po = make_po(user, D('100'), D('5'))
    with translation.override('en'):
        html = render_to_string('purchase_orders/pdf_templates/po_classic.html', {
            'po': po, 'organization': {'tax_region': 'canada', 'currency': 'CAD'}, 'items': [],
        })
    assert '<span>GST/HST:</span>' in html
