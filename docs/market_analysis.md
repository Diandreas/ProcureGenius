# ProcureGenius — Analyse Marché, Personas & Concurrence
> Document de stratégie produit — Avril 2026

---

## 1. PERSONAS CIBLES

---

### Persona #1 — "Le Dirigeant Débordé"
**Prénom type :** Karim, 42 ans, Marseille
**Rôle :** Gérant / Fondateur PME (BTP, import/export, distribution)
**Taille entreprise :** 8 à 35 salariés — CA entre 800K€ et 4M€

**Situation :**
- Fait les achats lui-même entre deux appels clients
- Ses factures trainent dans sa boite mail et dans un classeur
- Son comptable reçoit les documents en fin de mois dans un sac plastique
- Il a essayé Excel, puis un ERP "trop compliqué", est revenu à Excel
- Il ne sait jamais vraiment combien il va devoir payer le mois prochain

**Douleurs profondes :**
- Peur de manquer de cash sans le voir venir
- Perd du temps à chercher "j'ai payé combien la dernière fois chez ce fournisseur ?"
- Signe des bons de commande sans savoir si le prix est bon ou gonflé
- A déjà payé deux fois la même facture
- Ne négocie jamais les conditions parce qu'il n'a pas le temps de préparer

**Ce qu'il veut vraiment :**
> "Je veux que quelqu'un gère ça pour moi, ou au moins me prévienne AVANT que ça devienne un problème."

**Déclencheur d'achat :** Un mois difficile de trésorerie, ou un fournisseur qui l'a arnaqué une fois de trop.

**Sensibilité prix :** Cherche du ROI immédiat. Paiera si ça lui fait "gagner du temps ou de l'argent visible".

---

### Persona #2 — "La RAF Polyvalente"
**Prénom type :** Sophie, 38 ans, Lyon
**Rôle :** Responsable Administrative & Financière (RAF/DAF)
**Taille entreprise :** 40 à 150 salariés — CA 3M€ à 20M€

**Situation :**
- Gère la compta, les achats, les RH et parfois l'IT
- Passe 30% de son temps à réconcilier des factures manuellement
- A un outil comptable (Sage, Cegid) mais rien pour les achats en amont
- Ses tableaux de bord sont faits sur Excel qu'elle met à jour le vendredi
- Reçoit des demandes d'achat par Slack, email, post-it

**Douleurs profondes :**
- Perte de contrôle sur les dépenses "sauvages" des managers
- Aucune visibilité sur les engagements hors-bilan (PO non réceptionnés)
- Risque juridique sur les fournisseurs non vérifiés (Kbis périmé, attestation Urssaf absente)
- Fin de mois stressante pour boucler la compta
- Litiges fournisseurs gérés par email sans traçabilité

**Ce qu'elle veut vraiment :**
> "Je veux pouvoir répondre à mon DG en 30 secondes quand il demande où en sont les dépenses du trimestre."

**Déclencheur d'achat :** Un audit, un DG qui demande plus de reporting, ou un incident fournisseur.

**Sensibilité prix :** Raisonnée. Comparera les offres, veut une démo, impliquera son DG pour valider.

---

### Persona #3 — "Le Responsable Achat en Croissance"
**Prénom type :** Thomas, 34 ans, Paris
**Rôle :** Responsable Achats / Supply Chain
**Taille entreprise :** 80 à 300 salariés — CA 10M€ à 50M€

**Situation :**
- Premier vrai acheteur de la boite, vient de remplacer un process 100% Excel
- Doit professionnaliser les achats mais n'a pas le budget Coupa/Ivalua
- Gère 80+ fournisseurs actifs, certains critiques, aucun scoring formel
- Ne peut pas faire de benchmarking prix facilement
- Sa direction veut des savings mais sans process défini

**Douleurs profondes :**
- Aucune visibilité sur les prix pratiqués vs le marché
- Dépendance critique sur 2-3 fournisseurs sans alternative identifiée
- Contrats fournisseurs éparpillés dans des dossiers partagés, certains expirés
- Pas d'outil pour prouver la valeur de son travail (savings non mesurés)
- Appels d'offres faits sur Excel et email = pas professionnel face aux fournisseurs

