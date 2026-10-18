"""TVA par ligne de facture (Allemagne : 19 % et 7 % sur la même facture), factures historiques
à taux global et petites entreprises exonérées (Kleinunternehmer § 19 UStG, franchise en base)."""
from decimal import Decimal

import pytest
from django.template.loader import render_to_string
from rest_framework.test import APIClient

from apps.accounts.models import Organization, CustomUser, Client
from apps.core.models import OrganizationSettings
from apps.invoicing.models import Invoice, InvoiceItem
from apps.invoicing.vat import (
    compute_tax_amount, vat_breakdown, small_business_mention, pdf_vat_context,
)


def _setup_org(name, country='DE', exempt=False, username='u'):
    org = Organization.objects.create(name=name)
    from apps.core.modules import Modules
    org.enabled_modules = [Modules.CLIENTS, Modules.INVOICES, Modules.PRODUCTS]
    org.save(update_fields=['enabled_modules'])
    settings, _ = OrganizationSettings.objects.get_or_create(organization=org)
    settings.country = country
    settings.default_currency = 'EUR'
    settings.default_tax_rate = Decimal('19')
    settings.vat_exempt_small_business = exempt
    settings.company_vat_number = 'DE123456789'
    settings.company_tax_number = '12/345/67890'
    settings.tax_region = 'eu'
    settings.save()
    user = CustomUser.objects.create_user(
        username=username, email=f'{username}@example.com', password='testpass123', organization=org,
    )
    client = Client.objects.create(organization=org, name='Kunde GmbH', email='kunde@example.com')
    api = APIClient()
    api.force_authenticate(user=user)
    return org, user, client, api


def _payload(client, items, **extra):
    data = {
        'title': 'Rechnung', 'client': str(client.id), 'status': 'draft',
        'discount_type': 'percent', 'discount_value': 0, 'tax_amount': 0, 'items': items,
    }
    data.update(extra)
    return data


MIXED_ITEMS = [
    # 100,00 € à 19 % + 50,00 € à 7 %, remise globale de 10 €
    {'description': 'Beratung', 'quantity': 2, 'unit_price': '50.00', 'tax_rate': '19'},
    {'description': 'Fachbuch', 'quantity': 1, 'unit_price': '50.00', 'tax_rate': '7'},
]


