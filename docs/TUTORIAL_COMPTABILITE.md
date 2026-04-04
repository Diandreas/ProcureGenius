# Module Comptabilite — Guide pour les profanes
> Tu n'as jamais fait de compta ? Ce guide est pour toi.

---

## La compta en 2 minutes

La comptabilite, c'est juste **noter d'ou vient l'argent et ou il va**.

Imagine un carnet avec 2 colonnes :
- **A gauche (DEBIT)** = l'argent qui ARRIVE quelque part
- **A droite (CREDIT)** = l'argent qui PART de quelque part

**Regle d'or :** a chaque operation, le total a gauche = le total a droite. Toujours. C'est ce qu'on appelle la "partie double".

---

## Les 5 types de comptes

| Type | C'est quoi | Exemples | Ca augmente au... |
|---|---|---|---|
| **Actif** | Ce que tu POSSEDES | Banque, Stock, Caisse | Debit (gauche) |
| **Passif** | Ce que tu DOIS | Dettes fournisseurs, Emprunts | Credit (droite) |
| **Capitaux** | L'argent des associes | Capital social, Reserves | Credit (droite) |
| **Produits** | L'argent qui RENTRE | Ventes, Prestations | Credit (droite) |
| **Charges** | L'argent qui SORT | Loyer, Salaires, Achats | Debit (gauche) |

**Astuce :** Tu n'as pas besoin de memoriser ca. Quand tu crees une ecriture dans ProcureGenius, l'IA te guide.

---

## Le Plan Comptable — ton repertoire de comptes

C'est comme un annuaire. Chaque type d'operation a un "numero de telephone" :

