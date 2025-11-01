/**
 * Currency Service - Frontend
 * Handles currency formatting and conversions
 * Mirrors backend currency functionality
 */
import api from './api';

// Currency symbols (matches backend)
const CURRENCY_SYMBOLS = {
  'EUR': '€',
  'USD': '$',
  'GBP': '£',
  'CAD': 'C$',
  'CHF': 'CHF',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': 'A$',
  'NZD': 'NZ$',
  'XOF': 'FCFA',
  'XAF': 'FCFA',
  'MAD': 'DH',
  'TND': 'TND',
  'DZD': 'DZD',
  'MRU': 'UM',
  'KMF': 'CF',
  'ZAR': 'R',
  'NGN': '₦',
  'KES': 'KSh',
  'GHS': 'GH₵',
  'UGX': 'USh',
  'TZS': 'TSh',
  'EGP': 'E£',
  'ETB': 'Br',
  'ZMW': 'ZK',
  'BWP': 'P',
  'AED': 'AED',
  'SAR': 'SR',
  'QAR': 'QR',
  'ILS': '₪',
  'TRY': '₺',
  'INR': '₹',
  'SGD': 'S$',
  'HKD': 'HK$',
  'MYR': 'RM',
  'THB': '฿',
  'PHP': '₱',
  'BRL': 'R$',
  'MXN': 'MX$',
  'ARS': 'AR$',
  'CLP': 'CL$',
};

// Currencies without decimal places
const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'CLP', 'XOF', 'XAF', 'KMF', 'UGX'];

// Symbol position (before or after amount)
const SYMBOL_POSITION = {
  'EUR': 'after',   // 100,00 €
  'USD': 'before',  // $100.00
  'GBP': 'before',  // £100.00
  'CAD': 'before',  // C$100.00
  'CHF': 'after',   // 100.00 CHF
  'JPY': 'before',  // ¥100
  'CNY': 'before',  // ¥100.00
  'XOF': 'after',   // 100 FCFA
  'XAF': 'after',   // 100 FCFA
  'MAD': 'after',   // 100,00 DH
  'TND': 'after',   // 100,000 TND
  'DZD': 'after',   // 100,00 DZD
  'ZAR': 'before',  // R100.00
  'NGN': 'before',  // ₦100.00
  'KES': 'before',  // KSh100.00
  'GHS': 'before',  // GH₵100.00
};

// Currency formats (decimal and thousands separators)
const CURRENCY_FORMATS = {
  'EUR': { decimal: ',', thousands: '.' },   // 1.234,56 €
  'USD': { decimal: '.', thousands: ',' },   // $1,234.56
  'GBP': { decimal: '.', thousands: ',' },   // £1,234.56
  'XOF': { decimal: ',', thousands: ' ' },   // 1 234 FCFA
  'XAF': { decimal: ',', thousands: ' ' },   // 1 234 FCFA
  'MAD': { decimal: ',', thousands: ' ' },   // 1 234,56 DH
  'TND': { decimal: ',', thousands: ' ' },   // 1 234,567 TND
  'CHF': { decimal: '.', thousands: "'" },   // 1'234.56 CHF
};

const currencyService = {
  /**
   * Get list of all available currencies from API
   */
  getCurrencies: async () => {
    const response = await api.get('/core/currencies/');
    return response.data;
  },

  /**
   * Get detailed info about a specific currency from API
   */
  getCurrencyInfo: async (currencyCode) => {
    const response = await api.get(`/core/currencies/${currencyCode}/`);
    return response.data;
  },

  /**
   * Get user's preferred currency from API
   */
  getUserCurrency: async () => {
    const response = await api.get('/core/user/currency/');
    return response.data;
  },

  /**
   * Set user's preferred currency via API
   */
  setUserCurrency: async (currencyCode) => {
    const response = await api.put('/core/user/currency/', { currency: currencyCode });
    return response.data;
  },

  /**
   * Format currency locally (fast, no API call)
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - ISO currency code (EUR, USD, XOF, etc.)
   * @returns {string} - Formatted currency string
   */
  formatCurrency: (amount, currencyCode = 'EUR') => {
    const code = currencyCode.toUpperCase();

    // Get currency info
    const symbol = CURRENCY_SYMBOLS[code] || code;
    const position = SYMBOL_POSITION[code] || 'before';
    const format = CURRENCY_FORMATS[code] || { decimal: '.', thousands: ',' };

    // Determine decimal places
    const decimals = ZERO_DECIMAL_CURRENCIES.includes(code) ? 0 : 2;

    // Round amount
    const roundedAmount = decimals === 0 ? Math.round(amount) : amount;

    // Format number
    const fixedAmount = decimals === 0
      ? roundedAmount.toString()
      : roundedAmount.toFixed(decimals);

    // Split integer and decimal parts
    const parts = fixedAmount.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousands separator
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousands);

    // Combine with decimal separator
    const formattedNumber = decimalPart
      ? `${integerPart}${format.decimal}${decimalPart}`
      : integerPart;

    // Add currency symbol
    if (position === 'after') {
      return `${formattedNumber} ${symbol}`;
    } else {
      return `${symbol}${formattedNumber}`;
    }
  },

  /**
   * Get currency symbol only
   */
  getSymbol: (currencyCode) => {
    return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
  },

  /**
   * Format using backend API (for complex scenarios)
   */
  formatCurrencyAPI: async (amount, currencyCode) => {
    const response = await api.post('/core/currencies/format/', {
      amount,
      currency: currencyCode
    });
    return response.data.formatted;
  },

  /**
   * Get default currency from localStorage or use EUR
   */
  getDefaultCurrency: () => {
    return localStorage.getItem('preferredCurrency') || 'EUR';
  },

  /**
   * Save default currency to localStorage
   */
  setDefaultCurrency: (currencyCode) => {
    localStorage.setItem('preferredCurrency', currencyCode.toUpperCase());
  },
};

export default currencyService;

// Also export formatCurrency as named export for convenience
export const formatCurrency = currencyService.formatCurrency;
