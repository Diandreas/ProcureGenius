# Guide des Données de Seed - ProcureGenius

## 🎯 Vue d'ensemble

Le script `seed_all_modules.py` crée un compte de démonstration complet avec **accès à tous les modules** et des données réalistes pour tester toutes les fonctionnalités de la plateforme.

---

## 🚀 Utilisation

### Lancer le script

```bash
cd d:\project\BFMa\ProcureGenius
python seed_all_modules.py
```

ou via Django shell:

```bash
python manage.py shell < seed_all_modules.py
```

---

## 👤 Compte Créé

### Organisation : Sophie - Pâtisserie Artisanale
- **Type d'abonnement** : ENTERPRISE (accès à TOUS les modules)
- **Modules actifs** : 9 modules

### Utilisateur Principal
- **Nom complet** : Sophie Martin
- **Username** : `sophie.martin`
- **Email** : sophie.martin@gmail.com
- **Mot de passe** : `password123`
- **Rôle** : Administrateur (accès complet)

### 🔐 Connexion
```
Username: sophie.martin
Password: password123
URL: http://localhost:3000/
```

---

## 📦 Données Créées

### 1. **Fournisseurs** (5)

| Fournisseur | Catégorie | Note | Statut | Particularités |
|-------------|-----------|------|--------|---------------|
| **Minoterie du Moulin** | Ingrédients base | 4.8/5 | Actif | Local |
| **Pâtisserie Pro Équipement** | Équipement | 4.5/5 | Actif | Non-local |
| **Emballages Créatifs** | Emballages | 4.2/5 | Actif | Local, Femme entrepreneur |
| **Déco Sucre & Cie** | Décoration | 4.9/5 | Actif | Femme entrepreneur |
| **Bio Ingrédients Local** | Ingrédients | 4.0/5 | En attente | Local |

### 2. **Produits** (10)

#### Produits Finis (à vendre)

| Produit | Type | Prix | Coût | Marge | Stock |
|---------|------|------|------|-------|-------|
| **Gâteau Anniversaire Personnalisé** | Physique - Fabriqué | 65€ | 25€ | 160% | 0 (sur commande) |
| **Tarte aux Fruits de Saison** | Physique - Fabriqué | 28€ | 12€ | 133% | 5 (⚠️ stock bas) |
| **Macarons Assortis (Boîte de 6)** | Physique - Fabriqué | 15€ | 6€ | 150% | 12 |
| **Croissants Pur Beurre (x4)** | Physique - Fabriqué | 8.50€ | 3€ | 183% | 20 |
| **Atelier Pâtisserie Enfants** | Service | 45€ | 15€ | 200% | - |

#### Matières Premières (achetées)

| Produit | Fournisseur | Prix | Coût | Stock |
|---------|-------------|------|------|-------|
| **Farine T55 (25kg)** | Minoterie du Moulin | 35€ | 28€ | 3 |
| **Sucre en poudre (10kg)** | Minoterie du Moulin | 15€ | 12€ | 5 |
| **Œufs Bio (x30)** | Bio Ingrédients Local | 9€ | 7.50€ | 8 |
| **Pâte à sucre (1kg)** | Déco Sucre & Cie | 18€ | 14€ | 2 (⚠️ stock bas) |
| **Boîte à gâteau premium (x10)** | Emballages Créatifs | 25€ | 18€ | 15 |

### 3. **Bons de Commande** (3)

#### BC 1 : Réapprovisionnement Farine & Sucre
- **Numéro** : BC2025100001
- **Statut** : ✅ Reçu
- **Fournisseur** : Minoterie du Moulin
- **Priorité** : Normale
- **Montant** : 105.77€
- **Articles** :
  - Farine T55 : 2 unités × 28€
  - Sucre en poudre : 3 unités × 12€

#### BC 2 : Boîtes à gâteaux premium
- **Numéro** : BC2025100002
- **Statut** : ✅ Approuvé
- **Fournisseur** : Emballages Créatifs
- **Priorité** : Normale
- **Montant** : 103.48€
- **Livraison prévue** : +10 jours
- **Articles** :
  - Boîtes premium : 5 lots × 18€

#### BC 3 : Pâte à sucre - URGENT
- **Numéro** : BC2025100003
- **Statut** : 📤 Envoyé
- **Fournisseur** : Déco Sucre & Cie
- **Priorité** : ⚡ URGENT
- **Montant** : 48.29€
- **Livraison demandée** : +2 jours
- **Conditions** : Livraison express
- **Articles** :
  - Pâte à sucre : 3 kg × 14€