| Numero | Ca sert a quoi |
|---|---|
| **1xx** | Capitaux (l'argent de base de ta boite) |
| **2xx** | Immobilisations (machines, meubles, ordi...) |
| **3xx** | Stocks (ce que tu as en reserve) |
| **4xx** | Tiers (clients, fournisseurs, Etat) |
| **5xx** | Comptes financiers (banque, caisse) |
| **6xx** | Charges (tout ce que tu payes) |
| **7xx** | Produits (tout ce qu'on te paye) |

**Les plus utilises au quotidien :**
- `401` = Fournisseurs (tu leur dois de l'argent)
- `411` = Clients (ils te doivent de l'argent)
- `512` = Banque (ton compte en banque)
- `530` = Caisse (l'argent liquide)
- `607` = Achats de marchandises
- `701` = Ventes de produits

---

## Les Journaux — des cahiers specialises

Au lieu de tout noter dans un seul carnet, on a des cahiers par theme :

| Code | Journal | Tu y notes... |
|---|---|---|
| **VTE** | Ventes | Toutes les factures que tu envoies a tes clients |
| **ACH** | Achats | Toutes les factures que tu recois de tes fournisseurs |
| **BNQ** | Banque | Tous les mouvements sur ton compte bancaire |
| **CAI** | Caisse | Tout ce qui passe en especes |
| **OD** | Operations Diverses | Le reste (salaires, amortissements, etc.) |

---

## Exemples concrets du quotidien

### Exemple 1 : Tu recois une facture fournisseur de 1200 EUR TTC

> Tu as achete du materiel. Le fournisseur t'envoie la facture.

| Compte | Libelle | Debit | Credit |
|---|---|---|---|
| 607 | Achats marchandises | 1 000 EUR | |
| 44566 | TVA deductible | 200 EUR | |
| 401 | Fournisseur X | | 1 200 EUR |

**Traduction :** "J'ai achete pour 1000 EUR HT, il y a 200 EUR de TVA, et je dois 1200 EUR au fournisseur."

### Exemple 2 : Tu payes cette facture fournisseur par virement

| Compte | Libelle | Debit | Credit |
|---|---|---|---|
| 401 | Fournisseur X | 1 200 EUR | |
| 512 | Banque | | 1 200 EUR |

**Traduction :** "Le fournisseur ne me doit plus rien (sa dette disparait du debit), et ma banque a diminue (credit)."

### Exemple 3 : Tu envoies une facture client de 600 EUR TTC

| Compte | Libelle | Debit | Credit |
|---|---|---|---|
| 411 | Client Y | 600 EUR | |
| 701 | Ventes | | 500 EUR |
| 44571 | TVA collectee | | 100 EUR |

**Traduction :** "Le client me doit 600 EUR, j'ai fait 500 EUR de ventes, et je dois 100 EUR de TVA a l'Etat."

### Exemple 4 : Le client te paye

| Compte | Libelle | Debit | Credit |
|---|---|---|---|
| 512 | Banque | 600 EUR | |
| 411 | Client Y | | 600 EUR |

**Traduction :** "Ma banque augmente de 600 EUR, et le client ne me doit plus rien."

---

## Comment faire dans ProcureGenius

### Option 1 : Via l'IA (le plus simple)

Dis simplement a l'assistant :

> "J'ai recu une facture de 1200 EUR TTC de Fournitures Express"

L'IA va :
1. Te montrer l'ecriture qu'elle propose
2. Te demander de confirmer
3. Creer l'ecriture automatiquement dans le bon journal

### Option 2 : Via l'interface

1. Va dans **Comptabilite** > **Nouvelle ecriture**
2. Choisis le **journal** (Achats, Ventes, Banque...)
3. Mets la **date** et le **libelle** (description)
4. Ajoute les **lignes** :
   - Compte + montant au debit OU au credit
   - Le total debit doit egal au total credit (l'interface te previent sinon)
5. Clique sur **Valider**

### Option 3 : Automatique

Quand tu crees une facture ou un PO dans ProcureGenius, l'ecriture comptable peut etre generee automatiquement.

---

## Les rapports comptables

### Le Bilan
> "Photo" de ta boite a un moment donne : ce que tu possedes vs ce que tu dois.

| A gauche (ACTIF) | A droite (PASSIF) |
|---|---|
| Banque : 15 000 EUR | Capital : 10 000 EUR |
| Stock : 8 000 EUR | Dettes fournisseurs : 5 000 EUR |
| Clients qui doivent : 3 000 EUR | Emprunts : 11 000 EUR |
| **Total : 26 000 EUR** | **Total : 26 000 EUR** |

Le total est TOUJOURS egal des 2 cotes. Si c'est pas le cas, il y a une erreur quelque part.

### Le Compte de Resultat
> Combien tu as gagne ou perdu sur une periode.

```
Ventes (produits)        : 50 000 EUR
- Achats (charges)       : 30 000 EUR
- Loyer                  :  6 000 EUR
- Salaires               : 10 000 EUR
= RESULTAT               :  4 000 EUR (benefice !)
```

### La Balance
> Liste de tous tes comptes avec leurs soldes. Si le total des debits ne correspond pas au total des credits, il y a un souci.

### Le Grand Livre
> Le detail de TOUTES les operations pour chaque compte. C'est le "film" complet de ton compte, du debut a la fin.

---

## Glossaire rapide

| Terme | En vrai ca veut dire... |
|---|---|
| **Debit** | L'argent arrive quelque part (pas forcement "depense" !) |
| **Credit** | L'argent part de quelque part (pas forcement "gain" !) |
| **Ecriture** | Une operation notee dans le carnet (toujours 2 cotes) |
| **Partie double** | Chaque operation touche 2 comptes minimum |
| **Lettrage** | Relier un paiement a sa facture pour savoir ce qui est regle |
| **Rapprochement** | Verifier que ta compta correspond a ton releve bancaire |
| **TVA collectee** | TVA que TU dois a l'Etat (sur tes ventes) |
| **TVA deductible** | TVA que l'Etat te doit (sur tes achats) |
| **Exercice** | La "saison" comptable (generalement du 1er jan au 31 dec) |
| **Amortissement** | Etaler le cout d'un achat cher sur plusieurs annees |

---

## La regle des 3 choses a retenir

1. **Debit a gauche, Credit a droite** — toujours
2. **Total Debit = Total Credit** — toujours
3. **En cas de doute, demande a l'IA** — elle te guide

---

*Ce guide est integre dans ProcureGenius. L'IA peut repondre a toutes tes questions comptables en langage simple.*
