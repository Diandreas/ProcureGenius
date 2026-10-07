import { useEffect, useState } from 'react';
import api from '../services/api';
import { PLANS } from '../data/pricingPlans';

// Une seule requête par chargement de page, partagée par tous les composants.
let enCours = null;
const chargerFormules = () => {
  if (!enCours) {
    enCours = api.get('/subscriptions/plans/')
      .then((r) => r.data?.plans || [])
      .catch(() => { enCours = null; return []; });
  }
  return enCours;
};

/** Fusionne les textes locaux (arguments, fonctionnalités) avec les prix du serveur (Stripe). */
const fusionner = (serveur) => PLANS.map((p) => {
  const s = serveur.find((x) => x.code === p.code);
  // Gratuit et « sur devis » : rien à reprendre de Stripe.
  if (!s || !p.priceMonthly || !(Number(s.price_monthly) > 0)) return p;
  return {
    ...p,
    priceMonthly: Number(s.price_monthly),
    priceYearly: s.yearly_available ? Number(s.price_yearly) : 0,
    yearlyAvailable: Boolean(s.yearly_available),
    currency: s.currency || p.currency,
    seatPrice: Number(s.extra_user_price) || p.seatPrice,
  };
});

/**
 * Formules avec les prix de Stripe.
 * { plans, annuelDisponible, siege: { prix, devise } }
 */
export default function usePlansTarifs() {
  const [plans, setPlans] = useState(PLANS);

  useEffect(() => {
    let vivant = true;
    chargerFormules().then((serveur) => { if (vivant && serveur.length) setPlans(fusionner(serveur)); });
    return () => { vivant = false; };
  }, []);

  const payants = plans.filter((p) => p.priceMonthly > 0);
  const pro = plans.find((p) => p.code === 'pro') || payants[0] || {};
  return {
    plans,
    // L'option annuelle n'est proposée que si chaque formule payante a un prix annuel dans Stripe.
    annuelDisponible: payants.length > 0 && payants.every((p) => p.yearlyAvailable),
    siege: { prix: pro.seatPrice, devise: pro.currency || 'EUR' },
  };
}
