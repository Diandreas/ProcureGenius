import { useEffect, useState } from 'react';
import api from '../services/api';

// Réglages TVA de l'organisation (pays, taux du pays, taux par défaut, régime des petites
// entreprises), partagés par tous les composants : une seule requête par compte connecté.
const VIDE = {
  country: '',
  vatRates: [],
  defaultRate: 0,
  vatExempt: false,
  filingPeriod: 'quarterly',
  isCanada: false,
  hasQst: false,
  loaded: false,
};

let cache = null;
let pourJeton = null;
let enCours = null;

function lire(d) {
  const country = (d.country || '').toUpperCase();
  const defaultRate = Number(d.default_tax_rate ?? d.defaultTaxRate ?? 0) || 0;
  let vatRates = (d.vat_rates || []).map(Number).filter((r) => !Number.isNaN(r));
  if (!vatRates.length) vatRates = [defaultRate, 0];
  if (!vatRates.includes(defaultRate)) vatRates = [defaultRate, ...vatRates];
  vatRates = [...new Set(vatRates)];
  return {
    country,
    vatRates,
    defaultRate,
    vatExempt: Boolean(d.vat_exempt_small_business),
    filingPeriod: d.vat_filing_period || 'quarterly',
    isCanada: country === 'CA',
    hasQst: Boolean(d.company_qst_number),
    loaded: true,
  };
}

function charger(forcer = false) {
  const jeton = localStorage.getItem('authToken');
  if (jeton !== pourJeton) { cache = null; pourJeton = jeton; }
  if (cache && !forcer) return Promise.resolve(cache);
  if (enCours) return enCours;
  enCours = api.get('/accounts/organization/settings/')
    .then((r) => { cache = lire(r.data || {}); return cache; })
    .catch(() => cache || { ...VIDE, loaded: true })
    .finally(() => { enCours = null; });
  return enCours;
}

/** Réglages TVA (promesse), pour le code hors rendu. */
export const loadOrgTaxSettings = () => charger();

/** À appeler après l'enregistrement des paramètres de l'organisation. */
export const refreshOrgTaxSettings = () => charger(true);

/**
 * Réglages TVA de l'organisation.
 * { country, vatRates, defaultRate, vatExempt, filingPeriod, isCanada, hasQst, loaded }
 */
export default function useOrgTaxSettings() {
  const [state, setState] = useState(cache || VIDE);
  useEffect(() => {
    let actif = true;
    charger().then((s) => { if (actif) setState(s); });
    return () => { actif = false; };
  }, []);
  return state;
}

/** Part de TVA contenue dans un montant TTC : montant × taux / (100 + taux), arrondie au centime. */
export const vatFromGross = (gross, rate) => {
  const g = parseFloat(gross);
  const r = parseFloat(rate);
  if (!(g > 0) || !(r > 0)) return 0;
  return Math.round(((g * r) / (100 + r)) * 100) / 100;
};

/** Montant de TVA d'un montant HT, arrondi au centime. */
export const vatFromNet = (net, rate) => {
  const n = parseFloat(net);
  const r = parseFloat(rate);
  if (!(n > 0) || !(r > 0)) return 0;
  return Math.round(((n * r) / 100) * 100) / 100;
};
