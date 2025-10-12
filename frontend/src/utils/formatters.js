import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatCurrency = (amount, currency = 'CAD') => {
  // Valider et convertir l'amount
  if (amount === null || amount === undefined || amount === '') {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency,
    }).format(0);
  }

  // Convertir en nombre si c'est une chaîne
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Vérifier si c'est un nombre valide
  if (isNaN(numAmount)) {
    console.warn(`formatCurrency: Invalid amount "${amount}", defaulting to 0`);
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency,
    }).format(0);
  }

  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
};

export const formatDate = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd MMMM yyyy', { locale: fr });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd MMMM yyyy HH:mm', { locale: fr });
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
    draft: 'default',
    sent: 'info',
    paid: 'success',
    cancelled: 'error',
    approved: 'success',
    received: 'success',
  };
  return statusColors[status] || 'default';
};

export const getStatusLabel = (status) => {
  const statusLabels = {
    active: 'Actif',
    pending: 'En attente',
    inactive: 'Inactif',
    blocked: 'Bloqué',
    draft: 'Brouillon',
    sent: 'Envoyé',
    paid: 'Payé',
    cancelled: 'Annulé',
    approved: 'Approuvé',
    received: 'Reçu',
  };
  return statusLabels[status] || status;
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