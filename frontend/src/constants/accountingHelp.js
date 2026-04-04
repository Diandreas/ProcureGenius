/**
 * Contenu statique pour le tutorial comptabilité intégré dans l'interface.
 * Utilisé par AccountingTooltip et AccountingHelpDrawer.
 */

export const ACCOUNTING_TERMS = {
  debit: 'Débit : entrée de valeur dans un compte. Pour un compte d\'actif (banque, stocks), débiter = augmenter. Pour un compte de passif, débiter = diminuer.',
  credit: 'Crédit : sortie de valeur d\'un compte. Pour un compte d\'actif, créditer = diminuer. Pour un compte de passif ou capitaux propres, créditer = augmenter.',
  journal: 'Journal : registre chronologique où l\'on enregistre toutes les opérations comptables. Chaque écriture doit être équilibrée (Total Débit = Total Crédit).',
  compte: 'Compte comptable : case numérotée qui suit l\'évolution d\'un élément (banque, TVA, client, fournisseur…). Le plan comptable français définit leur numérotation.',
  plan_comptable: 'Plan comptable général (PCG) : liste normalisée de tous les comptes utilisés en France. Classe 1=Capitaux, 2=Immobilisations, 3=Stocks, 4=Tiers, 5=Financier, 6=Charges, 7=Produits.',
  tva: 'TVA (Taxe sur la Valeur Ajoutée) : taxe collectée pour l\'État. TVA Collectée (compte 4457) : ce que vous devez à l\'État. TVA Déductible (compte 4456) : ce que l\'État vous rembourse.',
  balance: 'Balance générale : tableau qui récapitule tous les comptes avec leur solde débiteur ou créditeur. Permet de vérifier l\'équilibre de la comptabilité.',
  bilan: 'Bilan : photographie du patrimoine à une date donnée. Actif (gauche) = ce que l\'entreprise possède. Passif (droite) = comment c\'est financé (dettes + capitaux propres).',
  compte_de_resultat: 'Compte de résultat : film de l\'activité sur une période. Produits (revenus) - Charges (dépenses) = Résultat net (bénéfice ou perte).',
  charges: 'Charges (classe 6) : dépenses de l\'entreprise. Achats marchandises (601), Salaires (641), Loyer (613), Téléphone (626)…',
  produits: 'Produits (classe 7) : revenus de l\'entreprise. Ventes de marchandises (707), Prestations de services (706)…',
  immobilisation: 'Immobilisation (classe 2) : bien durable utilisé plus d\'un an (ordinateur, véhicule, local). S\'amortit progressivement sur sa durée de vie utile.',
  amortissement: 'Amortissement : constatation de la perte de valeur d\'une immobilisation. Exemple : ordinateur 1200€ sur 3 ans = 400€/an de charge.',
  grand_livre: 'Grand Livre : détail de tous les mouvements pour chaque compte, classés par compte. Permet de retracer l\'historique complet d\'un compte.',
  lettrage: 'Lettrage : opération qui consiste à rapprocher les écritures d\'un compte client/fournisseur avec les règlements correspondants.',
  rapprochement: 'Rapprochement bancaire : comparaison entre le relevé bancaire et la comptabilité pour identifier les écarts et les opérations en cours.',
  capitaux_propres: 'Capitaux propres : financement apporté par les associés + résultats accumulés. Capital social + Réserves + Résultat de l\'exercice.',
  tresorerie: 'Trésorerie : ensemble des liquidités disponibles (banque + caisse). Un bilan sain = trésorerie positive.',
  resultat: 'Résultat net = Total Produits - Total Charges. Positif = bénéfice. Négatif = perte. Vient alimenter les capitaux propres au bilan.',
};

