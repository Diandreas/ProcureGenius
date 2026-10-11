// Modes de paiement — mêmes codes que Payment.payment_method côté serveur (apps/invoicing/models.py).
// Mobile Money d'abord : c'est le moyen de paiement le plus courant pour nos clients.
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_momo', label: 'MTN Mobile Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'mobile_money', label: 'Mobile Money (autre)' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'check', label: 'Chèque' },
  { value: 'credit_card', label: 'Carte bancaire' },
  { value: 'other', label: 'Autre' },
];

// Anciens codes encore présents sur des factures existantes (affichage seulement).
const LEGACY_LABELS = {
  card: 'Carte bancaire', transfer: 'Virement bancaire', cheque: 'Chèque',
  interac: 'Interac', paypal: 'PayPal',
};

export const paymentMethodLabel = (code) => {
  if (!code) return '';
  const m = PAYMENT_METHODS.find((p) => p.value === code);
  return m ? m.label : LEGACY_LABELS[code] || code;
};
