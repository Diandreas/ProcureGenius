# Module IA — Guide des nouvelles fonctionnalites
> Tout ce que l'IA peut faire pour toi, avec des exemples concrets.

---

## Vue d'ensemble

L'IA de ProcureGenius n'est pas un simple chatbot. C'est un **assistant de gestion** qui peut :

| Feature | Ce que ca fait | Temps gagne |
|---|---|---|
| Devis par IA | Cree un devis en 1 phrase, convertible en facture | 15 min/devis |
| Verification prix | Compare tes prix avec l'historique + le marche | 1-2h/recherche |
| Cash flow predictif | Predit ta tresorerie sur 60 jours + actions | des heures d'analyse |
| 3-Way Matching | Detecte doublons et anomalies automatiquement | ~12 000 EUR/mois en moyenne |
| Relances intelligentes | Genere des emails de relance adaptes au retard | 30 min/relance |

---

## 1. DEVIS PAR IA

### Creer un devis

Dis simplement a l'IA :

```
"Fais un devis pour Dupont SARL : 10 ramettes papier a 45 EUR,
2 cartouches d'encre a 89 EUR, livraison 25 EUR. Valable 15 jours."
```

L'IA cree le devis avec :
- Numero automatique (DEV202604xxxx)
- Calcul TVA automatique
- Date de validite
- PDF telecharable

### Modifier le devis

Le devis est **toujours editable** dans l'interface :
1. Va sur la page du devis
2. Modifie les prix, quantites, conditions
3. Sauvegarde

### Convertir en facture

Quand le client accepte :

```
"Le client a accepte le devis DEV20260401"
```

ou simplement :

```
"Convertis le dernier devis en facture"
```

L'IA :
- Change le status de "Devis" a "Brouillon"
- Genere un nouveau numero de facture (FAC...)
- Tu peux encore modifier avant d'envoyer

### Avec remise

```
"Devis pour Martin & Fils : 50 chaises de bureau a 120 EUR,
remise de 10%, valable 30 jours, conditions : livraison sous 2 semaines"
```

---

## 2. VERIFICATION PRIX

### Le game changer : verifier avant d'acheter

Avant de valider un bon de commande ou un devis, demande :

```
"Verifie le prix de 'cartouche HP 305' a 35 EUR"
```

L'IA repond avec :

**Historique interne :**
```
  28/02 — 32 EUR chez Bureau Direct
  15/01 — 29 EUR chez Fournitures Pro
  12/12 — 34 EUR chez Bureau Direct

  Moyenne : 31,67 EUR | Dernier : 32 EUR | Ecart : +10,5%
```

**Prix marche (recherche web) :**
```
  Fourchette constatee : 28-38 EUR selon les fournisseurs.
  Le prix de 35 EUR est dans la norme haute.
```

**Alerte :**
```
  Le prix est SUPERIEUR de 10,5% a ta moyenne d'achat (31,67 EUR)
```

### Verifier un prix de vente

```
"Est-ce que 800 EUR c'est bien pour vendre une imprimante Brother MFC ?"
```

L'IA verifie ta marge :
```
  Cout moyen d'achat : 720 EUR
  Marge brute : 10%
  ATTENTION : ta marge moyenne est 25%, tu vends trop bas !
```

---

## 3. PREDICTION CASH FLOW

### Voir l'avenir de ta tresorerie

```
"Comment va ma tresorerie dans 60 jours ?"
```

L'IA analyse :

```
PREDICTION CASH FLOW — 60 jours

Solde projete : TENDU

| Indicateur                          | Montant      |
|-------------------------------------|-------------|
| Entrees prevues (factures clients)  | +18 400 EUR |
| Sorties engagees (PO fournisseurs)  | -15 200 EUR |
| Balance nette projetee              |  +3 200 EUR |
| Factures en retard                  |   6 800 EUR |

Projection hebdomadaire :
| Periode           | Entrees    | Sorties   | Net        |
|-------------------|-----------|-----------|------------|
| Sem. 03/04 — 10/04 | +5 200 EUR | -2 100 EUR | +3 100 EUR |
| Sem. 10/04 — 17/04 | +3 800 EUR | -4 500 EUR |   -700 EUR |
| Sem. 17/04 — 24/04 |   +800 EUR | -3 200 EUR | -2 400 EUR |
...

Factures en retard :
  - Dupont SARL — 2 800 EUR — retard de 22 jours
  - Martin & Fils — 2 500 EUR — retard de 8 jours

Actions recommandees :
  1. Relancer Dupont SARL maintenant (2 800 EUR)
  2. Decaler PO Fournitures Pro de 15 jours (4 100 EUR)
```

