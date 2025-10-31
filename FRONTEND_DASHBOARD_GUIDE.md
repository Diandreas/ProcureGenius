# Dashboard Frontend Amélioré - Guide d'Activation

## Fichiers Créés

### 1. Service API Analytics
**Fichier**: `frontend/src/services/analyticsAPI.js`

Nouveau service pour communiquer avec l'API analytics backend:
- `getStats(params)` - Récupérer les statistiques avec filtres
- `exportPDF(params)` - Exporter en PDF
- `exportExcel(params)` - Exporter en Excel
- `getConfig()` / `updateConfig()` - Configuration utilisateur
- `getSavedViews()` / `createSavedView()` / `deleteSavedView()` - Vues sauvegardées

### 2. Dashboard Amélioré
**Fichier**: `frontend/src/pages/DashboardEnhanced.jsx`

Nouveau composant Dashboard avec fonctionnalités complètes:
- ✅ **Filtres de période**: Aujourd'hui, 7/30/90 jours, ce mois, cette année, personnalisé
- ✅ **Export PDF/Excel**: Boutons d'export avec téléchargement automatique
- ✅ **Statistiques réelles**: Données provenant du backend avec comparaison période précédente
- ✅ **Graphiques dynamiques**: Tendances quotidiennes avec vraies données
- ✅ **Top 5 Clients/Fournisseurs**: Listes dynamiques avec montants réels
- ✅ **Comparaison avec période précédente**: Affichage des variations en %
- ✅ **Interface responsive**: Adapté mobile et desktop

## Activation du Nouveau Dashboard

### Étape 1: Modifier App.jsx

Ouvrir `frontend/src/App.jsx` et modifier les lignes suivantes:

**Ligne 16 - Modifier l'import:**
```jsx
// AVANT:
import Dashboard from './pages/Dashboard';

// APRÈS:
import DashboardEnhanced from './pages/DashboardEnhanced';
```

**Ligne 441 - Modifier la route:**
```jsx
// AVANT:
<Route path="/dashboard" element={<Dashboard />} />

// APRÈS:
<Route path="/dashboard" element={<DashboardEnhanced />} />
```

### Étape 2: Tester le Dashboard

1. Assurez-vous que le backend Django est démarré
2. Lancez le frontend React:
   ```bash
   cd frontend
   npm start
   ```
3. Accédez à `/dashboard`
4. Vérifiez que:
   - Les statistiques se chargent correctement
   - Les filtres de période fonctionnent
   - Les boutons d'export PDF/Excel fonctionnent
   - Les graphiques affichent les vraies données

## Fonctionnalités du Nouveau Dashboard

### 1. Filtrage par Période

Le dashboard propose plusieurs options de période prédéfinies:
- **Aujourd'hui**: Données du jour actuel
- **7 jours**: 7 derniers jours
- **30 jours**: 30 derniers jours (par défaut)
- **90 jours**: 90 derniers jours
- **Ce mois**: Mois en cours
- **Cette année**: Année en cours
- **Personnalisé**: Sélecteur de dates personnalisées

### 2. Cartes de Statistiques

4 cartes principales affichent:
1. **Revenu Total**: Avec comparaison vs période précédente
2. **Dépenses**: Avec comparaison vs période précédente
3. **Profit Net**: Avec comparaison vs période précédente
4. **Factures Impayées**: Nombre sur total

Chaque carte avec période précédente affiche:
- Un badge vert/rouge avec l'icône ▲/▼
- Le pourcentage de variation
- Le texte "vs période précédente"

### 3. Graphiques

**Graphique Linéaire - Tendances quotidiennes:**
- Affiche les factures et bons de commande par jour
- Données réelles provenant de l'API
- Adaptatif selon la période sélectionnée

**Graphique Donut - État des factures:**
- Factures payées (vert)
- Factures en attente (orange)
- Factures en retard (rouge)

### 4. Listes Top 5

**Top 5 Clients:**
- Nom du client
- Nombre de factures
- Revenu total généré

**Top 5 Fournisseurs:**
- Nom du fournisseur
- Nombre de bons de commande
- Montant total dépensé

### 5. Export

**Export PDF:**
- Génère un PDF professionnel au format paysage A4
- Inclut toutes les statistiques de la période sélectionnée
- Formatage et mise en page professionnels
- Téléchargement automatique

**Export Excel:**
- Génère un fichier Excel multi-feuilles
- Feuilles: Résumé, Factures, Bons de Commande, Clients, Fournisseurs
- Colonnes auto-ajustées
- Téléchargement automatique

### 6. Sélection de Date Personnalisée

Le bouton "Personnalisé" ouvre une boîte de dialogue permettant de:
- Sélectionner une date de début
- Sélectionner une date de fin
- Appliquer la sélection