### 4. **Factures** (5)

#### Facture 1 : Gâteau Anniversaire
- **Numéro** : FAC2025100001
- **Statut** : ✅ Payée
- **Client** : Marie Dubois (particulier)
- **Montant** : 78.00€
- **Description** : Gâteau thème Princesse pour Sophie (8 ans)
- **Paiement** : Carte bancaire comptant

#### Facture 2 : Fourniture Restaurant
- **Numéro** : FAC2025100002
- **Statut** : 📤 Envoyée
- **Client** : Restaurant Le Gourmet
- **Montant** : 216.85€
- **Échéance** : Net 30 jours
- **Articles** :
  - 4 Tartes aux fruits
  - 4 Boîtes macarons
  - 1 Lot croissants (10% remise)

#### Facture 3 : Buffet Entreprise
- **Numéro** : FAC2025100003
- **Statut** : 📤 Envoyée
- **Client** : TechCorp (événement)
- **Montant** : 951.00€
- **Échéance** : Net 15 jours
- **Articles** :
  - 3 Gâteaux variés (50 parts)
  - 20 Boîtes macarons (5% remise)
  - 1 Prestation service buffet

#### Facture 4 : Atelier École
- **Numéro** : FAC2025100004
- **Statut** : 📝 Brouillon
- **Client** : École Sainte-Marie
- **Montant** : 540.00€
- **Échéance** : Net 45 jours
- **Articles** :
  - 10 Ateliers pâtisserie enfants

#### Facture 5 : Mariage
- **Numéro** : FAC2025100005
- **Statut** : ⚠️ EN RETARD
- **Client** : Pierre & Julie Martin
- **Montant** : 1020.00€
- **Échéance** : -5 jours (en retard)
- **Articles** :
  - 1 Pièce montée 120 personnes

### 5. **Clients** (5)

| Client | Type | Contact | Particularités |
|--------|------|---------|---------------|
| **Restaurant Le Gourmet** | Professionnel | Chef Jacques | Client récurrent B2B |
| **Marie Dubois** | Particulier | Email/Tel | Client particulier |
| **Entreprise TechCorp** | Professionnel | Resp. Événements | Événementiel entreprise |
| **École Sainte-Marie** | Institution | Directrice | Ateliers pédagogiques |
| **Pierre & Julie Martin** | Particulier | Pierre Martin | Mariage |

### 6. **Mouvements de Stock** (9)

#### Entrées (Stock initial)
- Farine T55 : +3 unités
- Sucre : +5 unités
- Œufs Bio : +8 unités
- Pâte à sucre : +2 unités
- Boîtes premium : +15 unités

#### Sorties (Ventes)
- Tarte fruits : -3 (vente restaurant)
- Macarons : -5 (événement TechCorp)

#### Pertes
- Croissants : -2 (don association - invendus)

#### Ajustements
- Sucre : -1 (sac endommagé - correction inventaire)

---

## 📊 Statistiques du Jeu de Données

### Chiffres Clés

| Indicateur | Valeur |
|------------|--------|
| **CA total facturé** | 2 805.85€ |
| **Factures payées** | 78.00€ (3%) |
| **Factures en attente** | 2 187.85€ |
| **Factures en retard** | 1 020.00€ |
| **Achats totaux** | 257.54€ |
| **Marge moyenne produits** | 156.7% |

### État des Stocks

- **Produits physiques** : 9
- **Stock bas** : 2 produits ⚠️
- **Rupture** : 1 produit (Gâteau sur commande)

### Distribution par Statut

**Factures** :
- Brouillon : 1
- Envoyée : 2
- Payée : 1
- En retard : 1

**Bons de commande** :
- Approuvé : 1
- Envoyé : 1
- Reçu : 1

---

## 🧪 Cas d'Usage Testables

### 1. Module Dashboard
- ✅ Vue d'ensemble KPIs
- ✅ CA, Achats, Marges
- ✅ Alertes stock bas
- ✅ Factures en retard

### 2. Module Fournisseurs
- ✅ Liste fournisseurs avec notes
- ✅ Catégories
- ✅ Statuts (actif, en attente)
- ✅ Badges diversité (local, femme entrepreneur)

