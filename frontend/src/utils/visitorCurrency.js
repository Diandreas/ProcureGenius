/**
 * Monnaie d'affichage des prix selon le pays du visiteur.
 *
 * Les abonnements sont facturés en EUR (Stripe) : ce module ne sert qu'à
 * AFFICHER un équivalent dans la monnaie du visiteur (FCFA, naira...).
 *
 * Détection, du plus fiable au moins fiable :
 *  1. valeur déjà trouvée pendant la session (sessionStorage) ;
 *  2. pays d'après l'adresse IP (ipapi.co), comme auparavant sur la landing ;
 *  3. en attendant ou si ce service ne répond pas : la région de la langue du
 *     navigateur (« fr-CM » -> Cameroun). Le fuseau horaire n'est pas utilisé :
 *     sous Windows, un poste au Cameroun est réglé sur « Africa/Lagos », ce qui
 *     ferait afficher des nairas à un client camerounais.
 */
import { useEffect, useState } from 'react';

export const COUNTRY_CURRENCY_MAP = {
  SN: 'XOF', ML: 'XOF', BF: 'XOF', CI: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF', NE: 'XOF',
  CM: 'XAF', CG: 'XAF', GA: 'XAF', CF: 'XAF', TD: 'XAF', GQ: 'XAF',
  MA: 'MAD', TN: 'TND', DZ: 'DZD',
  NG: 'NGN', ZA: 'ZAR', GH: 'GHS', KE: 'KES', EG: 'EGP',
  GB: 'GBP', CH: 'CHF',
  US: 'USD', CA: 'CAD', BR: 'BRL', MX: 'MXN',
  JP: 'JPY', IN: 'INR', SG: 'SGD', HK: 'HKD', CN: 'CNY',
  AE: 'AED', SA: 'SAR',
};

// Taux indicatifs (1 EUR = ...). XOF/XAF : parité fixe avec l'euro.
export const EUR_RATES = {
  EUR: 1, USD: 1.08, GBP: 0.86, CHF: 0.96, CAD: 1.47,
  XOF: 655.957, XAF: 655.957, MAD: 10.8, TND: 3.35, DZD: 144,
  NGN: 1780, ZAR: 20, GHS: 16, KES: 140, EGP: 52,
  JPY: 163, INR: 91, SGD: 1.45, HKD: 8.4, CNY: 7.8,
  AED: 3.97, SAR: 4.05, BRL: 5.5, MXN: 18.5,
};

const SYMBOLS = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'C$',
  XOF: 'FCFA', XAF: 'FCFA', MAD: 'DH', TND: 'TND', DZD: 'DZD',
  NGN: '₦', ZAR: 'R', GHS: 'GH₵', KES: 'KSh', EGP: 'E£',
  JPY: '¥', INR: '₹', SGD: 'S$', HKD: 'HK$', CNY: '¥',
  AED: 'AED', SAR: 'SR', BRL: 'R$', MXN: 'MX$',
};
const SYMBOL_AFTER = ['EUR', 'XOF', 'XAF', 'MAD', 'TND', 'DZD', 'CHF', 'AED', 'SAR'];

const CACHE_KEY = 'pricingCurrency';

/** Montant lisible : 5 903,57 FCFA -> 5 900 ; 19 € -> 19. */
export const roundForDisplay = (amount) => {
  if (amount >= 1000) return Math.round(amount / 100) * 100;
  if (amount >= 100) return Math.round(amount / 10) * 10;
  if (amount >= 20) return Math.round(amount);
  return Math.round(amount * 10) / 10; // 5,3 € plutôt que 5 €
};

// Les deux francs CFA (Afrique de l'Ouest et Afrique centrale) ont la même
// valeur : pour l'affichage, c'est la même monnaie (« FCFA »).
const FAMILLE_CFA = ['XAF', 'XOF'];
export const memeMonnaie = (a, b) => a === b || (FAMILLE_CFA.includes(a) && FAMILLE_CFA.includes(b));

export const formatPriceCurrency = (amount, currency) => {
  const sym = SYMBOLS[currency] || currency;
  const n = Number(amount);
  // 5,30 € plutôt que 5,3 € ; montants entiers sans décimales (3 500 FCFA).
  const formatted = Number.isInteger(n)
    ? n.toLocaleString('fr-FR')
    : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return SYMBOL_AFTER.includes(currency) ? `${formatted} ${sym}` : `${sym}${formatted}`;
};

/** Devine la monnaie d'après la langue du navigateur (« fr-CM »), sinon EUR. */
export const guessCurrencyFromLocale = () => {
  try {
    const langues = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const l of langues) {
      const region = (l || '').split('-')[1];
      if (region && COUNTRY_CURRENCY_MAP[region.toUpperCase()]) return COUNTRY_CURRENCY_MAP[region.toUpperCase()];
    }
  } catch (_) { /* navigateur exotique */ }
  return 'EUR';
};

const readCache = () => {
  try { return sessionStorage.getItem(CACHE_KEY); } catch (_) { return null; }
};
const writeCache = (c) => {
  try { sessionStorage.setItem(CACHE_KEY, c); } catch (_) { /* mode privé */ }
};

/**
 * { currency,
 *   convertPrice(montant, base) -> montant arrondi dans la monnaie du visiteur,
 *                                  ou null si c'est déjà la même monnaie,
 *   formatPrice(montant, base)  -> « 3 500 FCFA » / « 5,3 € » }
 * `base` = monnaie du montant fourni (EUR par défaut ; les tarifs sont en XAF).
 */
export const usePricingCurrency = () => {
  const [currency, setCurrency] = useState(() => readCache() || guessCurrencyFromLocale());

  useEffect(() => {
    if (readCache()) return undefined;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const delai = setTimeout(() => ctrl?.abort(), 3000);
    fetch('https://ipapi.co/json/', ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => r.json())
      .then((data) => {
        const detected = COUNTRY_CURRENCY_MAP[data?.country_code] || 'EUR';
        setCurrency(detected);
        writeCache(detected);
      })
      .catch(() => { /* on garde la devinette par la langue */ })
      .finally(() => clearTimeout(delai));
    return () => { clearTimeout(delai); ctrl?.abort(); };
  }, []);

  const convertPrice = (montant, base = 'EUR') => {
    if (montant == null || memeMonnaie(currency, base)) return null;
    const enEuros = montant / (EUR_RATES[base] || 1);
    return roundForDisplay(enEuros * (EUR_RATES[currency] || 1));
  };
  const formatPrice = (montant, base = 'EUR') => {
    const local = convertPrice(montant, base);
    return local === null ? formatPriceCurrency(montant, base) : formatPriceCurrency(local, currency);
  };

  return { currency, convertPrice, formatPrice };
};