## API Backend Utilisée

Le dashboard utilise les endpoints suivants:

```
GET  /api/v1/analytics/stats/?period={period}&compare={true|false}&start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}
POST /api/v1/analytics/export/
```

### Paramètres API

**period:**
- `today`
- `last_7_days`
- `last_30_days`
- `last_90_days`
- `this_month`
- `this_year`
- `custom` (requires start_date and end_date)

**compare:**
- `true` - Afficher la comparaison avec période précédente
- `false` - Ne pas afficher la comparaison

**start_date / end_date:**
- Format: `YYYY-MM-DD`
- Requis uniquement si `period=custom`

### Format de Réponse API

```json
{
  "success": true,
  "data": {
    "metadata": {
      "period": "last_30_days",
      "start_date": "2025-09-25",
      "end_date": "2025-10-25",
      "compare_previous": true
    },
    "enabled_modules": ["suppliers", "invoices", "purchase_orders", "clients", "products"],
    "financial": {
      "total_revenue": 15000.00,
      "total_expenses": 10000.00,
      "net_profit": 5000.00,
      "profit_margin": 33.33,
      "previous_revenue": 12000.00,
      "previous_expenses": 9000.00,
      "previous_profit": 3000.00
    },
    "invoices": {
      "total_count": 50,
      "paid_count": 30,
      "pending_count": 15,
      "overdue_count": 5,
      "unpaid_count": 20,
      "total_amount": 15000.00,
      "paid_amount": 9000.00,
      "pending_amount": 6000.00
    },
    "purchase_orders": {
      "total_count": 40,
      "draft_count": 5,
      "pending_count": 10,
      "approved_count": 20,
      "received_count": 5,
      "total_amount": 10000.00
    },
    "daily_trends": {
      "dates": ["2025-10-20", "2025-10-21", "2025-10-22"],
      "invoices": [1200, 1500, 1800],
      "purchase_orders": [800, 900, 1000]
    },
    "top_clients": [
      {
        "name": "Client A",
        "invoice_count": 10,
        "total_revenue": 5000.00
      }
    ],
    "top_suppliers": [
      {
        "name": "Fournisseur X",
        "purchase_order_count": 8,
        "total_spent": 3000.00
      }
    ]
  }
}
```

## Structure des Composants

```
DashboardEnhanced/
├── En-tête avec bienvenue
│   ├── Message de bienvenue contexuel
│   ├── Mascotte animée
│   ├── Boutons de période
│   ├── Bouton personnalisé
│   ├── Bouton export
│   └── Bouton rafraîchir
├── Cartes de statistiques (4)
│   ├── Icône colorée
│   ├── Valeur principale
│   └── Badge de comparaison
├── Graphiques (2)
│   ├── Tendances quotidiennes (Line)
│   └── État des factures (Donut)
├── Listes Top 5 (2)
│   ├── Top 5 Clients
│   └── Top 5 Fournisseurs
└── Dialogs
    ├── Menu Export (PDF/Excel)
    └── Sélecteur de dates personnalisées
```

## Dépendances

Toutes les dépendances sont déjà installées:
- `@mui/material` - UI Components
- `@mui/icons-material` - Icons
- `react-chartjs-2` - Charts
- `chart.js` - Chart engine
- `axios` - HTTP client

## Troubleshooting

### Les statistiques ne se chargent pas

1. Vérifier que le backend Django est démarré
2. Vérifier l'URL de l'API dans `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:8000/api/v1
   ```
3. Vérifier la console browser pour les erreurs

### L'export ne fonctionne pas

1. Vérifier que l'endpoint `/api/v1/analytics/export/` est accessible
2. Vérifier les permissions de l'utilisateur
3. Vérifier la console browser pour les erreurs

### Les graphiques ne s'affichent pas

1. Vérifier que Chart.js est bien enregistré (ligne 55-64 de DashboardEnhanced.jsx)
2. Vérifier que les données arrivent bien de l'API
3. Vérifier la console browser pour les erreurs

## Prochaines Étapes Possibles

1. **Vues sauvegardées**: Permettre de sauvegarder des configurations de filtre
2. **Rapports planifiés**: Envoi automatique par email
3. **Plus de graphiques**: Barres, aires, scatter plots
4. **Filtres avancés**: Par module, par client/fournisseur, par produit
5. **Widgets personnalisables**: Drag & drop, réorganisation
6. **Mode sombre**: Support du thème sombre
7. **Temps réel**: WebSocket pour mise à jour en temps réel

## Support

Pour toute question ou problème:
1. Consulter [DASHBOARD_GUIDE.md](./DASHBOARD_GUIDE.md) pour la documentation backend
2. Vérifier les logs Django pour les erreurs backend
3. Vérifier la console browser pour les erreurs frontend