### 3. Module Bons de Commande
- ✅ États variés (brouillon, approuvé, reçu)
- ✅ Priorités (normal, urgent)
- ✅ Livraisons prévues
- ✅ Conditions spéciales

### 4. Module Factures
- ✅ États complets (brouillon, envoyée, payée, en retard)
- ✅ Multi-articles
- ✅ Remises
- ✅ Différents modes paiement
- ✅ Échéances variées

### 5. Module Produits
- ✅ Types : physique, service, digital
- ✅ Sources : acheté, fabriqué, revente
- ✅ Calcul marges automatique
- ✅ Gestion stock
- ✅ Catégories

### 6. Module Clients
- ✅ Particuliers et professionnels
- ✅ Informations complètes
- ✅ Historique facturation

### 7. Module Stock
- ✅ Mouvements variés (réception, vente, perte, ajustement)
- ✅ Historique traçable
- ✅ Alertes stock bas
- ✅ Références (BC, factures)

### 8. Module Analytics
- ✅ Données pour :
  - Analyse CA par période
  - Analyse marges par produit
  - Top fournisseurs
  - Top clients
  - Évolution stocks

---

## 🎭 Scénarios de Test

### Scénario 1 : Gestion quotidienne
1. Consulter dashboard (KPIs)
2. Voir alertes stock bas (Tarte, Pâte à sucre)
3. Créer BC urgent pour réappro
4. Approuver le BC
5. Marquer comme reçu → stock mis à jour

### Scénario 2 : Facturation client
1. Créer nouvelle facture
2. Ajouter plusieurs produits
3. Appliquer remise
4. Envoyer facture
5. Marquer comme payée

### Scénario 3 : Analyse rentabilité
1. Consulter Analytics
2. Voir marges par produit
3. Identifier produits les plus rentables
4. Analyser coûts fournisseurs
5. Optimiser prix de vente

### Scénario 4 : Gestion stock
1. Consulter état stocks
2. Voir historique mouvements
3. Ajuster stock manuellement
4. Déclarer perte avec raison
5. Recevoir alerte stock bas

### Scénario 5 : Relation fournisseurs
1. Consulter panel fournisseurs
2. Évaluer performance (notes)
3. Comparer prix
4. Créer nouveau BC
5. Suivre livraisons

---

## 🔄 Réinitialiser les Données

Pour réinitialiser et recréer les données :

```bash
# Supprimer la base de données
del db.sqlite3

# Recréer les migrations
python manage.py migrate

# Relancer le seed
python seed_all_modules.py
```

---

## 📝 Notes Importantes

### Données Réalistes
Le jeu de données représente **Sophie, une particulière qui lance sa pâtisserie artisanale** :
- Petit stock (matières premières)
- Quelques fournisseurs locaux
- Mix clients (particuliers + B2B)
- Gestion simple mais professionnelle
- Profil ENTERPRISE pour tester TOUS les modules

### Cas d'Usage Couverts

**✅ Facturé** :
- Particulier payé comptant
- Restaurant (récurrent)
- Événementiel entreprise
- Service/Atelier
- Mariage (gros montant)

**✅ Achats** :
- Matières premières
- Emballages
- Équipement déco
- Commande urgente
- Commande régulière

**✅ Stock** :
- Produits finis
- Matières premières
- Ventes (sorties)
- Pertes/Dons
- Ajustements inventaire

**✅ Analytics** :
- CA par client
- Marges par produit
- Performance fournisseurs
- Alertes (retards, stocks)

---

## 🎯 Utilisation Recommandée

### Pour Développement
1. **Premier lancement** : Exécuter le seed
2. **Tests fonctionnels** : Utiliser les données créées
3. **Tests UI** : Vérifier affichage dashboards
4. **Tests logique** : Calculs marges, stocks, totaux

### Pour Démo
1. **Storytelling** : Suivre le parcours de Sophie
2. **Modules** : Montrer chaque module avec données réelles
3. **Workflows** : Démontrer cycles complets (BC → Réception → Stock)
4. **Alertes** : Montrer factures en retard, stocks bas

### Pour Tests Utilisateur
1. **Onboarding** : Compte prêt à l'emploi
2. **Scénarios** : Cas d'usage documentés
3. **Feedback** : Données suffisantes pour tests complets

---

**Créé le** : 2025-10-12
**Version** : 1.0
**Auteur** : Équipe Développement ProcureGenius
