# Dashboard Widgets - Conception Détaillée

## Vue d'ensemble

Dashboard personnalisable avec des widgets drag & drop pour chaque module.

---

## 📦 WIDGETS PAR MODULE

### 1. MODULE PRODUITS

#### Widget 1.1: Aperçu Stock
**Type:** Carte de statistiques
**Taille:** Petit (1x1)
**Données:**
- Total produits
- Produits actifs
- Stock bas (alerte orange)
- Rupture de stock (alerte rouge)
- Valeur totale du stock

**Visualisation:** Cartes avec icônes et indicateurs colorés

#### Widget 1.2: Produits les Plus Vendus
**Type:** Tableau/Liste
**Taille:** Moyen (2x1)
**Données:**
- Nom du produit
- Quantité vendue (période)
- Revenu généré
- Tendance (↑↓)

**Visualisation:** Top 5 produits avec barres de progression

#### Widget 1.3: Alertes Stock
**Type:** Liste d'alertes
**Taille:** Moyen (1x2)
**Données:**
- Produits en rupture
- Produits stock bas
- Niveau de stock actuel
- Action rapide: "Commander"

**Visualisation:** Liste avec badges de priorité

#### Widget 1.4: Analyse Marges
**Type:** Graphique
**Taille:** Grand (2x2)
**Données:**
- Marge moyenne
- Marge par catégorie
- Distribution des marges
- Produits à faible marge

**Visualisation:** Graphique en barres + KPI

#### Widget 1.5: Mouvements de Stock
**Type:** Timeline
**Taille:** Moyen (2x1)
**Données:**
- Derniers mouvements
- Type (réception, vente, ajustement)
- Quantité
- Date/heure

**Visualisation:** Liste chronologique

---

### 2. MODULE CLIENTS

#### Widget 2.1: Aperçu Clients
**Type:** Carte de statistiques
**Taille:** Petit (1x1)
**Données:**
- Total clients
- Clients actifs
- Nouveaux clients (période)
- Croissance %

**Visualisation:** Cartes avec tendances

#### Widget 2.2: Top Clients
**Type:** Tableau classé
**Taille:** Moyen (2x1)
**Données:**
- Nom client
- CA généré
- Nombre de factures
- Solde en attente
- Dernière activité

**Visualisation:** Top 10 avec barres de CA

#### Widget 2.3: Clients à Risque
**Type:** Liste d'alertes
**Taille:** Moyen (1x2)
**Données:**
- Clients avec factures en retard
- Nombre de jours de retard
- Montant dû
- Historique de paiement

**Visualisation:** Liste avec indicateurs de risque

#### Widget 2.4: Acquisition Clients
**Type:** Graphique temporel
**Taille:** Grand (2x1)
**Données:**
- Nouveaux clients par mois
- Tendance de croissance
- Comparaison période précédente

**Visualisation:** Graphique linéaire

#### Widget 2.5: Segmentation Clients
**Type:** Graphique circulaire
**Taille:** Moyen (1x1)
**Données:**
- Répartition par CA (A, B, C)
- Clients actifs vs inactifs
- Par industrie/secteur

**Visualisation:** Donut chart

---

### 3. MODULE FACTURES

#### Widget 3.1: Aperçu Factures
**Type:** Carte de statistiques
**Taille:** Petit (1x1)
**Données:**
- Total factures
- Montant total
- Factures payées
- Taux de paiement %

**Visualisation:** KPIs avec icônes

#### Widget 3.2: Statut Factures
**Type:** Graphique de répartition
**Taille:** Moyen (1x1)
**Données:**
- Brouillon
- Envoyées
- Payées
- En retard
- Annulées

**Visualisation:** Donut chart avec légende

#### Widget 3.3: Revenus
**Type:** Graphique temporel
**Taille:** Grand (2x1)
**Données:**
- Revenus quotidiens/hebdomadaires
- Tendance mensuelle
- Objectifs vs réalisé
- Comparaison période

**Visualisation:** Graphique en aires empilées

#### Widget 3.4: Factures en Retard
**Type:** Liste d'alertes
**Taille:** Moyen (2x1)
**Données:**
- Numéro facture
- Client
- Montant
- Jours de retard
- Actions (relancer, voir détails)

**Visualisation:** Tableau avec actions rapides

#### Widget 3.5: Performance Paiements
**Type:** Métriques
**Taille:** Moyen (2x1)
**Données:**
- Délai moyen de paiement
- Taux de paiement à temps
- Revenus en attente
- Prévisions encaissements