### Agir immediatement

Apres la prediction, tu peux dire :

```
"Relance Dupont SARL"
```

Et l'IA genere l'email de relance adapte.

---

## 4. 3-WAY MATCHING (Detection anomalies)

### Scanner toutes les factures

```
"Y a-t-il des anomalies dans mes factures ?"
```

L'IA scanne les 90 derniers jours et detecte :

- **Doublons** : meme client, meme montant, a quelques jours d'ecart
- **Ecarts** : facture fournisseur ≠ bon de commande
- **Factures sans PO** : achats non controles

### Verifier une facture specifique

```
"Verifie la facture FAC20260387"
```

L'IA compare avec le PO correspondant :

```
Facture FAC20260387 — 3 200 EUR
  PO trouve : PO-2024-087 — 3 000 EUR     ECART +200 EUR (+6,7%)
  Nombre d'articles : Facture 8 vs PO 10   INCOMPLET

  ANOMALIE CRITIQUE : ecart de montant de +200 EUR
  ANOMALIE MOYENNE  : nombre d'articles different
```

### Pourquoi c'est important

Statistique : une PME perd en moyenne **12 000 EUR/mois** sur les factures en double.
Le 3-way matching detecte ces erreurs AVANT que tu payes.

---

## 5. RELANCES INTELLIGENTES

### Voir les factures en retard

```
"Quelles factures sont en retard ?"
```

L'IA affiche un tableau clair :

```
| Client         | Facture      | Montant   | Retard | Niveau           |
|---------------|-------------|-----------|--------|------------------|
| Dupont SARL    | FAC20260234 | 2 800 EUR | 22j    | Relance ferme    |
| Martin & Fils  | FAC20260198 | 2 500 EUR | 8j     | Rappel amical    |
| SCI Bleue      | FAC20260289 | 1 500 EUR | 3j     | Rappel amical    |

Total a recuperer : 6 800 EUR
```

### Generer les relances

```
"Relance toutes les factures en retard"
```

L'IA genere un email adapte pour chaque client :

- **J+3** : Email poli — "Sauf erreur de notre part, la facture..."
- **J+15** : Email ferme — "Nous nous permettons de vous relancer..."
- **J+30** : Mise en demeure — references legales incluses
- **J+45+** : Pre-contentieux — dernier avertissement avant recouvrement

### Relancer un client specifique

```
"Relance Dupont SARL"
```

ou

```
"Relance les factures en retard de plus de 15 jours"
```

---

## 6. FONCTIONNALITES EXISTANTES (rappel)

### Creer une facture

```
"Cree une facture pour le client ABC de 1500 EUR pour prestation conseil"
```

### Creer un bon de commande

```
"Commande 200 stylos a 2 EUR chez Fournitures Express, livraison pour le 15 avril"
```

### Scanner un document

Glisse-depose une facture fournisseur (PDF ou photo) dans le chat.
L'IA extrait automatiquement : fournisseur, montant, articles, date.

### Statistiques

```
"Quel est mon CA ce mois ?"
"Analyse ma rentabilite"
"Quels sont mes meilleurs clients ?"
"Montre l'evolution de mes ventes sur 6 mois"
```

---

## Recapitulatif des commandes

| Tu dis... | L'IA fait... |
|---|---|
| "Fais un devis pour X" | Cree un devis avec tous les details |
| "Convertis le devis" | Transforme en facture brouillon |
| "Verifie le prix de X a Y EUR" | Compare historique + marche |
| "Comment va ma tresorerie ?" | Prediction 60 jours + actions |
| "Detecte les doublons" | Scanne toutes les factures recentes |
| "Verifie la facture X" | 3-way matching complet |
| "Quelles factures en retard ?" | Liste les impayes |
| "Relance les impayes" | Genere les emails de relance |
| "Relance [client]" | Email adapte au niveau de retard |
| "Cree une facture pour X" | Facture avec items |
| "Commande X chez Y" | Bon de commande |
| "Analyse mon entreprise" | Analyse complete avec graphiques |

---

*L'IA repond en francais ou en anglais selon ta preference de langue.*
