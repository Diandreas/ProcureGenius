// Source unique des plans tarifaires — partagée par la page publique (/pricing)
// et le pricing interne (/subscription/plans) pour rester synchronisées.
// Charte : free / pro / business / enterprise.
//
// LES PRIX VIENNENT DE STRIPE : le serveur les recopie (sync_stripe_prices, toutes
// les heures) et les pages les lisent via hooks/usePlansTarifs.js. Les montants
// ci-dessous ne servent que de secours si l'API ne répond pas : garder les
// derniers prix connus. {siege} est remplacé par le prix d'un utilisateur en plus.

export const PLANS = [
  {
    code: 'free',
    name: 'Libre',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'EUR',
    badge: null,
    tagline: 'Pour démarrer et découvrir Procura, sans engagement.',
    cta: 'Commencer',
    includedUsers: 1,
    features: ['1 utilisateur', '30 factures / mois', '20 clients', '50 produits', 'Tableau de bord', 'Export PDF'],
    missing: ['Bons de commande', 'Fournisseurs', 'Comptabilité', 'Contrats', 'Assistant IA'],
  },
  {
    code: 'pro',
    name: 'Pro',
    priceMonthly: 5.3,
    priceYearly: 0,
    yearlyAvailable: false,
    currency: 'EUR',
    seatPrice: 3.5,
    badge: 'Le plus choisi',
    tagline: 'Pour les PME qui veulent travailler vite et bien.',
    cta: 'Choisir Pro',
    includedUsers: 2,
    features: [
      '2 utilisateurs inclus (+{siege}/utilisateur)',
      'Factures, clients & produits illimités',
      'Bons de commande & fournisseurs illimités',
      'Comptabilité de base (journal, écritures)',
      'Contrats',
      'Assistant IA — 100 requêtes / mois',
      'Sans publicité',
    ],
    missing: ['Comptabilité avancée (SIG, bilan)', 'Analyse des marges', 'Prévision de réappro', 'E-Sourcing'],
  },
  {
    code: 'business',
    name: 'Business',
    priceMonthly: 15,
    priceYearly: 0,
    yearlyAvailable: false,
    currency: 'EUR',
    seatPrice: 3.5,
    badge: 'Le plus complet',
    tagline: 'Pour les équipes qui pilotent leur activité de bout en bout.',
    cta: 'Choisir Business',
    includedUsers: 10,
    features: [
      '10 utilisateurs inclus (+{siege}/utilisateur)',
      'Tout le plan Pro, sans limites',
      'Comptabilité complète (SIG, bilan, compte de résultat)',
      'Analyse des marges & bénéfice brut',
      'Prévision de réapprovisionnement',
      'E-Sourcing & appels d’offres',
      'Assistant IA illimité',
      'Support prioritaire + onboarding dédié',
      'Stockage 50 Go',
    ],
    missing: [],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    priceYearly: null,
    currency: 'EUR',
    badge: null,
    tagline: 'Déploiement sur mesure pour les grandes structures.',
    cta: 'Nous contacter',
    features: ['Tout Business inclus', 'Onboarding dédié', 'Intégrations sur mesure', 'SLA garanti', 'Account manager'],
    missing: [],
  },
];

/** Remplace {siege} par le prix formaté d'un utilisateur supplémentaire. */
export const avecPrixSiege = (texte, prixSiege) => (texte || '').replace('{siege}', prixSiege || '');

/** « euros », « francs CFA »… pour les phrases du type « facturé en … ». */
export const nomDevise = (code) => ({ EUR: 'euros', XAF: 'francs CFA', XOF: 'francs CFA', USD: 'dollars' }[code] || code);

// Plan choisi sur la page Tarifs avant l'inscription, repris par l'écran
// d'accueil (OnboardingSetup) pour présélectionner la bonne formule.
export const PLAN_CHOISI_KEY = 'procura_plan_choisi';