**Visualisation:** Cartes avec jauges

#### Widget 3.6: Factures Récentes
**Type:** Liste
**Taille:** Moyen (2x1)
**Données:**
- 10 dernières factures
- Client
- Montant
- Statut
- Date

**Visualisation:** Tableau compact

---

### 4. MODULE BONS DE COMMANDE

#### Widget 4.1: Aperçu Bons de Commande
**Type:** Carte de statistiques
**Taille:** Petit (1x1)
**Données:**
- Total BCs
- Montant total
- BCs en attente
- BCs reçus

**Visualisation:** KPIs avec icônes

#### Widget 4.2: Statut Bons de Commande
**Type:** Graphique de répartition
**Taille:** Moyen (1x1)
**Données:**
- Brouillon
- En attente
- Approuvés
- Envoyés
- Reçus
- Facturés
- Annulés

**Visualisation:** Donut chart

#### Widget 4.3: Dépenses Achats
**Type:** Graphique temporel
**Taille:** Grand (2x1)
**Données:**
- Dépenses par période
- Par fournisseur
- Par catégorie produit
- Budget vs réalisé

**Visualisation:** Graphique en barres empilées

#### Widget 4.4: BCs en Retard
**Type:** Liste d'alertes
**Taille:** Moyen (2x1)
**Données:**
- Numéro BC
- Fournisseur
- Date attendue
- Jours de retard
- Actions

**Visualisation:** Tableau avec priorités

#### Widget 4.5: Performance Fournisseurs
**Type:** Classement
**Taille:** Moyen (2x1)
**Données:**
- Top fournisseurs par volume
- Taux de livraison à temps
- Nombre de BCs
- Montant total

**Visualisation:** Tableau avec scores

#### Widget 4.6: Approbations en Attente
**Type:** Liste d'actions
**Taille:** Moyen (1x2)
**Données:**
- BCs à approuver
- Montant
- Demandeur
- Date demande
- Bouton approuver/rejeter

**Visualisation:** Liste interactive

#### Widget 4.7: Budget Achats
**Type:** Jauge de progression
**Taille:** Moyen (1x1)
**Données:**
- Budget total
- Dépensé
- Restant
- % utilisé

**Visualisation:** Jauge circulaire

---

### 5. MODULE IA (Assistant IA)

#### Widget 5.1: Utilisation IA
**Type:** Carte de statistiques
**Taille:** Petit (1x1)
**Données:**
- Conversations totales
- Conversations actives
- Messages envoyés
- Documents scannés

**Visualisation:** KPIs

#### Widget 5.2: Documents Traités
**Type:** Liste récente
**Taille:** Moyen (2x1)
**Données:**
- Type document
- Statut traitement
- Entités créées
- Date/heure
- Actions

**Visualisation:** Timeline avec icônes

#### Widget 5.3: Actions IA Récentes
**Type:** Historique
**Taille:** Moyen (2x1)
**Données:**
- Type d'action (créer, modifier, supprimer)
- Type d'entité
- Utilisateur
- Date/heure
- Bouton "Annuler" si possible

**Visualisation:** Liste d'activités

#### Widget 5.4: Statistiques Traitement
**Type:** Graphiques
**Taille:** Grand (2x2)
**Données:**
- Documents par type
- Taux de réussite OCR
- Entités auto-créées
- Temps de traitement moyen

**Visualisation:** Mix de graphiques

#### Widget 5.5: Conversations Actives
**Type:** Liste
**Taille:** Moyen (1x2)
**Données:**
- Titre conversation
- Dernier message
- Nombre de messages
- Reprendre conversation

**Visualisation:** Liste cliquable

---

## 📊 WIDGETS TRANSVERSAUX

### Widget T.1: Vue Financière Globale
**Type:** Dashboard financier
**Taille:** Grand (3x2)
**Données:**
- Revenus (factures payées)
- Dépenses (BCs)
- Profit net
- Marge
- Graphique évolution

**Visualisation:** Cartes + graphique combiné

### Widget T.2: Activité Récente
**Type:** Feed d'activités
**Taille:** Moyen (2x2)
**Données:**
- Toutes les activités récentes
- Filtre par module
- Type d'activité
- Utilisateur

**Visualisation:** Timeline unifiée

### Widget T.3: Alertes et Notifications
**Type:** Centre de notifications
**Taille:** Moyen (1x2)
**Données:**
- Factures en retard
- BCs en attente d'approbation
- Stock bas
- Nouveaux documents IA

**Visualisation:** Liste priorisée avec badges

