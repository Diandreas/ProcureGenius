/**
 * Contenu du tutoriel comptabilité intégré (AccountingTooltip, AccountingHelpDrawer).
 * Les numéros de comptes et la devise des exemples suivent le plan de l'organisation
 * (SYSCOHADA par défaut — marché OHADA ; PCG pour la France / l'Europe ; US et Canada).
 */

// Comptes d'exemple par référentiel (mêmes rôles que apps/accounting/charts.py)
const PLANS = {
  syscohada: {
    nom: 'le plan SYSCOHADA (OHADA)', cur: 'FCFA', vat: 19.25,
    clients: '411', fournisseurs: '401', banque: '521', caisse: '571', mobile: '552',
    ventes: '701', services: '706', achats: '601', bureau: '6055', salaires: '661', loyer: '622',
    telecom: '628', tvaC: '4431', tvaD: '4452', capital: '101', materiel: '2441',
    classes: 'Classe 1 : Capitaux | 2 : Immobilisations | 3 : Stocks | 4 : Tiers (clients, fournisseurs, État) | 5 : Trésorerie (banque, caisse, Mobile Money) | 6 : Charges | 7 : Produits | 8 : Hors activités ordinaires.',
  },
  pcg: {
    nom: 'le Plan comptable général (PCG)', cur: '€', vat: 20,
    clients: '411', fournisseurs: '401', banque: '512', caisse: '530', mobile: '517',
    ventes: '707', services: '706', achats: '607', bureau: '6064', salaires: '641', loyer: '6132',
    telecom: '626', tvaC: '44571', tvaD: '44566', capital: '101', materiel: '2183',
    classes: 'Classe 1 : Capitaux | 2 : Immobilisations | 3 : Stocks | 4 : Tiers | 5 : Financiers (banque, caisse) | 6 : Charges | 7 : Produits.',
  },
  us_gaap: {
    nom: 'le plan US GAAP', cur: '$', vat: 0,
    clients: '1200', fournisseurs: '2000', banque: '1010', caisse: '1000', mobile: '1020',
    ventes: '4000', services: '4100', achats: '5000', bureau: '6300', salaires: '6200', loyer: '6000',
    telecom: '6710', tvaC: '2100', tvaD: null, capital: '3000', materiel: '1500',
    classes: '1xxx : Actifs | 2xxx : Dettes | 3xxx : Capitaux propres | 4xxx : Produits | 5xxx : Coût des ventes | 6xxx-7xxx : Charges.',
  },
  ca: {
    nom: 'le plan canadien (ASPE)', cur: '$', vat: 5,
    clients: '1200', fournisseurs: '2000', banque: '1060', caisse: '1000', mobile: '1070',
    ventes: '4000', services: '4100', achats: '5000', bureau: '5400', salaires: '5300', loyer: '5100',
    telecom: '5810', tvaC: '2310', tvaD: '2315', capital: '3000', materiel: '1500',
    classes: '1xxx : Actifs | 2xxx : Passifs | 3xxx : Capitaux propres | 4xxx : Produits | 5xxx : Charges.',
  },
  procura: {
    nom: 'le plan Procura', cur: 'FCFA', vat: 19.25,
    clients: '4100', fournisseurs: '4010', banque: '5200', caisse: '5100', mobile: '5210',
    ventes: '7500', services: '7100', achats: '6100', bureau: '6300', salaires: '6400', loyer: '6500',
    telecom: '6600', tvaC: '4400', tvaD: null, capital: '1100', materiel: '2300',
    classes: 'Classe 1 : Capitaux | 2 : Immobilisations | 4 : Tiers | 5 : Trésorerie | 6 : Charges | 7 : Produits.',
  },
};

const n = (v) => Math.round(v).toLocaleString('fr-FR');

