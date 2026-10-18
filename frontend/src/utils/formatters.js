import { format, parseISO } from 'date-fns';
import { fr, enUS, de } from 'date-fns/locale';
import i18n from '../i18n/config';

// Helper pour obtenir la locale date-fns basée sur la langue actuelle
const getDateLocale = () => {
  const currentLang = i18n.language || 'fr';
  if (currentLang.startsWith('en')) return enUS;
  if (currentLang.startsWith('de')) return de;
  return fr;
};

// Allemand : « 18. Oktober 2026 »
const datePattern = () => ((i18n.language || '').startsWith('de') ? 'dd. MMMM yyyy' : 'dd MMMM yyyy');

// Helper pour obtenir le code locale NumberFormat basé sur la langue actuelle
const getNumberLocale = () => {
  const currentLang = i18n.language || 'fr';
  if (currentLang.startsWith('en')) return 'en-CA';
  if (currentLang.startsWith('de')) return 'de-DE';
  return 'fr-CA';
};

export const formatCurrency = (amount, currency = 'CAD') => {
  // Valider et convertir l'amount
  if (amount === null || amount === undefined || amount === '') {
    return new Intl.NumberFormat(getNumberLocale(), {
      style: 'currency',
      currency: currency,
    }).format(0);
  }

  // Convertir en nombre si c'est une chaîne
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Vérifier si c'est un nombre valide
  if (isNaN(numAmount)) {
    console.warn(`formatCurrency: Invalid amount "${amount}", defaulting to 0`);
    return new Intl.NumberFormat(getNumberLocale(), {
      style: 'currency',
      currency: currency,
    }).format(0);
  }

  return new Intl.NumberFormat(getNumberLocale(), {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
};

export const formatDate = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, datePattern(), { locale: getDateLocale() });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, `${datePattern()} HH:mm`, { locale: getDateLocale() });
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

export const getStatusColor = (status) => {
  const statusColors = {
    active: 'success',
    pending: 'warning',
    inactive: 'default',
    blocked: 'error',
    quote: 'secondary',
    draft: 'default',
    sent: 'info',
    pending: 'warning',
    paid: 'success',
    overdue: 'error',
    cancelled: 'error',
    approved: 'success',
    received: 'success',
  };
  return statusColors[status] || 'default';
};

const STATUS_LABELS = {
  fr: {
    active: 'Actif', pending: 'En attente', inactive: 'Inactif', blocked: 'Bloqué', quote: 'Devis',
    draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée',
    approved: 'Approuvé', received: 'Reçu',
  },
  en: {
    active: 'Active', pending: 'Pending', inactive: 'Inactive', blocked: 'Blocked', quote: 'Quote',
    draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled',
    approved: 'Approved', received: 'Received',
  },
  de: {
    active: 'Aktiv', pending: 'Ausstehend', inactive: 'Inaktiv', blocked: 'Gesperrt', quote: 'Angebot',
    draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
    approved: 'Genehmigt', received: 'Erhalten',
  },
};

export const getStatusLabel = (status) => {
  const lang = (i18n.language || 'fr').slice(0, 2);
  const labels = STATUS_LABELS[lang] || STATUS_LABELS.fr;
  return labels[status] || STATUS_LABELS.fr[status] || status;
};

export const getPerformanceBadgeColor = (badgeClass) => {
  const colorMap = {
    success: 'success',
    warning: 'warning',
    danger: 'error',
    info: 'info',
    primary: 'primary',
    secondary: 'secondary',
  };
  return colorMap[badgeClass] || 'default';
};

export const parseRating = (rating) => {
  if (rating === null || rating === undefined) return 0;
  const parsed = typeof rating === 'string' ? parseFloat(rating) : rating;
  return isNaN(parsed) ? 0 : parsed;
};