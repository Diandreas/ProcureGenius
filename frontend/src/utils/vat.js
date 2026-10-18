/**
 * TVA par ligne de facture — même règle que le serveur (apps/invoicing/vat.py) :
 *   base d'une ligne = total de la ligne − sa part de la remise globale (remise × total ligne / sous-total)
 *   TVA d'une ligne  = base × taux / 100
 *   TVA de la facture = somme des TVA des lignes, arrondie à 2 décimales
 * Les montants sont stockés avec 2 décimales quelle que soit la devise (XAF/XOF compris) ;
 * les devises sans décimales ne sont arrondies qu'à l'affichage.
 */

export const toNumber = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

// Arrondi commercial à 2 décimales (EPSILON : 1.005 -> 1.01)
export const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

// 19 -> "19", 5.5 -> "5,5" selon la langue
export const formatRate = (rate, language) => {
  const n = Math.round(toNumber(rate) * 100) / 100;
  try {
    return n.toLocaleString(language || undefined, { maximumFractionDigits: 2 });
  } catch (e) {
    return String(n);
  }
};

export const hasLineRates = (items) => (items || []).some((it) => toNumber(it.tax_rate) > 0);

/**
 * Calcule la TVA d'une facture à partir de ses lignes.
 * @returns {{ taxAmount: number, breakdown: Array<{rate:number, base:number, vat:number}> }}
 *   breakdown : ventilation par taux (du plus élevé au plus bas), vide si aucune ligne n'a de taux.
 */
export const computeVat = (items, subtotal, discountAmount) => {
  const sub = toNumber(subtotal);
  const discount = toNumber(discountAmount);
  const groups = new Map();
  let total = 0;
  (items || []).forEach((item) => {
    const lineTotal = toNumber(item.total_price);
    const share = sub > 0 && discount > 0 ? (discount * lineTotal) / sub : 0;
    const base = lineTotal - share;
    const rate = Math.round(toNumber(item.tax_rate) * 100) / 100;
    const vat = (base * rate) / 100;
    total += vat;
    const g = groups.get(rate) || { rate, base: 0, vat: 0 };
    g.base += base;
    g.vat += vat;
    groups.set(rate, g);
  });
  const breakdown = hasLineRates(items)
    ? [...groups.values()]
      .sort((a, b) => b.rate - a.rate)
      .map((g) => ({ rate: g.rate, base: roundMoney(g.base), vat: roundMoney(g.vat) }))
    : [];
  return { taxAmount: roundMoney(total), breakdown };
};

/**
 * Taux effectif d'une facture historique (taux global, lignes sans taux) :
 * TVA / (sous-total − remise) × 100, arrondi à 2 décimales. null si non applicable.
 */
export const deriveLegacyRate = (taxAmount, subtotal, discountAmount) => {
  const base = toNumber(subtotal) - toNumber(discountAmount);
  const tax = toNumber(taxAmount);
  if (!(tax > 0) || !(base > 0)) return null;
  return Math.round((tax / base) * 100 * 100) / 100;
};

/**
 * Clé i18n de la mention légale des petites entreprises exonérées, selon le pays de l'émetteur.
 * DE : § 19 UStG ; AT : § 6 Abs. 1 Z 27 UStG ; FR : art. 293 B du CGI ; autres : mention générique.
 */
// Textes légaux (identiques quelle que soit la langue de l'interface) : valeurs par défaut des clés i18n
export const LEGAL_MENTION_DEFAULTS = {
  'invoices:vat.legal.de': 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
  'invoices:vat.legal.at': 'Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG',
  'invoices:vat.legal.fr': 'TVA non applicable, art. 293 B du CGI',
  'invoices:vat.legal.generic': 'VAT exempt (small business scheme)',
};

export const exemptionMentionKey = (country) => {
  switch ((country || '').toUpperCase()) {
    case 'DE': return 'invoices:vat.legal.de';
    case 'AT': return 'invoices:vat.legal.at';
    case 'FR': return 'invoices:vat.legal.fr';
    default: return 'invoices:vat.legal.generic';
  }
};