export function getAccountingHelp(standard = 'syscohada') {
  const p = PLANS[standard] || PLANS.syscohada;
  const big = p.cur === 'FCFA';
  const ht = big ? 100000 : 1000;
  const tva = ht * p.vat / 100;
  const bureauHt = big ? 30000 : 300;
  const bureauTva = bureauHt * p.vat / 100;
  const ordi = big ? 600000 : 1200;
  const m = (v) => `${n(v)} ${p.cur}`;
  const venteLines = [
    { account: `${p.clients} - Clients`, debit: n(ht + tva), credit: '' },
    { account: `${p.ventes} - Ventes de marchandises`, debit: '', credit: n(ht) },
  ];
  if (tva) venteLines.push({ account: `${p.tvaC} - TVA collectée`, debit: '', credit: n(tva) });
  const achatLines = [{ account: `${p.bureau} - Fournitures de bureau`, debit: n(p.tvaD ? bureauHt : bureauHt + bureauTva), credit: '' }];
  if (p.tvaD && bureauTva) achatLines.push({ account: `${p.tvaD} - TVA récupérable`, debit: n(bureauTva), credit: '' });
  achatLines.push({ account: `${p.mobile} - Mobile Money`, debit: '', credit: n(bureauHt + bureauTva) });

  const terms = {
    debit: "Débit : entrée de valeur dans un compte. Pour un compte d'actif (banque, stocks), débiter = augmenter. Pour un compte de passif, débiter = diminuer.",
    credit: "Crédit : sortie de valeur d'un compte. Pour un compte d'actif, créditer = diminuer. Pour un compte de passif ou capitaux propres, créditer = augmenter.",
    journal: "Journal : registre chronologique où l'on enregistre toutes les opérations comptables. Chaque écriture doit être équilibrée (Total Débit = Total Crédit).",
    compte: `Compte comptable : case numérotée qui suit l'évolution d'un élément (banque, TVA, client, fournisseur…). Votre entreprise utilise ${p.nom}.`,
    plan_comptable: `Plan comptable : liste normalisée des comptes. Votre entreprise utilise ${p.nom}. ${p.classes}`,
    tva: p.vat
      ? `TVA : taxe collectée pour l'État (${String(p.vat).replace('.', ',')} % chez vous). TVA collectée (compte ${p.tvaC}) : ce que vous devez à l'État.${p.tvaD ? ` TVA récupérable (compte ${p.tvaD}) : ce que vous pouvez déduire.` : ''}`
      : `Taxe sur les ventes : collectée pour l'administration fiscale (compte ${p.tvaC}).`,
    balance: "Balance générale : tableau qui récapitule tous les comptes avec leur solde débiteur ou créditeur. Permet de vérifier l'équilibre de la comptabilité.",
    bilan: "Bilan : photographie du patrimoine à une date donnée. Actif = ce que l'entreprise possède. Passif = comment c'est financé (dettes + capitaux propres).",
    compte_de_resultat: "Compte de résultat : film de l'activité sur une période. Produits (revenus) - Charges (dépenses) = Résultat net (bénéfice ou perte).",
    charges: `Charges : dépenses de l'entreprise. Achats de marchandises (${p.achats}), Salaires (${p.salaires}), Loyer (${p.loyer}), Téléphone (${p.telecom})…`,
    produits: `Produits : revenus de l'entreprise. Ventes de marchandises (${p.ventes}), Services vendus (${p.services})…`,
    immobilisation: "Immobilisation : bien durable utilisé plus d'un an (ordinateur, véhicule, local). S'amortit progressivement sur sa durée de vie utile.",
    amortissement: `Amortissement : constatation de la perte de valeur d'une immobilisation. Exemple : ordinateur de ${m(ordi)} sur 3 ans = ${m(ordi / 3)} de charge par an.`,
    grand_livre: "Grand Livre : détail de tous les mouvements pour chaque compte, classés par compte. Permet de retracer l'historique complet d'un compte.",
    lettrage: "Lettrage : opération qui consiste à rapprocher les écritures d'un compte client/fournisseur avec les règlements correspondants.",
    rapprochement: "Rapprochement bancaire : comparaison entre le relevé bancaire (ou Mobile Money) et la comptabilité pour identifier les écarts.",
    capitaux_propres: "Capitaux propres : financement apporté par les associés + résultats accumulés. Capital social + Réserves + Résultat de l'exercice.",
    tresorerie: 'Trésorerie : ensemble des liquidités disponibles (banque + caisse + Mobile Money). Un bilan sain = trésorerie positive.',
    resultat: 'Résultat net = Total Produits - Total Charges. Positif = bénéfice. Négatif = perte. Vient alimenter les capitaux propres au bilan.',
  };

  const content = {
    journal_entry: {
      title: 'Saisir une écriture comptable',
      intro: "Une écriture comptable enregistre un événement économique. La règle d'or : Total Débit = Total Crédit.",
      currency: p.cur,
      concepts: [
        {
          title: 'La règle de la partie double',
          text: `Toute opération affecte au moins deux comptes en sens inverse. Si vous achetez un ordinateur de ${m(ordi)} payé par banque : vous débitez le compte Matériel (${p.materiel}) et créditez le compte Banque (${p.banque}).`,
        },
        {
          title: 'Quand débiter, quand créditer ?',
          text: "Comptes d'Actif (banque, caisse, Mobile Money, stocks, clients) : Débit = augmentation, Crédit = diminution. Comptes de Passif et Produits : Débit = diminution, Crédit = augmentation.",
        },
      ],
      examples: [
        { label: `Vente de marchandises ${m(ht)} HT${tva ? ` + TVA ${m(tva)}` : ''} au client Dupont`, lines: venteLines },
        { label: `Achat de fournitures de bureau ${m(bureauHt + bureauTva)} payé par Mobile Money`, lines: achatLines },
        {
          label: 'Règlement du client Dupont reçu en banque',
          lines: [
            { account: `${p.banque} - Banque`, debit: n(ht + tva), credit: '' },
            { account: `${p.clients} - Clients`, debit: '', credit: n(ht + tva) },
          ],
        },
      ],
      tips: [
        "Si l'écriture n'est pas équilibrée, le système vous le signale en rouge.",
        "Les factures, paiements et réceptions de commandes créés dans Procura passent leurs écritures automatiquement.",
        'Choisissez le journal adapté : Achats (ACH), Ventes (VTE), Banque (BNQ), Caisse et Mobile Money (CAI), Opérations diverses (OD).',
      ],
    },

    chart_of_accounts: {
      title: 'Plan comptable — guide rapide',
      intro: `Votre entreprise utilise ${p.nom}.`,
      concepts: [
        { title: 'Structure du numéro de compte', text: p.classes },
        {
          title: 'Comptes fréquents en PME',
          text: `${p.capital} Capital · ${p.fournisseurs} Fournisseurs · ${p.clients} Clients · ${p.banque} Banque · ${p.caisse} Caisse · ${p.mobile} Mobile Money · ${p.achats} Achats · ${p.ventes} Ventes · ${p.salaires} Salaires${p.tvaC ? ` · ${p.tvaC} TVA collectée` : ''}${p.tvaD ? ` · ${p.tvaD} TVA récupérable` : ''}.`,
        },
      ],
      examples: [],
      tips: [
        `Créez des sous-comptes (ex : ${p.clients}DUPONT) pour suivre chaque client individuellement.`,
        "Les comptes de charges et de produits sont remis à zéro en fin d'exercice (résultat).",
        'Un compte est dit "soldé" quand son total débit = total crédit.',
      ],
    },

    balance_sheet: {
      title: 'Comprendre le Bilan',
      intro: "Le bilan est une photographie du patrimoine de l'entreprise à une date précise : Actif d'un côté, Passif de l'autre.",
      concepts: [
        {
          title: "Actif : ce que l'entreprise possède",
          text: 'Actif immobilisé : biens durables (machines, véhicules). Actif circulant : stocks, créances clients (argent attendu), trésorerie (banque, caisse, Mobile Money).',
        },
        {
          title: "Passif : comment c'est financé",
          text: "Capitaux propres : apport des associés + bénéfices accumulés. Dettes financières : emprunts bancaires. Dettes d'exploitation : fournisseurs à payer, TVA et cotisations à reverser.",
        },
      ],
      examples: [],
      tips: [
        "Bilan toujours équilibré : Total Actif = Total Passif. Si ce n'est pas le cas, il y a une erreur.",
        'Un ratio Actif circulant / Dettes court terme > 1 signifie que vous pouvez payer vos dettes immédiates.',
        'Le résultat du compte de résultat se retrouve dans les capitaux propres au bilan.',
      ],
    },

    general_ledger: {
      title: 'Grand Livre — à quoi ça sert ?',
      intro: "Le Grand Livre regroupe toutes les écritures comptables classées par compte. C'est l'outil de référence pour retrouver une opération précise.",
      concepts: [
        {
          title: 'Comment lire une ligne du Grand Livre',
          text: 'Chaque ligne = une écriture dans un journal. Vous voyez la date, le libellé, le montant au débit ou crédit, et le solde cumulé du compte.',
        },
        {
          title: 'Solde débiteur vs créditeur',
          text: "Solde débiteur : normal pour Banque, Caisse, Clients, Stocks. Solde créditeur : normal pour Fournisseurs, TVA collectée, Capital.",
        },
      ],
      examples: [],
      tips: [
        "Filtrez par compte pour voir tout l'historique d'un client ou fournisseur.",
        'Un compte client soldé = toutes les factures ont été réglées.',
      ],
    },
  };
  return { terms, content, currency: p.cur };
}

// Version par défaut (SYSCOHADA, FCFA) pour les composants qui n'ont pas le référentiel.
const DEFAULT = getAccountingHelp('syscohada');
export const ACCOUNTING_TERMS = DEFAULT.terms;
export const ACCOUNTING_HELP_CONTENT = DEFAULT.content;
