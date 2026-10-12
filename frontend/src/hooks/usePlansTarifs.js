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
 * Textes d'une formule dans la langue de l'interface (namespace « subscription »,
 * clé par code de formule), avec repli sur les textes de data/pricingPlans.
 * Les prix et les autres champs ne changent pas.
 */
export const traduirePlan = (t, plan) => {
  if (!plan?.code) return plan;
  const base = `subscription:plans.${plan.code}`;
  const liste = (champ) => {
    const source = plan[champ] || [];
    const v = t(`${base}.${champ}`, { returnObjects: true, defaultValue: source });
    // Même nombre d'éléments que la source, sinon on garde la source.
    return Array.isArray(v) && v.length === source.length ? v : plan[champ];
  };
  return {
    ...plan,
    name: t(`${base}.name`, { defaultValue: plan.name }),
    badge: plan.badge ? t(`${base}.badge`, { defaultValue: plan.badge }) : plan.badge,
    tagline: t(`${base}.tagline`, { defaultValue: plan.tagline }),
    cta: t(`${base}.cta`, { defaultValue: plan.cta }),
    features: liste('features'),
    missing: liste('missing'),
  };
};

/** Nom d'une formule (par son code) dans la langue de l'interface. */
export const nomPlan = (t, code, nom) => (
  code ? t(`subscription:plans.${code}.name`, { defaultValue: nom || code }) : nom
);

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
