import { useEffect } from 'react';
import useOrgTaxSettings from './useOrgTaxSettings';
import { toNumber } from '../utils/vat';

// Réglages TVA de l'organisation pour les factures. S'appuie sur useOrgTaxSettings (une seule
// requête partagée avec bons de commande et dépenses) et garde la dernière valeur connue sur
// l'appareil pour fonctionner hors ligne (formulaire et PDF local).
const CACHE_KEY = 'procura_vat_settings';
const DEFAUT = { vatRates: [], defaultTaxRate: 0, vatExempt: false, country: '', vatNumber: '', taxNumber: '', loaded: false };

const lireCache = () => {
  try {
    const brut = localStorage.getItem(CACHE_KEY);
    return brut ? { ...DEFAUT, ...JSON.parse(brut), loaded: true } : null;
  } catch (e) {
    return null;
  }
};

const ecrireCache = (valeur) => {
  try {
    const ancien = lireCache() || {};
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...ancien, ...valeur, loaded: true }));
  } catch (e) { /* stockage indisponible */ }
};

/** Réglages bruts de GET /accounts/organization/settings/ -> réglages TVA (et les garde sur l'appareil). */
export const normaliser = (d) => {
  const rates = (Array.isArray(d.vat_rates) ? d.vat_rates : []).map(toNumber);
  const defaultTaxRate = toNumber(d.default_tax_rate);
  if (!rates.some((r) => r === defaultTaxRate)) rates.unshift(defaultTaxRate);
  if (!rates.includes(0)) rates.push(0);
  const valeur = {
    vatRates: rates,
    defaultTaxRate,
    vatExempt: Boolean(d.vat_exempt_small_business),
    country: (d.country || '').toUpperCase(),
    // Identifiants fiscaux du vendeur (USt-IdNr. / Steuernummer), repris par le PDF hors ligne
    vatNumber: d.company_vat_number || '',
    taxNumber: d.company_tax_number || '',
    loaded: true,
  };
  ecrireCache(valeur);
  return valeur;
};

/** Derniers réglages TVA connus sur l'appareil, sans requête : pour le PDF hors ligne. */
export const getCachedVatSettings = () => lireCache();

/**
 * @returns {{ vatRates: number[], defaultTaxRate: number, vatExempt: boolean, country: string, loaded: boolean }}
 */
export default function useVatSettings() {
  const s = useOrgTaxSettings();
  // Réponse reçue : useOrgTaxSettings donne toujours au moins un taux ; liste vide = requête échouée
  const recu = s.loaded && s.vatRates.length > 0;
  const valeur = recu
    ? {
      vatRates: s.vatRates.map(toNumber),
      defaultTaxRate: toNumber(s.defaultRate),
      vatExempt: Boolean(s.vatExempt),
      country: s.country || '',
      loaded: true,
    }
    : (s.loaded ? (lireCache() || { ...DEFAUT, vatRates: [0], loaded: true }) : DEFAUT);

  useEffect(() => {
    if (recu) ecrireCache(valeur);
  }, [recu, valeur.vatRates.join('|'), valeur.defaultTaxRate, valeur.vatExempt, valeur.country]); // eslint-disable-line react-hooks/exhaustive-deps

  return valeur;
}
