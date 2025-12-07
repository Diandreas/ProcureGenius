/**
 * Utilitaires pour gérer les devises et leurs symboles
 */

// Mapping des codes de devises vers leurs symboles
export const CURRENCY_SYMBOLS = {
  'CAD': 'CA$',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'XAF': 'FCFA',
  'XOF': 'FCFA',
  'MAD': 'DH',
  'TND': 'DT',
  'NGN': '₦',
};

// Position du symbole (avant ou après le montant)
export const CURRENCY_POSITION = {
  'CAD': 'before',
  'USD': 'before',
  'EUR': 'after',
  'GBP': 'before',
  'XAF': 'after',
  'XOF': 'after',
  'MAD': 'after',
  'TND': 'after',
  'NGN': 'before',
};

/**
 * Récupère le symbole de la devise
 * @param {string} currencyCode - Code de la devise (ex: 'CAD', 'EUR')
 * @returns {string} Symbole de la devise
 */
export const getCurrencySymbol = (currencyCode) => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Formate un montant avec le symbole de la devise
 * @param {number} amount - Montant à formater
 * @param {string} currencyCode - Code de la devise
 * @param {number} decimals - Nombre de décimales (défaut: 2)
 * @returns {string} Montant formaté avec symbole
 */
export const formatCurrency = (amount, currencyCode = 'CAD', decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }

  const symbol = getCurrencySymbol(currencyCode);
  const position = CURRENCY_POSITION[currencyCode] || 'before';

  // Formater le nombre avec séparateurs de milliers
  const formattedAmount = Number(amount).toLocaleString('fr-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Placer le symbole avant ou après
  if (position === 'after') {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol} ${formattedAmount}`;
  }
};

/**
 * Formate un montant de manière compacte (K, M, etc.)
 * @param {number} amount - Montant à formater
 * @param {string} currencyCode - Code de la devise
 * @returns {string} Montant formaté de manière compacte
 */
export const formatCurrencyCompact = (amount, currencyCode = 'CAD') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }

  const symbol = getCurrencySymbol(currencyCode);
  const position = CURRENCY_POSITION[currencyCode] || 'before';

  let formattedAmount;
  if (amount >= 1000000) {
    formattedAmount = (amount / 1000000).toFixed(1) + 'M';
  } else if (amount >= 1000) {
    formattedAmount = (amount / 1000).toFixed(1) + 'K';
  } else {
    formattedAmount = amount.toFixed(0);
  }

  if (position === 'after') {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol} ${formattedAmount}`;
  }
};

/**
 * Parse un montant formaté en nombre
 * @param {string} formattedAmount - Montant formaté
 * @returns {number} Montant en nombre
 */
export const parseCurrency = (formattedAmount) => {
  if (!formattedAmount) return 0;

  // Enlever tous les symboles, espaces et lettres
  const cleaned = formattedAmount.replace(/[^0-9.,]/g, '');
  // Remplacer virgule par point pour le parsing
  const normalized = cleaned.replace(',', '.');

  return parseFloat(normalized) || 0;
};

export default {
  getCurrencySymbol,
  formatCurrency,
  formatCurrencyCompact,
  parseCurrency,
  CURRENCY_SYMBOLS,
  CURRENCY_POSITION,
};