### Widget T.4: Performance Globale
**Type:** Indicateurs clés
**Taille:** Grand (3x1)
**Données:**
- Taux de paiement clients
- Taux de livraison fournisseurs
- Croissance CA
- Satisfaction (si dispo)

**Visualisation:** Cartes avec jauges

---

## 🎨 SYSTÈME DE PERSONNALISATION

### Fonctionnalités

1. **Drag & Drop**
   - Réorganiser les widgets
   - Redimensionner (petit, moyen, grand)
   - Grille responsive

2. **Bibliothèque de Widgets**
   - Tous les widgets disponibles
   - Recherche par module
   - Aperçu avant ajout

3. **Vues Sauvegardées**
   - Créer plusieurs dashboards
   - Nommer et décrire
   - Définir une vue par défaut
   - Partager avec équipe (futur)

4. **Filtres Globaux**
   - Période de temps
   - Module spécifique
   - Utilisateur/équipe
   - Client/fournisseur

5. **Configuration Widget**
   - Période d'affichage
   - Nombre d'éléments
   - Couleurs/thème
   - Rafraîchissement auto

6. **Export**
   - Export PDF du dashboard
   - Export Excel des données
   - Planifier envois email

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Backend (Django)

```python
# Modèles
Widget
  - id: UUID
  - code: str (unique, ex: "products_overview")
  - name: str
  - description: str
  - module: str (products, clients, invoices, purchase_orders, ai)
  - type: str (stats, chart, list, table, etc.)
  - default_size: str (small, medium, large)
  - default_config: JSONField
  - is_active: bool

DashboardLayout
  - id: UUID
  - user: FK(User)
  - name: str
  - is_default: bool
  - layout: JSONField  # Position et taille des widgets
  - created_at: DateTime
  - updated_at: DateTime

WidgetInstance
  - id: UUID
  - layout: FK(DashboardLayout)
  - widget: FK(Widget)
  - position: JSONField  # {x, y, w, h}
  - custom_config: JSONField  # Override default config
  - is_visible: bool
```

### Frontend (React)

```javascript
// Composants
<CustomizableDashboard />
  <WidgetGrid />
    <WidgetContainer />
      // Widgets spécifiques
      <ProductsOverviewWidget />
      <TopClientsWidget />
      <RevenueChartWidget />
      // etc.

<WidgetLibrary />  // Galerie de widgets
<DashboardSettings />  // Configuration
<LayoutManager />  // Gestion des vues
```

### APIs

```
GET    /api/v1/analytics/widgets/                    # Liste widgets disponibles
GET    /api/v1/analytics/dashboard/layouts/          # Vues sauvegardées
POST   /api/v1/analytics/dashboard/layouts/          # Créer vue
PUT    /api/v1/analytics/dashboard/layouts/:id/      # Modifier vue
DELETE /api/v1/analytics/dashboard/layouts/:id/      # Supprimer vue
GET    /api/v1/analytics/dashboard/data/:widget_id/  # Données d'un widget
POST   /api/v1/analytics/dashboard/export/           # Exporter dashboard
```

---

## 📋 PLAN D'IMPLÉMENTATION

### Phase 1: Base Technique
1. Créer les modèles Widget, DashboardLayout, WidgetInstance
2. Créer les migrations
3. Créer les API endpoints de base
4. Créer les composants React de base

### Phase 2: Widgets Essentiels (par priorité)
1. Vue Financière Globale (Widget T.1)
2. Aperçu Factures (Widget 3.1)
3. Statut Factures (Widget 3.2)
4. Aperçu Bons de Commande (Widget 4.1)
5. Alertes et Notifications (Widget T.3)

### Phase 3: Personnalisation
1. Drag & Drop avec react-grid-layout
2. Bibliothèque de widgets
3. Sauvegarde de vues
4. Configuration par widget

### Phase 4: Widgets Avancés
1. Tous les widgets des modules Produits et Clients
2. Widgets avancés Factures et BCs
3. Widgets IA
4. Widgets transversaux

### Phase 5: Fonctionnalités Avancées
1. Export PDF/Excel
2. Planification envois email
3. Partage de vues
4. Rafraîchissement auto

---

## 🎯 PROCHAINE ÉTAPE

**Validation de cette conception avant implémentation:**
- Les widgets proposés sont-ils pertinents ?
- Manque-t-il des widgets essentiels ?
- L'approche technique est-elle correcte ?
- Quelle phase voulez-vous commencer ?

Attendons votre feedback pour lancer le développement! 🚀
