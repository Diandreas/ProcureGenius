"""
Déclaration de TVA (VAT return / Umsatzsteuer-Voranmeldung).

`build_vat_report(organization, start, end)` calcule, pour une période, la TVA
collectée sur les ventes (factures moins avoirs), la TVA déductible sur les
achats (bons de commande + dépenses) et le solde à payer (négatif = crédit /
remboursement). Pour l'Allemagne, le bloc `ustva` donne directement les
Kennzahlen à saisir dans ELSTER.

Règles (contrat partagé avec le module factures) :
- base d'une ligne = total_price de la ligne − sa part de la remise globale
  (discount_amount × total_price / subtotal) ; TVA = base × taux / 100 ;
- facture « historique » sans aucun taux par ligne mais avec tax_amount > 0 :
  un seul taux = tax_amount / (subtotal − remise), base = subtotal − remise ;
- le total de TVA d'une facture est toujours celui de invoice.tax_amount
  (écart d'arrondi reporté sur le plus gros taux) ;
- factures retenues : envoyées / en attente / payées / en retard, plus les
  factures annulées par un avoir (l'avoir, daté de son émission, vient en
  déduction : la facture et l'avoir se compensent) ; brouillons, devis et
  annulations sans avoir exclus ;
- montants dans une autre devise que celle de l'organisation : exclus et
  signalés dans `warnings` (on n'additionne pas des euros et des dollars).

Fonction pure : aucune écriture en base. Tous les montants sont des Decimal.
"""
import calendar
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP

from django.db.models import Q

ZERO = Decimal('0')
CENT = Decimal('0.01')
HUNDRED = Decimal('100')

# Factures émises (comptabilisées en vente)
FINAL_INVOICE_STATUSES = ('sent', 'pending', 'paid', 'overdue')
# Bons de commande engagés auprès du fournisseur (brouillon, en attente d'approbation, annulé : exclus)
COUNTED_PO_STATUSES = ('approved', 'sent', 'received', 'invoiced')

PERIOD_KINDS = ('month', 'quarter', 'year')
FILING_TO_KIND = {'monthly': 'month', 'quarterly': 'quarter', 'yearly': 'year',
                  'month': 'month', 'quarter': 'quarter', 'year': 'year'}


# ─────────────────────────────────────────────
#  Périodes
# ─────────────────────────────────────────────

def period_bounds(kind, year, index=None):
    """(premier jour, dernier jour) d'un mois (index 1-12), d'un trimestre (1-4) ou d'une année."""
    kind = FILING_TO_KIND.get(kind, kind)
    year = int(year)
    if kind == 'year':
        return date(year, 1, 1), date(year, 12, 31)
    index = int(index)
    if kind == 'month':
        if not 1 <= index <= 12:
            raise ValueError("month index must be between 1 and 12")
        return date(year, index, 1), date(year, index, calendar.monthrange(year, index)[1])
    if kind == 'quarter':
        if not 1 <= index <= 4:
            raise ValueError("quarter index must be between 1 and 4")
        first_month = 3 * (index - 1) + 1
        last_month = first_month + 2
        return date(year, first_month, 1), date(year, last_month, calendar.monthrange(year, last_month)[1])
    raise ValueError(f"unknown period kind: {kind}")


def last_complete_period(kind, today=None):
    """(year, index) de la dernière période entièrement écoulée (index None pour une année)."""
    kind = FILING_TO_KIND.get(kind, 'month')
    today = today or date.today()
    if kind == 'year':
        return today.year - 1, None
    if kind == 'quarter':
        q = (today.month - 1) // 3 + 1
        return (today.year - 1, 4) if q == 1 else (today.year, q - 1)
    return (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)


def _next_business_day(d):
    while d.weekday() >= 5:  # samedi / dimanche → lundi
        d += timedelta(days=1)
    return d


