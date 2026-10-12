import i18n from '../i18n/config';

// Modes de paiement — mêmes codes que Payment.payment_method côté serveur (apps/invoicing/models.py).
// Mobile Money d'abord : c'est le moyen de paiement le plus courant pour nos clients.
// Les libellés sont traduits à l'affichage (invoices:paymentMethodLabels.<code>) ;
// le libellé français reste la valeur par défaut.
const METHODS = [
  ['cash', 'Espèces'],
  ['orange_money', 'Orange Money'],
  ['mtn_momo', 'MTN Mobile Money'],
  ['wave', 'Wave'],
  ['mobile_money', 'Mobile Money (autre)'],
  ['bank_transfer', 'Virement bancaire'],
  ['check', 'Chèque'],
  ['credit_card', 'Carte bancaire'],
  ['other', 'Autre'],
];

// Anciens codes encore présents sur des factures existantes (affichage seulement).
const LEGACY_LABELS = {
  card: 'Carte bancaire', transfer: 'Virement bancaire', cheque: 'Chèque',
  interac: 'Interac', paypal: 'PayPal',
};

const DEFAULT_LABELS = { ...Object.fromEntries(METHODS), ...LEGACY_LABELS };

const translate = (code, t) => {
  const tr = t || ((key, options) => i18n.t(key, options));
  return tr(`invoices:paymentMethodLabels.${code}`, { defaultValue: DEFAULT_LABELS[code] || code });
};

// `label` est calculé dans la langue courante à chaque lecture.
export const PAYMENT_METHODS = METHODS.map(([value]) => ({
  value,
  get label() { return translate(value); },
}));

/** Liste des modes de paiement avec libellés traduits (t de useTranslation, optionnel). */
export const getPaymentMethods = (t) => METHODS.map(([value]) => ({ value, label: translate(value, t) }));

export const paymentMethodLabel = (code, t) => {
  if (!code) return '';
  return DEFAULT_LABELS[code] ? translate(code, t) : code;
};