export const ACCOUNTING_HELP_CONTENT = {
  journal_entry: {
    title: 'Saisir une écriture comptable',
    intro: 'Une écriture comptable enregistre un événement économique. La règle d\'or : Total Débit = Total Crédit.',
    concepts: [
      {
        title: 'La règle de la partie double',
        text: 'Toute opération affecte au moins deux comptes en sens inverse. Si vous achetez du matériel 500€ en banque : vous débitez le compte Matériel (augmentation d\'actif) et créditez le compte Banque (diminution d\'actif).',
      },
      {
        title: 'Quand débiter, quand créditer ?',
        text: 'Comptes d\'Actif (banque, stocks, clients) : Débit = augmentation, Crédit = diminution. Comptes de Passif et Produits : Débit = diminution, Crédit = augmentation.',
      },
    ],
    examples: [
      {
        label: 'Vente de marchandises 1 000€ HT + TVA 200€ au client Dupont',
        lines: [
          { account: '411 - Clients Dupont', debit: '1 200', credit: '' },
          { account: '707 - Ventes de marchandises', debit: '', credit: '1 000' },
          { account: '4457 - TVA collectée', debit: '', credit: '200' },
        ],
      },
      {
        label: 'Achat fournitures bureau 300€ HT + TVA 60€ (paiement immédiat banque)',
        lines: [
          { account: '606 - Achats fournitures bureau', debit: '300', credit: '' },
          { account: '4456 - TVA déductible', debit: '60', credit: '' },
          { account: '512 - Banque', debit: '', credit: '360' },
        ],
      },
      {
        label: 'Règlement client Dupont reçu en banque',
        lines: [
          { account: '512 - Banque', debit: '1 200', credit: '' },
          { account: '411 - Clients Dupont', debit: '', credit: '1 200' },
        ],
      },
    ],
    tips: [
      'Si l\'écriture n\'est pas équilibrée, le système vous le signale en rouge.',
      'La date de l\'écriture doit correspondre à la date de la facture, pas du paiement.',
      'Choisissez toujours le journal adapté : Achats (HA), Ventes (VE), Banque (BQ), OD pour les opérations diverses.',
    ],
  },

  chart_of_accounts: {
    title: 'Plan comptable — guide rapide',
    intro: 'Le plan comptable classe les comptes en 9 classes numérotées. Les 3 premiers chiffres identifient le type de compte.',
    concepts: [
      {
        title: 'Structure du numéro de compte',
        text: 'En France, les comptes suivent le Plan Comptable Général (PCG). Classe 1 : Capitaux | Classe 2 : Immobilisations | Classe 3 : Stocks | Classe 4 : Tiers (clients/fournisseurs) | Classe 5 : Financiers (banque) | Classe 6 : Charges | Classe 7 : Produits.',
      },
      {
        title: 'Comptes fréquents en PME',
        text: '101 Capital social · 401 Fournisseurs · 411 Clients · 512 Banque · 601 Achats marchandises · 707 Ventes · 641 Salaires · 4456 TVA déductible · 4457 TVA collectée.',
      },
    ],
    examples: [],
    tips: [
      'Créez des sous-comptes (ex: 411DUPONT) pour suivre chaque client individuellement.',
      'Les comptes de classe 6 et 7 sont remis à zéro en fin d\'exercice (résultat).',
      'Un compte est dit "soldé" quand son total débit = total crédit.',
    ],
  },

  balance_sheet: {
    title: 'Comprendre le Bilan',
    intro: 'Le bilan est une photographie du patrimoine de l\'entreprise à une date précise. Il se lit toujours en deux colonnes : Actif (gauche) et Passif (droite).',
    concepts: [
      {
        title: 'Actif : ce que l\'entreprise possède',
        text: 'Actif Immobilisé : biens durables (machines, véhicules, brevets). Actif Circulant : stocks, créances clients (argent qu\'on attend), trésorerie (banque + caisse).',
      },
      {
        title: 'Passif : comment c\'est financé',
        text: 'Capitaux Propres : apport des associés + bénéfices accumulés. Dettes Financières : emprunts bancaires. Dettes d\'exploitation : fournisseurs à payer, TVA à reverser.',
      },
    ],
    examples: [],
    tips: [
      'Bilan toujours équilibré : Total Actif = Total Passif. Si ce n\'est pas le cas, il y a une erreur.',
      'Un ratio Actif Circulant / Dettes Court Terme > 1 signifie que vous pouvez payer vos dettes immédiates.',
      'Le résultat du compte de résultat se retrouve dans les capitaux propres au bilan.',
    ],
  },

  general_ledger: {
    title: 'Grand Livre — à quoi ça sert ?',
    intro: 'Le Grand Livre regroupe toutes les écritures comptables classées par compte. C\'est l\'outil de référence pour auditer ou rechercher une opération précise.',
    concepts: [
      {
        title: 'Comment lire une ligne du Grand Livre',
        text: 'Chaque ligne = une écriture dans un journal. Vous voyez la date, le libellé, le montant au débit ou crédit, et le solde cumulatif du compte.',
      },
      {
        title: 'Solde débiteur vs créditeur',
        text: 'Solde débiteur : le compte a reçu plus qu\'il n\'a donné (normal pour Banque, Clients, Stocks). Solde créditeur : le compte a donné plus qu\'il a reçu (normal pour Fournisseurs, TVA collectée, Capital).',
      },
    ],
    examples: [],
    tips: [
      'Filtrez par compte pour voir tout l\'historique d\'un client ou fournisseur.',
      'Un compte client soldé = toutes les factures ont été réglées.',
      'Utilisez le lettrage pour rapprocher factures et règlements automatiquement.',
    ],
  },
};