**Ce qu'il veut vraiment :**
> "Je veux un outil qui me fasse paraître comme un grand service achat alors qu'on est juste moi et une assistante."

**Déclencheur d'achat :** Prise de poste, ou brief de direction pour "sortir d'Excel".

**Sensibilité prix :** Cherche le rapport fonctionnalités/prix. Fera un POC, comparera 3 outils.

---

### Persona #4 — "L'Expert-Comptable Prescripteur"
**Prénom type :** Isabelle, 46 ans, Toulouse
**Rôle :** Expert-comptable associée, cabinet 8 personnes, 120 clients TPE/PME

**Situation :**
- Passe du temps à ressaisir des données que ses clients auraient pu saisir eux-mêmes
- Conseille ses clients sur les outils mais manque de temps pour les former
- Reçoit des docs en désordre, en double, souvent illisibles
- Cherche à digitaliser son portefeuille clients pour sortir du "tout papier"
- Prescrit déjà Pennylane à certains clients

**Douleurs profondes :**
- Les clients PME qui ont des achats importants n'ont aucun outil entre leur ERP et leur compta
- Réconcilier factures d'achat et POs est un travail manuel ingrat
- Impossible de voir en temps réel où en est un client entre deux rendez-vous
- Ses clients sous-estiment leurs engagements fournisseurs en fin d'exercice

**Ce qu'il veut vraiment :**
> "Si mes clients sont mieux organisés, je peux leur apporter plus de conseil et moins faire de la ressaisie."

**Déclencheur :** Un client qui lui pose un problème qu'un outil aurait évité.

**Rôle dans l'achat :** Prescripteur, pas décideur. Peut amener 5-15 clients si convaincu.

---

## 2. ANALYSE CONCURRENTIELLE

---

### Concurrents directs (Procurement/AP pour PME)

| Outil | Positionnement | Forces | Faiblesses | Prix indicatif |
|---|---|---|---|---|
| **Pennylane** | Compta + facturation PME FR | UX excellente, connexion bancaire, fort réseau EC | Zéro module achat/procurement, pas de PO, pas de gestion fournisseurs | ~50€/mois |
| **Spendesk** | Gestion dépenses & cartes | Cartes virtuelles, notes de frais, workflows | Pas de gestion fournisseurs ni stocks, focus dépenses internes | ~150€/mois |
| **Odoo** | ERP complet | Tout en un, modules procurement inclus | Complexe à paramétrer, UX datée, implémentation longue et chère, zéro IA native | ~25-150€/user |
| **Sage** | Comptabilité classique | Notoriété, intégration EC, stable | UX vieillissante, pas d'IA, pas de procurement natif | ~60-200€/mois |
| **Cegid** | Compta + retail | Solide pour retail, certification | Très cher, orienté grands comptes, pas de procurement IA | sur devis |
| **Zoho Books** | Suite Zoho pour PME | Prix bas, fonctionnalités larges | UX confuse, support FR limité, pas d'IA procurement | ~15-40€/mois |

### Concurrents indirects (Enterprise, hors budget PME)

| Outil | Pourquoi c'est pertinent | Pourquoi PME ne peut pas |
|---|---|---|
| **Coupa** | Leader mondial procurement | 50K€+/an, 6 mois d'implémentation |
| **Ivalua** | Procurement IA avancé | Grands comptes uniquement |
| **Tipalti** | AP automation | Complexe, cher, pas francophone |
| **Jaggaer** | Source-to-Pay enterprise | Inaccessible PME |

### Outils ponctuels (fragments de solution)

| Outil | Ce qu'il fait | Limite |
|---|---|---|
| **Procys / Mindee** | OCR factures | Seulement extraction, pas d'action |
| **Yooz** | Dématérialisation factures | Pas de procurement, juste AP |
| **Libeo** | Paiement fournisseurs | Pas de gestion achats en amont |
| **Napta / Precoro** | Procurement mid-market | Non francisé, pas d'IA |