@pytest.mark.django_db
class TestPerLineVat:
    def test_mixed_rates_with_invoice_discount(self):
        org, user, client, api = _setup_org('Mixed GmbH', username='mixed')
        # Le client envoie une TVA fausse : le serveur la recalcule à partir des lignes.
        resp = api.post('/api/v1/invoices/', _payload(
            client, MIXED_ITEMS, discount_type='amount', discount_value='10', tax_amount='999',
        ), format='json')
        assert resp.status_code == 201, resp.data
        inv = Invoice.objects.get(pk=resp.data['id'])
        # Remise répartie au prorata : 10 × 100/150 = 6,6667 sur la ligne à 19 %, 3,3333 sur celle à 7 %
        # TVA = 93,3333 × 19 % + 46,6667 × 7 % = 17,7333 + 3,2667 = 21,00
        assert inv.subtotal == Decimal('150.00')
        assert inv.discount_amount == Decimal('10')
        assert inv.tax_amount == Decimal('21.00')
        assert inv.total_amount == Decimal('161.00')
        rates = sorted(Decimal(str(i['tax_rate'])) for i in resp.data['items'])
        assert rates == [Decimal('7'), Decimal('19')]

        groups = vat_breakdown(inv.items.all(), inv.subtotal, inv.discount_amount)
        assert [(g['rate'], g['base'], g['vat']) for g in groups] == [
            (Decimal('19'), Decimal('93.33'), Decimal('17.73')),
            (Decimal('7'), Decimal('46.67'), Decimal('3.27')),
        ]

    def test_percent_discount_rounding(self):
        items = [
            {'total_price': Decimal('33.33'), 'tax_rate': Decimal('19')},
            {'total_price': Decimal('12.99'), 'tax_rate': Decimal('7')},
        ]
        subtotal = Decimal('46.32')
        discount = subtotal * Decimal('0.05')  # 5 %
        # 31.6635 × 0.19 + 12.3405 × 0.07 = 6.016065 + 0.863835 = 6.8799 -> 6.88
        assert compute_tax_amount(items, subtotal, discount) == Decimal('6.88')

    def test_add_item_recomputes_vat(self):
        org, user, client, api = _setup_org('AddItem GmbH', username='additem')
        resp = api.post('/api/v1/invoices/', _payload(client, MIXED_ITEMS[:1]), format='json')
        inv = Invoice.objects.get(pk=resp.data['id'])
        assert inv.tax_amount == Decimal('19.00')
        InvoiceItem.objects.create(invoice=inv, description='Buch', quantity=1,
                                   unit_price=Decimal('10'), tax_rate=Decimal('7'))
        inv.refresh_from_db()
        assert inv.tax_amount == Decimal('19.70')
        assert inv.total_amount == Decimal('129.70')

    def test_pdf_templates_show_breakdown_and_seller_ids(self):
        org, user, client, api = _setup_org('Pdf GmbH', username='pdf')
        resp = api.post('/api/v1/invoices/', _payload(client, MIXED_ITEMS), format='json')
        inv = Invoice.objects.get(pk=resp.data['id'])
        ctx = pdf_vat_context(inv, 'de')
        assert [g['rate_label'] for g in ctx['vat_breakdown']] == ['19', '7']
        organization = {'name': 'Pdf GmbH', 'tax_region': 'eu', 'vat_number': 'DE123456789', 'tax_number': '12/345/67890',
                        'currency': 'EUR'}
        for tpl in ['classic', 'minimal', 'modern', 'professional', 'thermal']:
            html = render_to_string(f'invoicing/pdf_templates/invoice_{tpl}.html', {
                'invoice': inv, 'organization': organization, 'items': inv.items.all(),
                'subtotal': inv.subtotal, 'tax_amount': inv.tax_amount, 'total_amount': inv.total_amount,
                'discount_amount': inv.discount_amount, 'issue_date': inv.created_at, **ctx,
            })
            assert 'USt. 19 %' in html and 'USt. 7 %' in html, tpl
            assert 'Nettobetrag 19 %' in html, tpl
            assert 'USt-IdNr.' in html and 'DE123456789' in html, tpl
            assert 'Steuernummer' in html and '12/345/67890' in html, tpl
            assert inv.created_at.strftime('%d/%m/%Y') in html, tpl


