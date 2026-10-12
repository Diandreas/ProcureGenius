import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../utils/currency';

// Devise de l'organisation, partagée par tous les composants : une seule requête
// au chargement (et après un changement dans les paramètres), au lieu d'une
// requête toutes les 30 s par composant.
const DEFAUT = 'XAF'; // marché Afrique
let devise = null;
let pourJeton = null; // la devise appartient à l'organisation du compte connecté
let enCours = null;
const abonnes = new Set();

function charger(forcer = false) {
  const jeton = localStorage.getItem('authToken');
  if (jeton !== pourJeton) { devise = null; pourJeton = jeton; }
  if (enCours) return enCours;
  if (devise && !forcer) return Promise.resolve(devise);
  enCours = api.get('/accounts/organization/settings/')
    .then((r) => r.data.defaultCurrency || r.data.default_currency || DEFAUT)
    .catch(() => devise || DEFAUT)
    .then((d) => {
      devise = d;
      abonnes.forEach((cb) => cb(d));
      return d;
    })
    .finally(() => { enCours = null; });
  return enCours;
}

if (typeof window !== 'undefined') {
  // Changement de devise dans les paramètres
  window.addEventListener('currency-changed', () => { charger(true); });
}

/**
 * Hook pour gérer la devise de l'organisation
 * Récupère automatiquement la devise depuis les paramètres
 */
export const useCurrency = () => {
  const [currency, setCurrency] = useState(devise || DEFAUT);
  const [loading, setLoading] = useState(!devise);

  useEffect(() => {
    const maj = (d) => { setCurrency(d); setLoading(false); };
    abonnes.add(maj);
    if (localStorage.getItem('authToken')) charger().then(maj);
    else setLoading(false);
    return () => { abonnes.delete(maj); };
  }, []);

  /**
   * Formate un montant avec la devise de l'organisation
   */
  const format = (amount, decimals = 2) => {
    return formatCurrency(amount, currency, decimals);
  };

  /**
   * Formate un montant de manière compacte (K, M)
   */
  const formatCompact = (amount) => {
    return formatCurrencyCompact(amount, currency);
  };

  /**
   * Récupère juste le symbole
   */
  const symbol = getCurrencySymbol(currency);

  return {
    currency,
    symbol,
    format,
    formatCompact,
    loading,
  };
};

export default useCurrency;

/** Devise courante, pour les formateurs définis hors d'un composant. */
export const deviseActuelle = () => devise || DEFAUT;