def _tenth_of_month_after(d, months_later=1):
    m = d.month - 1 + months_later
    return _next_business_day(date(d.year + m // 12, m % 12 + 1, 10))


# ─────────────────────────────────────────────
#  Outils de calcul
# ─────────────────────────────────────────────

def _d(value):
    return Decimal(str(value or 0))


def _q(value):
    return _d(value).quantize(CENT, rounding=ROUND_HALF_UP)


def _rate_key(rate):
    """Taux normalisé (2 décimales, sans zéros inutiles : 19, 7, 5.5)."""
    r = _d(rate).quantize(CENT, rounding=ROUND_HALF_UP)
    return r.quantize(Decimal('1')) if r == r.to_integral() else r.normalize()


def _effective_rate(base, tax, known_rates):
    """Taux apparent tax/base, ramené au taux légal connu quand l'écart n'est qu'un arrondi au centime."""
    base, tax = _d(base), _d(tax)
    if base <= 0 or tax == 0:
        return ZERO
    for r in known_rates:
        if r > 0 and abs(base * r / HUNDRED - tax) <= CENT:
            return _rate_key(r)
    return _rate_key(tax / base * HUNDRED)


def _fix_rounding(buckets, field, target):
    """Reporte l'écart (target − somme) sur le plus gros taux (en base)."""
    if not buckets:
        return
    diff = target - sum((b[field] for b in buckets.values()), ZERO)
    if diff:
        largest = max(buckets, key=lambda k: (buckets[k]['base'], k))
        buckets[largest][field] += diff


def invoice_buckets(invoice, known_rates=()):
    """{taux: {'base', 'vat'}} d'une facture, en centimes, cohérent avec invoice.tax_amount."""
    subtotal = _d(invoice.subtotal)
    discount = _d(invoice.discount_amount)
    net = subtotal - discount
    tax_total = _q(invoice.tax_amount)
    items = list(invoice.items.all())

    raw = defaultdict(lambda: {'base': ZERO, 'vat': ZERO})
    if any(_d(it.tax_rate) > 0 for it in items):
        for it in items:
            line = _d(it.total_price)
            share = discount * line / subtotal if subtotal > 0 else ZERO
            base = line - share
            rate = _rate_key(it.tax_rate)
            raw[rate]['base'] += base
            raw[rate]['vat'] += base * rate / HUNDRED
    else:
        # Facture historique : taxe saisie globalement → un seul taux apparent
        raw[_effective_rate(net, tax_total, known_rates)] = {'base': net, 'vat': tax_total}

    computed_vat = sum((b['vat'] for b in raw.values()), ZERO)
    buckets = {r: {'base': _q(b['base']), 'vat': _q(b['vat'])} for r, b in raw.items()}
    _fix_rounding(buckets, 'base', _q(net))

    if abs(_q(computed_vat) - tax_total) > Decimal('1.00') and computed_vat > 0:
        # Écart réel (pas un simple arrondi) : on suit invoice.tax_amount, réparti au prorata
        for r in buckets:
            buckets[r]['vat'] = _q(tax_total * raw[r]['vat'] / computed_vat)
    _fix_rounding(buckets, 'vat', tax_total)
    return buckets


def _add(acc, buckets, sign=1):
    for rate, b in buckets.items():
        acc[rate]['base'] += sign * b['base']
        acc[rate]['vat'] += sign * b['vat']


def _rows(acc):
    """Liste triée par taux décroissant, sans les taux à zéro partout."""
    return [{'rate': rate, 'base': b['base'], 'vat': b['vat']}
            for rate, b in sorted(acc.items(), key=lambda kv: kv[0], reverse=True)
            if b['base'] or b['vat']]


def _org_settings(org):
    try:
        return org.settings
    except Exception:
        return None


# ─────────────────────────────────────────────
#  Rapport
# ─────────────────────────────────────────────

def build_vat_report(organization, start, end):
    """Déclaration de TVA de `organization` du `start` au `end` inclus (dates)."""
    from apps.core.countries import vat_rates, country_profile
    from apps.invoicing.models import Invoice, CreditNote
    from apps.purchase_orders.models import PurchaseOrder
    from .models import Expense

    org = organization
    st = _org_settings(org)
    country = (getattr(st, 'country', '') or '').upper()
    profile = country_profile(country) or {}
    currency = (getattr(st, 'default_currency', '') or '') or profile.get('currency') or 'XAF'
    small_business = bool(getattr(st, 'vat_exempt_small_business', False))
    known_rates = [_d(r) for r in vat_rates(country)]
    if st is not None and _d(getattr(st, 'default_tax_rate', 0)) > 0:
        known_rates.append(_d(st.default_tax_rate))
    same_currency = Q(currency='') | Q(currency__iexact=currency)

    warnings = []

    # ── Ventes ────────────────────────────────────────────────────
    invoice_qs = (
        Invoice.objects.filter(organization=org,
                               created_at__date__gte=start, created_at__date__lte=end)
        .filter(Q(status__in=FINAL_INVOICE_STATUSES) |
                Q(status='cancelled', credit_notes__status='issued'))
        .distinct()
    )
    foreign_invoices = invoice_qs.exclude(same_currency).count()
    if foreign_invoices:
        warnings.append({'code': 'foreign_currency_invoices', 'count': foreign_invoices})

    sales_acc = defaultdict(lambda: {'base': ZERO, 'vat': ZERO})
    invoice_count = 0
    for inv in invoice_qs.filter(same_currency).prefetch_related('items'):
        _add(sales_acc, invoice_buckets(inv, known_rates))
        invoice_count += 1

    # ── Avoirs (datés de leur émission) ───────────────────────────
    cn_qs = (CreditNote.objects.filter(organization=org, invoice__organization=org, status='issued',
                                       created_at__date__gte=start, created_at__date__lte=end)
             .select_related('invoice').prefetch_related('invoice__items'))
    credit_acc = defaultdict(lambda: {'base': ZERO, 'vat': ZERO})
    credit_count = 0
    foreign_cn = 0
    for cn in cn_qs:
        inv = cn.invoice
        if inv.currency and inv.currency.upper() != currency.upper():
            foreign_cn += 1
            continue
        total = _d(inv.total_amount)
        if total <= 0:
            continue
        amount = _d(cn.amount)
        ratio = amount / total
        cn_tax = _q(_d(inv.tax_amount) * ratio)  # même calcul que l'écriture comptable de l'avoir
        inv_b = invoice_buckets(inv, known_rates)
        buckets = {r: {'base': _q(b['base'] * ratio), 'vat': _q(b['vat'] * ratio)} for r, b in inv_b.items()}
        _fix_rounding(buckets, 'vat', cn_tax)
        _fix_rounding(buckets, 'base', _q(amount - cn_tax))
        _add(credit_acc, buckets)
        credit_count += 1
    if foreign_cn:
        warnings.append({'code': 'foreign_currency_credit_notes', 'count': foreign_cn})

    # ── Achats : bons de commande + dépenses ──────────────────────
    purchase_acc = defaultdict(lambda: {'base': ZERO, 'vat': ZERO})
    po_vat, po_count = ZERO, 0
    po_qs = PurchaseOrder.objects.filter(created_by__organization=org, status__in=COUNTED_PO_STATUSES,
                                         created_at__date__gte=start, created_at__date__lte=end)
    for po in po_qs:
        tax = _q(_d(po.tax_gst_hst) + _d(po.tax_qst))
        if tax == 0:
            continue
        base = _q(po.subtotal)
        rate = _effective_rate(base, tax, known_rates)
        purchase_acc[rate]['base'] += base
        purchase_acc[rate]['vat'] += tax
        po_vat += tax
        po_count += 1

    expense_vat, expense_count = ZERO, 0
    exp_qs = Expense.objects.filter(organization=org, date__gte=start, date__lte=end)
    foreign_exp = exp_qs.exclude(same_currency).exclude(tax_amount=0).count()
    if foreign_exp:
        warnings.append({'code': 'foreign_currency_expenses', 'count': foreign_exp})
    for exp in exp_qs.filter(same_currency).exclude(tax_amount=0):
        tax = _q(exp.tax_amount)
        base = _q(_d(exp.amount) - tax)
        rate = _effective_rate(base, tax, known_rates)
        purchase_acc[rate]['base'] += base
        purchase_acc[rate]['vat'] += tax
        expense_vat += tax
        expense_count += 1

    # ── Totaux ────────────────────────────────────────────────────
    sales_rows = _rows(sales_acc)
    credit_rows = _rows(credit_acc)
    sales_base = sum((r['base'] for r in sales_rows), ZERO)
    sales_vat = sum((r['vat'] for r in sales_rows), ZERO)
    credit_base = sum((r['base'] for r in credit_rows), ZERO)
    credit_vat = sum((r['vat'] for r in credit_rows), ZERO)
    input_vat = po_vat + expense_vat

    small_business_reason = None
    if small_business:
        # Pas de TVA facturée ni déductible : seul le chiffre d'affaires reste utile (seuil du régime)
        small_business_reason = 'kleinunternehmer' if country == 'DE' else (
            'franchise_en_base' if country == 'FR' else 'small_business')
        sales_rows = [{'rate': ZERO, 'base': sales_base, 'vat': ZERO}] if sales_base else []
        credit_rows = [{'rate': ZERO, 'base': credit_base, 'vat': ZERO}] if credit_base else []
        sales_vat = credit_vat = ZERO
        payable = ZERO
    else:
        payable = sales_vat - credit_vat - input_vat

    output_vat = sales_vat - credit_vat

    # Base nette par taux (ventes − avoirs) : c'est elle qui se déclare
    net_acc = defaultdict(lambda: {'base': ZERO, 'vat': ZERO})
    for row in sales_rows:
        net_acc[row['rate']]['base'] += row['base']
        net_acc[row['rate']]['vat'] += row['vat']
    for row in credit_rows:
        net_acc[row['rate']]['base'] -= row['base']
        net_acc[row['rate']]['vat'] -= row['vat']
    net_rows = _rows(net_acc)

    report = {
        'period': {'start': start, 'end': end},
        'currency': currency,
        'country': country,
        'small_business': small_business,
        'small_business_reason': small_business_reason,
        'sales': {
            'by_rate': sales_rows,
            'base_total': sales_base,
            'vat_total': sales_vat,
            'invoice_count': invoice_count,
        },
        'credit_notes': {
            'by_rate': credit_rows,
            'base': credit_base,
            'vat': credit_vat,
            'count': credit_count,
        },
        'net_sales': {'by_rate': net_rows},
        'purchases': {
            'by_rate': _rows(purchase_acc),
            'vat_total': input_vat,
            'po_vat': po_vat,
            'expense_vat': expense_vat,
            'po_count': po_count,
            'expense_count': expense_count,
            'deductible': not small_business,
        },
        'output_vat': output_vat,
        'input_vat': ZERO if small_business else input_vat,
        'payable': payable,
        'is_refund': payable < 0,
        'warnings': warnings,
        'ustva': None,
    }

    if country == 'DE' and not small_business:
        report['ustva'] = _ustva_block(net_rows, input_vat, payable, end)
    return report


def _ustva_block(net_rows, input_vat, payable, end):
    """Kennzahlen de l'Umsatzsteuer-Voranmeldung (formulaire officiel, ELSTER)."""
    by = {r['rate']: r for r in net_rows}
    r19 = by.get(Decimal('19'), {'base': ZERO, 'vat': ZERO})
    r7 = by.get(Decimal('7'), {'base': ZERO, 'vat': ZERO})
    others = [r for r in net_rows if r['rate'] not in (Decimal('19'), Decimal('7')) and r['rate'] > 0]
    tax_free = sum((r['base'] for r in net_rows if r['rate'] == 0), ZERO)

    def whole_euros(v):  # le formulaire ne prend que des euros entiers (centimes abandonnés)
        return int(v.quantize(Decimal('1'), rounding=ROUND_DOWN))

    return {
        'kz81': whole_euros(r19['base']),       # steuerpflichtige Umsätze 19 % (Bemessungsgrundlage)
        'kz81_vat': r19['vat'],
        'kz86': whole_euros(r7['base']),        # steuerpflichtige Umsätze 7 %
        'kz86_vat': r7['vat'],
        'kz35': whole_euros(sum((r['base'] for r in others), ZERO)),   # Umsätze zu anderen Steuersätzen
        'kz36': sum((r['vat'] for r in others), ZERO),
        'tax_free_base': tax_free,              # Umsätze à 0 % : Kennzahl selon le motif (41, 43, 48…)
        'kz66': input_vat,                      # abziehbare Vorsteuerbeträge
        'kz83': payable,                        # verbleibende Umsatzsteuer-Vorauszahlung / Überschuss (−)
        'deadline': _tenth_of_month_after(end, 1),
        'deadline_extended': _tenth_of_month_after(end, 2),  # avec Dauerfristverlängerung
    }


# ─────────────────────────────────────────────
#  Sérialisation (JSON / CSV)
# ─────────────────────────────────────────────

def _fmt_amount(v):
    return f"{_d(v).quantize(CENT, rounding=ROUND_HALF_UP):.2f}"


def _fmt_rate(v):
    return float(_d(v))


def serialize_report(report):
    """Version JSON : montants en chaînes à 2 décimales, taux en nombres, dates ISO."""
    def rows(lst):
        return [{'rate': _fmt_rate(r['rate']), 'base': _fmt_amount(r['base']), 'vat': _fmt_amount(r['vat'])}
                for r in lst]

    out = {
        'period': {k: (v.isoformat() if isinstance(v, date) else v) for k, v in report['period'].items()},
        'currency': report['currency'],
        'country': report['country'],
        'small_business': report['small_business'],
        'small_business_reason': report['small_business_reason'],
        'sales': {
            'by_rate': rows(report['sales']['by_rate']),
            'base_total': _fmt_amount(report['sales']['base_total']),
            'vat_total': _fmt_amount(report['sales']['vat_total']),
            'invoice_count': report['sales']['invoice_count'],
        },
        'credit_notes': {
            'by_rate': rows(report['credit_notes']['by_rate']),
            'base': _fmt_amount(report['credit_notes']['base']),
            'vat': _fmt_amount(report['credit_notes']['vat']),
            'count': report['credit_notes']['count'],
        },
        'net_sales': {'by_rate': rows(report['net_sales']['by_rate'])},
        'purchases': {
            **{k: report['purchases'][k] for k in ('po_count', 'expense_count', 'deductible')},
            'by_rate': rows(report['purchases']['by_rate']),
            'vat_total': _fmt_amount(report['purchases']['vat_total']),
            'po_vat': _fmt_amount(report['purchases']['po_vat']),
            'expense_vat': _fmt_amount(report['purchases']['expense_vat']),
        },
        'output_vat': _fmt_amount(report['output_vat']),
        'input_vat': _fmt_amount(report['input_vat']),
        'payable': _fmt_amount(report['payable']),
        'is_refund': report['is_refund'],
        'warnings': report['warnings'],
        'ustva': None,
    }
    u = report.get('ustva')
    if u:
        out['ustva'] = {
            'kz81': u['kz81'], 'kz81_vat': _fmt_amount(u['kz81_vat']),
            'kz86': u['kz86'], 'kz86_vat': _fmt_amount(u['kz86_vat']),
            'kz35': u['kz35'], 'kz36': _fmt_amount(u['kz36']),
            'tax_free_base': _fmt_amount(u['tax_free_base']),
            'kz66': _fmt_amount(u['kz66']), 'kz83': _fmt_amount(u['kz83']),
            'deadline': u['deadline'].isoformat(),
            'deadline_extended': u['deadline_extended'].isoformat(),
        }
    return out


CSV_LABELS = {
    'fr': {
        'title': 'Déclaration de TVA', 'period': 'Période', 'currency': 'Devise',
        'section': 'Rubrique', 'label': 'Libellé', 'rate': 'Taux (%)', 'base': 'Base HT', 'vat': 'TVA',
        'sales': 'TVA collectée (factures)', 'credit': 'Avoirs', 'net': 'Ventes nettes',
        'purchases': 'TVA déductible', 'po': 'Bons de commande', 'expenses': 'Dépenses',
        'totals': 'Totaux', 'output': 'TVA collectée nette', 'input': 'TVA déductible',
        'payable': 'TVA à payer', 'refund': 'Crédit de TVA', 'small': 'Petite entreprise exonérée : aucune TVA à payer',
        'ustva': 'UStVA (Allemagne)', 'deadline': "Date limite de dépôt",
    },
    'en': {
        'title': 'VAT return', 'period': 'Period', 'currency': 'Currency',
        'section': 'Section', 'label': 'Label', 'rate': 'Rate (%)', 'base': 'Net amount', 'vat': 'VAT',
        'sales': 'Output VAT (invoices)', 'credit': 'Credit notes', 'net': 'Net sales',
        'purchases': 'Input VAT', 'po': 'Purchase orders', 'expenses': 'Expenses',
        'totals': 'Totals', 'output': 'Net output VAT', 'input': 'Input VAT',
        'payable': 'VAT payable', 'refund': 'VAT refund', 'small': 'VAT-exempt small business: no VAT due',
        'ustva': 'UStVA (Germany)', 'deadline': 'Filing deadline',
    },
    'de': {
        'title': 'Umsatzsteuer-Voranmeldung', 'period': 'Zeitraum', 'currency': 'Währung',
        'section': 'Bereich', 'label': 'Bezeichnung', 'rate': 'Steuersatz (%)', 'base': 'Bemessungsgrundlage',
        'vat': 'Steuer', 'sales': 'Umsatzsteuer (Rechnungen)', 'credit': 'Gutschriften', 'net': 'Nettoumsätze',
        'purchases': 'Vorsteuer', 'po': 'Bestellungen', 'expenses': 'Ausgaben',
        'totals': 'Summen', 'output': 'Umsatzsteuer netto', 'input': 'Vorsteuer',
        'payable': 'Zahllast', 'refund': 'Erstattung', 'small': 'Kleinunternehmer (§ 19 UStG): keine Umsatzsteuer',
        'ustva': 'UStVA', 'deadline': 'Abgabefrist',
    },
}


def report_to_csv(report, lang='en'):
    """CSV (séparateur « ; », UTF-8 avec BOM, virgule décimale en français / allemand)."""
    import csv
    import io

    lang = lang if lang in CSV_LABELS else 'en'
    L = CSV_LABELS[lang]
    comma = lang in ('fr', 'de')

    def amt(v):
        s = _fmt_amount(v)
        return s.replace('.', ',') if comma else s

    def rate(v):
        s = f"{_d(v).normalize():f}"
        return s.replace('.', ',') if comma else s

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=';', lineterminator='\r\n')
    p = report['period']
    w.writerow([L['title']])
    w.writerow([L['period'], p['start'].isoformat(), p['end'].isoformat()])
    w.writerow([L['currency'], report['currency']])
    w.writerow([])
    w.writerow([L['section'], L['label'], L['rate'], L['base'], L['vat']])
    for r in report['sales']['by_rate']:
        w.writerow([L['sales'], '', rate(r['rate']), amt(r['base']), amt(r['vat'])])
    for r in report['credit_notes']['by_rate']:
        w.writerow([L['credit'], '', rate(r['rate']), amt(-r['base']), amt(-r['vat'])])
    for r in report['net_sales']['by_rate']:
        w.writerow([L['net'], '', rate(r['rate']), amt(r['base']), amt(r['vat'])])
    for r in report['purchases']['by_rate']:
        w.writerow([L['purchases'], '', rate(r['rate']), amt(r['base']), amt(r['vat'])])
    pur = report['purchases']
    w.writerow([L['purchases'], f"{L['po']} ({pur['po_count']})", '', '', amt(pur['po_vat'])])
    w.writerow([L['purchases'], f"{L['expenses']} ({pur['expense_count']})", '', '', amt(pur['expense_vat'])])
    w.writerow([])
    w.writerow([L['totals'], L['output'], '', '', amt(report['output_vat'])])
    w.writerow([L['totals'], L['input'], '', '', amt(report['input_vat'])])
    w.writerow([L['totals'], L['refund'] if report['is_refund'] else L['payable'], '', '', amt(report['payable'])])
    if report['small_business']:
        w.writerow([L['totals'], L['small']])
    u = report.get('ustva')
    if u:
        w.writerow([])
        w.writerow([L['ustva'], 'Kz 81', '19', str(u['kz81']), amt(u['kz81_vat'])])
        w.writerow([L['ustva'], 'Kz 86', '7', str(u['kz86']), amt(u['kz86_vat'])])
        if u['kz35'] or u['kz36']:
            w.writerow([L['ustva'], 'Kz 35 / 36', '', str(u['kz35']), amt(u['kz36'])])
        w.writerow([L['ustva'], 'Kz 66', '', '', amt(u['kz66'])])
        w.writerow([L['ustva'], 'Kz 83', '', '', amt(u['kz83'])])
        w.writerow([L['ustva'], L['deadline'], '', '', u['deadline'].isoformat()])
    return '﻿' + buf.getvalue()