---

## 3. POSITIONNEMENT UNIQUE — OÙ EST LE TROU

```
                    SIMPLE ←————————————→ COMPLEXE
                       │                          │
    FACTURATION  Pennylane                      Cegid
    SEULE        Sage                           SAP
                       │                          │
    DÉPENSES     Spendesk                         │
    INTERNES     Expensya                         │
                       │                          │
    PROCUREMENT         │        ← TROU PME →  Coupa
    COMPLET             │                      Ivalua
                       │                          │
                    SANS IA ←—————————→ AVEC IA
```

**Le trou du marché :** Un outil de procurement complet (PO + fournisseurs + factures + trésorerie), **avec IA native**, **pour PME françaises**, **à prix PME**, **sans 6 mois d'implémentation**.

C'est exactement là que ProcureGenius se positionne.

---

## 4. INSIGHTS CLÉS POUR LE PRODUCT

**Ce que les PME paient le plus cher (en temps et argent) :**
1. Réconciliation manuelle factures/PO/livraison → **3-Way Matching automatique**
2. Mauvais prix fournisseurs non détectés → **Vérification prix à la création PO**
3. Cash flow surprise → **Prédiction trésorerie proactive**
4. Fraude et doublons non détectés → **Anomaly detection**
5. Contrats fournisseurs oubliés/expirés → **Contract intelligence**
6. Dépendance sur 1-2 fournisseurs → **Mapping risque fournisseur**

**Ce que les concurrents ne font PAS avec l'IA :**
- Aucun ne fait de vérification de prix en temps réel à la création d'un PO
- Aucun ne fait de 3-way matching automatique pour PME
- Aucun ne prédit le cash flow ET suggère des actions correctives
- Aucun n'alerte sur les reconductions tacites de contrats

---

---

## 5. ROADMAP FEATURES IA PRIORITAIRES

### Features validées (à builder)
| # | Feature | Urgence | Impact |
|---|---|---|---|
| ✅ | Prédiction cash flow + actions correctives | Haute | ★★★★★ |
| ✅ | Vérification prix à la création PO/devis | Haute | ★★★★☆ |
| ✅ | Scan/import bon de commande entrant | Moyenne | ★★★☆☆ |

### Features issues de la recherche 2026
| # | Feature | Urgence | Impact |
|---|---|---|---|
| 🔥 | E-Invoice Ready (conformité sept 2026) | CRITIQUE | ★★★★★ |
| 🔥 | 3-Way Matching auto (fraude/doublons) | Haute | ★★★★★ |
| 💡 | Contract Brain (extraction contrats PDF) | Moyenne | ★★★★☆ |
| 💡 | Supplier Collapse Radar (faillite fournisseur) | Moyenne | ★★★★☆ |

### Stat clés pour le pitch
- 79% des entreprises ont subi une fraude de paiement (AFP 2025)
- PME perd ~12.000$/mois sur les factures en double (industry study)
- 70%+ des PME françaises pas prêtes pour la facture électronique 2026
- Efficiency gap procurement : +10% workload, +1% budget seulement

---

*Document créé le 03/04/2026 — À mettre à jour trimestriellement*

### Sources de recherche
- [State of AI in Procurement 2026 - Art of Procurement](https://artofprocurement.com/blog/state-of-ai-in-procurement)
- [Accounts payable fraud 2025 - Rillion](https://www.rillion.com/blog/accounts-payable-fraud/)
- [Facturation électronique obligatoire 2026-2027 - Socic](https://www.socic.fr/ressources-comptabilite/articles/facturation-electronique-obligatoire-2026-2027-calendrier-plateformes-agreees-e-reporting-et-checklist-tpe-pme)
- [Problèmes gestion achats PME - La Fabrique du Net](https://www.lafabriquedunet.fr/logiciels/gestion/gestion-achat/gestion-des-achats-pme)
- [Doing more with less - procurement 2026 - SCMR](https://www.scmr.com/article/doing-more-with-less-practical-ai-moves-for-procurement-teams-in-2026)