@pytest.mark.django_db
class TestLegacyInvoice:
    def _legacy(self, org, user, client):
        """Facture créée avant la TVA par ligne : taux global de 19,25 %, lignes à 0 %."""
        inv = Invoice.objects.create(
            organization=org, created_by=user, client=client, title='Ancienne', status='sent',
            subtotal=Decimal('0'), total_amount=Decimal('0'), tax_amount=Decimal('1925.00'),
        )
        InvoiceItem.objects.create(invoice=inv, description='Service', quantity=1, unit_price=Decimal('10000'))
        inv.refresh_from_db()
        return inv

    def test_legacy_kept_when_items_have_no_rate(self):
        org, user, client, api = _setup_org('Legacy SARL', country='CM', username='legacy')
        inv = self._legacy(org, user, client)
        assert inv.tax_amount == Decimal('1925.00')
        assert inv.total_amount == Decimal('11925.00')
        # Mise à jour sans taux par ligne (ancien client) : la TVA envoyée est conservée
        resp = api.patch(f'/api/v1/invoices/{inv.id}/', {
            'items': [{'description': 'Service', 'quantity': 1, 'unit_price': '10000'}],
            'tax_amount': '1925.00',
        }, format='json')
        assert resp.status_code == 200, resp.data
        inv.refresh_from_db()
        assert inv.tax_amount == Decimal('1925.00')
        assert inv.total_amount == Decimal('11925.00')
        # Pas de ventilation pour une facture historique (le montant global fait foi)
        assert vat_breakdown(inv.items.all(), inv.subtotal, inv.discount_amount) == []

    def test_legacy_update_with_derived_rate_keeps_vat(self):
        """Le formulaire pré-remplit le taux effectif (1925 / 10000 = 19,25 %) sur chaque ligne."""
        org, user, client, api = _setup_org('Legacy2 SARL', country='CM', username='legacy2')
        inv = self._legacy(org, user, client)
        resp = api.put(f'/api/v1/invoices/{inv.id}/', {
            'title': 'Ancienne', 'client': str(client.id), 'status': 'sent',
            'discount_type': 'percent', 'discount_value': 0, 'tax_amount': '1925.00',
            'items': [{'description': 'Service', 'quantity': 1, 'unit_price': '10000', 'tax_rate': '19.25'}],
        }, format='json')
        assert resp.status_code == 200, resp.data
        inv.refresh_from_db()
        assert inv.tax_amount == Decimal('1925.00')
        assert inv.total_amount == Decimal('11925.00')

    def test_adding_rated_line_to_legacy_invoice_keeps_existing_vat(self):
        org, user, client, api = _setup_org('Legacy4 SARL', country='CM', username='legacy4')
        inv = self._legacy(org, user, client)
        inv.status = 'draft'
        inv.save()
        resp = api.post(f'/api/v1/invoices/{inv.id}/add_item/', {
            'description': 'Extra', 'quantity': 1, 'unit_price': '1000', 'tax_rate': '19.25',
        }, format='json')
        assert resp.status_code == 201, resp.data
        inv.refresh_from_db()
        # 1925 (ancienne TVA, désormais portée par la ligne à 19,25 %) + 192,50
        assert inv.tax_amount == Decimal('2117.50')
        assert inv.total_amount == Decimal('13117.50')

    def test_status_change_does_not_touch_vat(self):
        org, user, client, api = _setup_org('Legacy3 SARL', country='CM', username='legacy3')
        inv = self._legacy(org, user, client)
        resp = api.patch(f'/api/v1/invoices/{inv.id}/', {'status': 'paid'}, format='json')
        assert resp.status_code == 200, resp.data
        inv.refresh_from_db()
        assert inv.tax_amount == Decimal('1925.00')


@pytest.mark.django_db
class TestSmallBusinessExemption:
    def test_exempt_org_gets_zero_vat(self):
        org, user, client, api = _setup_org('Klein', country='DE', exempt=True, username='klein')
        resp = api.post('/api/v1/invoices/', _payload(client, MIXED_ITEMS, tax_amount='28.50'), format='json')
        assert resp.status_code == 201, resp.data
        inv = Invoice.objects.get(pk=resp.data['id'])
        assert inv.tax_amount == Decimal('0')
        assert inv.total_amount == Decimal('150.00')
        assert all(i.tax_rate == 0 for i in inv.items.all())

        # Mise à jour : toujours pas de TVA
        resp = api.patch(f'/api/v1/invoices/{inv.id}/', {
            'items': MIXED_ITEMS, 'tax_amount': '28.50',
        }, format='json')
        assert resp.status_code == 200, resp.data
        inv.refresh_from_db()
        assert inv.tax_amount == Decimal('0')
        assert inv.total_amount == Decimal('150.00')

        ctx = pdf_vat_context(inv, 'de')
        assert ctx['vat_exempt'] is True
        assert ctx['vat_breakdown'] == []
        assert ctx['vat_exempt_mention'] == 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
        html = render_to_string('invoicing/pdf_templates/invoice_classic.html', {
            'invoice': inv, 'organization': {'tax_region': 'eu'}, 'items': inv.items.all(),
            'subtotal': inv.subtotal, 'tax_amount': inv.tax_amount, 'total_amount': inv.total_amount,
            'discount_amount': inv.discount_amount, **ctx,
        })
        assert '§ 19 UStG' in html

    def test_legal_mentions_by_country(self):
        assert small_business_mention('DE') == 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
        assert small_business_mention('AT') == 'Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG'
        assert small_business_mention('FR') == 'TVA non applicable, art. 293 B du CGI'
        assert small_business_mention('BE', 'en') == 'VAT exempt (small business scheme)'
        assert small_business_mention('CM', 'de') == 'Umsatzsteuerfrei (Kleinunternehmerregelung)'
