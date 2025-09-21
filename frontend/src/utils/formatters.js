import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatCurrency = (amount, currency = 'CAD') => {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
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