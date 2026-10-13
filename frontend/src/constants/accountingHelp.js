/**
 * Contenu du tutoriel comptabilité intégré (AccountingTooltip, AccountingHelpDrawer).
 * Les numéros de comptes et la devise des exemples suivent le plan de l'organisation
 * (SYSCOHADA par défaut — marché OHADA ; PCG pour la France / l'Europe ; US et Canada).
 * Les textes sont traduits au rendu (namespace accounting, clés accounting:help.*).
 */

// Comptes d'exemple par référentiel (mêmes rôles que apps/accounting/charts.py)
// Nom du plan et description des classes : accounting:help.plans.<référentiel>.name / .classes
const PLANS = {
  syscohada: {
    cur: 'FCFA', vat: 19.25,
    clients: '411', fournisseurs: '401', banque: '521', caisse: '571', mobile: '552',
    ventes: '701', services: '706', achats: '601', bureau: '6055', salaires: '661', loyer: '622',
    telecom: '628', tvaC: '4431', tvaD: '4452', capital: '101', materiel: '2441',
  },
  pcg: {
    cur: '€', vat: 20,
    clients: '411', fournisseurs: '401', banque: '512', caisse: '530', mobile: '517',
    ventes: '707', services: '706', achats: '607', bureau: '6064', salaires: '641', loyer: '6132',
    telecom: '626', tvaC: '44571', tvaD: '44566', capital: '101', materiel: '2183',
  },
  us_gaap: {
    cur: '$', vat: 0,
    clients: '1200', fournisseurs: '2000', banque: '1010', caisse: '1000', mobile: '1020',
    ventes: '4000', services: '4100', achats: '5000', bureau: '6300', salaires: '6200', loyer: '6000',
    telecom: '6710', tvaC: '2100', tvaD: null, capital: '3000', materiel: '1500',
  },
  ca: {
    cur: '$', vat: 5,
    clients: '1200', fournisseurs: '2000', banque: '1060', caisse: '1000', mobile: '1070',
    ventes: '4000', services: '4100', achats: '5000', bureau: '5400', salaires: '5300', loyer: '5100',
    telecom: '5810', tvaC: '2310', tvaD: '2315', capital: '3000', materiel: '1500',
  },
  procura: {
    cur: 'FCFA', vat: 19.25,
    clients: '4100', fournisseurs: '4010', banque: '5200', caisse: '5100', mobile: '5210',
    ventes: '7500', services: '7100', achats: '6100', bureau: '6300', salaires: '6400', loyer: '6500',
    telecom: '6600', tvaC: '4400', tvaD: null, capital: '1100', materiel: '2300',
  },
};

// Clés du glossaire, dans l'ordre d'affichage (titre : accounting:help.termNames.<clé>)
export const ACCOUNTING_TERM_KEYS = [
  'debit', 'credit', 'journal', 'compte', 'plan_comptable', 'tva', 'balance', 'bilan',
  'compte_de_resultat', 'charges', 'produits', 'immobilisation', 'amortissement', 'grand_livre',
  'lettrage', 'rapprochement', 'capitaux_propres', 'tresorerie', 'resultat',
];

/**
 * @param {string} standard référentiel comptable de l'organisation
 * @param {Function} t fonction de traduction i18next (useTranslation)
 * @param {string} lng langue courante, pour le format des nombres
 */
