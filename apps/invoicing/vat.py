"""TVA par ligne de facture : calcul, ventilation par taux et mention légale des petites entreprises.

Règle de calcul (partagée avec le formulaire de facture et la déclaration de TVA) :
  - base d'une ligne = total de la ligne − sa part de la remise globale
    (remise × total de la ligne / sous-total) ;
  - TVA d'une ligne = base × taux / 100 (non arrondie) ;
  - TVA de la facture = somme des TVA des lignes, arrondie à 2 décimales (arrondi commercial).

Les montants sont stockés avec 2 décimales quelle que soit la devise (XAF/XOF compris) ;
les devises sans décimales ne sont arrondies qu'à l'affichage.

Factures historiques : aucune ligne n'a de taux (tous à 0) et la TVA a été saisie globalement.
Dans ce cas on ne recalcule rien et on ne ventile pas : le montant enregistré fait foi.
"""
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal('0.01')
ZERO = Decimal('0')


def _dec(value):
    if isinstance(value, Decimal):
        return value if value.is_finite() else ZERO
    try:
        return Decimal(str(value if value is not None else 0))
    except Exception:
        return ZERO


def _get(item, field):
    return item.get(field) if isinstance(item, dict) else getattr(item, field, None)


def round_amount(value):
    return _dec(value).quantize(CENT, rounding=ROUND_HALF_UP)


def has_line_rates(items):
    """Vrai si au moins une ligne porte un taux de TVA (> 0)."""
    return any(_dec(_get(item, 'tax_rate')) > 0 for item in items)


def vat_lines(items, subtotal, discount_amount):
    """[(taux, base, tva)] par ligne, non arrondis."""
    subtotal = _dec(subtotal)
    discount = _dec(discount_amount)
    lines = []
    for item in items:
        total = _dec(_get(item, 'total_price'))
        share = discount * total / subtotal if subtotal > 0 and discount > 0 else ZERO
        base = total - share
        rate = _dec(_get(item, 'tax_rate'))
        lines.append((rate, base, base * rate / Decimal('100')))
    return lines


def compute_tax_amount(items, subtotal, discount_amount):
    """TVA de la facture = somme des TVA des lignes, arrondie à 2 décimales."""
    return round_amount(sum((vat for _, _, vat in vat_lines(items, subtotal, discount_amount)), ZERO))


def derive_legacy_rate(tax_amount, subtotal, discount_amount):
    """Taux effectif d'une facture historique : TVA / (sous-total − remise) × 100, arrondi à 2 décimales."""
    tax = _dec(tax_amount)
    base = _dec(subtotal) - _dec(discount_amount)
    if tax <= 0 or base <= 0:
        return None
    rate = (tax / base * Decimal('100')).quantize(CENT, rounding=ROUND_HALF_UP)
    return rate if rate <= Decimal('100') else None


def vat_breakdown(items, subtotal, discount_amount):
    """Ventilation par taux, du plus élevé au plus bas : [{'rate', 'base', 'vat'}] (arrondis à 2 décimales).

    Liste vide pour une facture historique (aucun taux par ligne).
    """
    items = list(items)
    if not has_line_rates(items):
        return []
    groups = {}
    for rate, base, vat in vat_lines(items, subtotal, discount_amount):
        key = rate.normalize()
        g = groups.setdefault(key, [ZERO, ZERO])
        g[0] += base
        g[1] += vat
    return [
        {'rate': rate, 'base': round_amount(base), 'vat': round_amount(vat)}
        for rate, (base, vat) in sorted(groups.items(), key=lambda kv: kv[0], reverse=True)
    ]


def format_rate(rate):
    """19.00 -> '19', 5.50 -> '5.5'."""
    d = _dec(rate).normalize()
    text = format(d, 'f')
    return text.rstrip('0').rstrip('.') if '.' in text else text


# --- Organisation ----------------------------------------------------------------

def invoice_org_settings(invoice):
    """Paramètres de l'organisation émettrice (ou None)."""
    from apps.core.models import OrganizationSettings
    org = getattr(invoice, 'organization', None)
    if org is None and getattr(invoice, 'created_by_id', None):
        org = getattr(invoice.created_by, 'organization', None)
    if org is None:
        return None
    return OrganizationSettings.objects.filter(organization=org).first()


def is_small_business_exempt(org_settings):
    return bool(getattr(org_settings, 'vat_exempt_small_business', False)) if org_settings else False


# --- Mention légale (petites entreprises exonérées) ---------------------------------

_GENERIC_EXEMPT = {
    'fr': "TVA non applicable (régime des petites entreprises)",
    'en': "VAT exempt (small business scheme)",
    'de': "Umsatzsteuerfrei (Kleinunternehmerregelung)",
}


def small_business_mention(country, language='fr'):
    """Mention obligatoire sur les factures d'une petite entreprise exonérée, selon le pays de l'émetteur."""
    country = (country or '').upper()
    if country == 'DE':
        return "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
    if country == 'AT':
        return "Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG"
    if country == 'FR':
        return "TVA non applicable, art. 293 B du CGI"
    lang = (language or 'fr')[:2].lower()
    return _GENERIC_EXEMPT.get(lang, _GENERIC_EXEMPT['en'])


# --- Libellés des PDF ---------------------------------------------------------------

_PDF_LABELS = {
    'fr': {'vat': 'TVA', 'net': 'Base HT', 'vat_id': 'N° TVA', 'tax_number': 'N° fiscal'},
    'en': {'vat': 'VAT', 'net': 'Net amount', 'vat_id': 'VAT ID', 'tax_number': 'Tax number'},
    'de': {'vat': 'USt.', 'net': 'Nettobetrag', 'vat_id': 'USt-IdNr.', 'tax_number': 'Steuernummer'},
}


def pdf_vat_context(invoice, language='fr'):
    """Contexte TVA pour les gabarits PDF : ventilation par taux, mention d'exonération, libellés."""
    org_settings = invoice_org_settings(invoice)
    lang = (language or 'fr')[:2].lower()
    labels = _PDF_LABELS.get(lang, _PDF_LABELS['en'])
    # Mention d'exonération seulement si la facture ne porte pas de TVA (une facture émise
    # avant le passage au régime des petites entreprises garde sa TVA et sa ventilation).
    exempt = is_small_business_exempt(org_settings) and not (_dec(invoice.tax_amount) > 0)
    breakdown = []
    if not exempt:
        items = list(invoice.items.all()) if getattr(invoice, 'pk', None) else []
        breakdown = [
            {**g, 'rate_label': format_rate(g['rate'])}
            for g in vat_breakdown(items, invoice.subtotal, invoice.discount_amount)
        ]
    return {
        'vat_breakdown': breakdown,
        'vat_exempt': exempt,
        'vat_exempt_mention': small_business_mention(getattr(org_settings, 'country', ''), lang) if exempt else '',
        'vat_labels': labels,
    }