export function getAccountingHelp(standard = 'syscohada', t, lng = 'fr') {
  const std = PLANS[standard] ? standard : 'syscohada';
  const p = PLANS[std];
  const tr = (key, options) => t(`accounting:help.${key}`, options);
  const locale = ({ en: 'en-US', de: 'de-DE' }[String(lng || 'fr').slice(0, 2)] || 'fr-FR');
  const n = (v) => Math.round(v).toLocaleString(locale);
  const nom = tr(`plans.${std}.name`);
  const classes = tr(`plans.${std}.classes`);
  const big = p.cur === 'FCFA';
  const ht = big ? 100000 : 1000;
  const tva = ht * p.vat / 100;
  const bureauHt = big ? 30000 : 300;
  const bureauTva = bureauHt * p.vat / 100;
  const ordi = big ? 600000 : 1200;
  const m = (v) => `${n(v)} ${p.cur}`;
  const acc = (code, key) => `${code} - ${tr(`accounts.${key}`)}`;
  const venteLines = [
    { account: acc(p.clients, 'clients'), debit: n(ht + tva), credit: '' },
    { account: acc(p.ventes, 'ventes'), debit: '', credit: n(ht) },
  ];
  if (tva) venteLines.push({ account: acc(p.tvaC, 'tvaC'), debit: '', credit: n(tva) });
  const achatLines = [{ account: acc(p.bureau, 'bureau'), debit: n(p.tvaD ? bureauHt : bureauHt + bureauTva), credit: '' }];
  if (p.tvaD && bureauTva) achatLines.push({ account: acc(p.tvaD, 'tvaD'), debit: n(bureauTva), credit: '' });
  achatLines.push({ account: acc(p.mobile, 'mobile'), debit: '', credit: n(bureauHt + bureauTva) });

  const tvaText = p.vat
    ? [
      tr('terms.tva', { vat: p.vat.toLocaleString(locale), account: p.tvaC }),
      p.tvaD ? tr('terms.tvaDeductible', { account: p.tvaD }) : null,
    ].filter(Boolean).join(' ')
    : tr('terms.salesTax', { account: p.tvaC });

  const terms = {
    debit: tr('terms.debit'),
    credit: tr('terms.credit'),
    journal: tr('terms.journal'),
    compte: tr('terms.compte', { plan: nom }),
    plan_comptable: tr('terms.plan_comptable', { plan: nom, classes }),
    tva: tvaText,
    balance: tr('terms.balance'),
    bilan: tr('terms.bilan'),
    compte_de_resultat: tr('terms.compte_de_resultat'),
    charges: tr('terms.charges', { achats: p.achats, salaires: p.salaires, loyer: p.loyer, telecom: p.telecom }),
    produits: tr('terms.produits', { ventes: p.ventes, services: p.services }),
    immobilisation: tr('terms.immobilisation'),
    amortissement: tr('terms.amortissement', { amount: m(ordi), perYear: m(ordi / 3) }),
    grand_livre: tr('terms.grand_livre'),
    lettrage: tr('terms.lettrage'),
    rapprochement: tr('terms.rapprochement'),
    capitaux_propres: tr('terms.capitaux_propres'),
    tresorerie: tr('terms.tresorerie'),
    resultat: tr('terms.resultat'),
  };

  const comptesFrequents = [
    `${p.capital} ${tr('frequent.capital')}`,
    `${p.fournisseurs} ${tr('frequent.fournisseurs')}`,
    `${p.clients} ${tr('frequent.clients')}`,
    `${p.banque} ${tr('frequent.banque')}`,
    `${p.caisse} ${tr('frequent.caisse')}`,
    `${p.mobile} ${tr('frequent.mobile')}`,
    `${p.achats} ${tr('frequent.achats')}`,
    `${p.ventes} ${tr('frequent.ventes')}`,
    `${p.salaires} ${tr('frequent.salaires')}`,
  ];
  if (p.tvaC) comptesFrequents.push(`${p.tvaC} ${tr('accounts.tvaC')}`);
  if (p.tvaD) comptesFrequents.push(`${p.tvaD} ${tr('accounts.tvaD')}`);

  const content = {
    journal_entry: {
      title: tr('content.journal_entry.title'),
      intro: tr('content.journal_entry.intro'),
      currency: p.cur,
      concepts: [
        {
          title: tr('content.journal_entry.doubleEntryTitle'),
          text: tr('content.journal_entry.doubleEntryText', { amount: m(ordi), materiel: p.materiel, banque: p.banque }),
        },
        {
          title: tr('content.journal_entry.whenTitle'),
          text: tr('content.journal_entry.whenText'),
        },
      ],
      examples: [
        {
          label: tva
            ? tr('content.journal_entry.exampleSale', { ht: m(ht), vat: m(tva) })
            : tr('content.journal_entry.exampleSaleNoVat', { ht: m(ht) }),
          lines: venteLines,
        },
        { label: tr('content.journal_entry.examplePurchase', { amount: m(bureauHt + bureauTva) }), lines: achatLines },
        {
          label: tr('content.journal_entry.examplePayment'),
          lines: [
            { account: acc(p.banque, 'banque'), debit: n(ht + tva), credit: '' },
            { account: acc(p.clients, 'clients'), debit: '', credit: n(ht + tva) },
          ],
        },
      ],
      tips: [
        tr('content.journal_entry.tip1'),
        tr('content.journal_entry.tip2'),
        tr('content.journal_entry.tip3'),
      ],
    },

    chart_of_accounts: {
      title: tr('content.chart_of_accounts.title'),
      intro: tr('content.chart_of_accounts.intro', { plan: nom }),
      concepts: [
        { title: tr('content.chart_of_accounts.structureTitle'), text: classes },
        {
          title: tr('content.chart_of_accounts.frequentTitle'),
          text: `${comptesFrequents.join(' · ')}.`,
        },
      ],
      examples: [],
      tips: [
        tr('content.chart_of_accounts.tip1', { account: `${p.clients}DUPONT` }),
        tr('content.chart_of_accounts.tip2'),
        tr('content.chart_of_accounts.tip3'),
      ],
    },

    balance_sheet: {
      title: tr('content.balance_sheet.title'),
      intro: tr('content.balance_sheet.intro'),
      concepts: [
        { title: tr('content.balance_sheet.assetsTitle'), text: tr('content.balance_sheet.assetsText') },
        { title: tr('content.balance_sheet.liabilitiesTitle'), text: tr('content.balance_sheet.liabilitiesText') },
      ],
      examples: [],
      tips: [
        tr('content.balance_sheet.tip1'),
        tr('content.balance_sheet.tip2'),
        tr('content.balance_sheet.tip3'),
      ],
    },

    general_ledger: {
      title: tr('content.general_ledger.title'),
      intro: tr('content.general_ledger.intro'),
      concepts: [
        { title: tr('content.general_ledger.readTitle'), text: tr('content.general_ledger.readText') },
        { title: tr('content.general_ledger.balanceTitle'), text: tr('content.general_ledger.balanceText') },
      ],
      examples: [],
      tips: [
        tr('content.general_ledger.tip1'),
        tr('content.general_ledger.tip2'),
      ],
    },
  };
  return { terms, content, currency: p.cur };
}
