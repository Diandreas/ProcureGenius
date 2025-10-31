# 📊 Guide Complet du Dashboard ProcureGenius

## Vue d'ensemble

Le dashboard ProcureGenius offre une vue complète et personnalisable des statistiques de votre entreprise avec:
- ✅ **Statistiques en temps réel** pour tous les modules actifs
- ✅ **Filtres personnalisables** (période, comparaisons, indicateurs)
- ✅ **Export PDF et Excel** professionnel
- ✅ **Sauvegarde des préférences** utilisateur
- ✅ **Vues multiples** personnalisables

---

## 🔗 Endpoints API

### 1. Statistiques du Dashboard

**GET** `/api/v1/analytics/stats/`

Récupère les statistiques complètes du dashboard avec filtres personnalisés.

#### Paramètres Query (optionnels):

| Paramètre | Valeurs possibles | Défaut | Description |
|-----------|-------------------|--------|-------------|
| `period` | `today`, `yesterday`, `last_7_days`, `last_30_days`, `last_90_days`, `this_month`, `last_month`, `this_year`, `custom` | `last_30_days` | Période d'analyse |
| `start_date` | `YYYY-MM-DD` | - | Date de début (si period=custom) |
| `end_date` | `YYYY-MM-DD` | - | Date de fin (si period=custom) |
| `compare` | `true`, `false` | `true` | Comparer avec période précédente |
| `modules` | `suppliers,invoices,purchase_orders,clients,products` | tous | Modules à inclure (séparés par virgules) |

#### Exemples:

```bash
# Stats des 30 derniers jours avec comparaison
GET /api/v1/analytics/stats/?period=last_30_days&compare=true

# Stats du mois en cours
GET /api/v1/analytics/stats/?period=this_month

# Période personnalisée
GET /api/v1/analytics/stats/?period=custom&start_date=2025-01-01&end_date=2025-01-31

# Uniquement factures et clients
GET /api/v1/analytics/stats/?modules=invoices,clients
```

#### Réponse:

```json
{
  "success": true,
  "data": {
    "metadata": {
      "start_date": "2025-09-25T00:00:00",
      "end_date": "2025-10-25T23:59:59",
      "period_days": 30,
      "generated_at": "2025-10-25T22:50:00",
      "compare_previous": true
    },
    "enabled_modules": ["suppliers", "invoices", "purchase_orders", "clients", "products"],
    "financial": {
      "revenue": 150000.00,
      "expenses": 85000.00,
      "net_profit": 65000.00,
      "profit_margin": 43.33,
      "pending_revenue": 25000.00,
      "comparison": {
        "previous_revenue": 140000.00,
        "revenue_percent_change": 7.14
      }
    },
    "invoices": {
      "total": 245,
      "by_status": {
        "draft": 12,
        "sent": 35,
        "paid": 190,
        "overdue": 8
      },
      "period": {
        "count": 45,
        "total_amount": 150000.00,
        "paid_amount": 120000.00,
        "payment_rate": 80.0,
        "daily_trend": [
          {
            "date": "2025-10-01",
            "count": 3,
            "amount": 5000.00,
            "paid_amount": 4000.00
          }
        ]
      }
    }
  }
}
```

---

### 2. Export Dashboard (PDF/Excel)

**POST** `/api/v1/analytics/export/`

Exporte les statistiques au format PDF ou Excel.

#### Body (JSON):

```json
{
  "format": "pdf",  // ou "xlsx"
  "period": "last_30_days",
  "start_date": "2025-10-01",  // optionnel si period=custom
  "end_date": "2025-10-31",    // optionnel si period=custom
  "compare": true
}
```

#### Réponse:

Fichier téléchargeable (PDF ou Excel)

#### Exemples:

```bash
# Export PDF du mois
curl -X POST http://localhost:8000/api/v1/analytics/export/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf","period":"this_month"}' \
  --output dashboard.pdf

# Export Excel personnalisé
curl -X POST http://localhost:8000/api/v1/analytics/export/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"xlsx","period":"custom","start_date":"2025-01-01","end_date":"2025-03-31"}' \
  --output dashboard.xlsx
```

---

### 3. Configuration Utilisateur

**GET** `/api/v1/analytics/config/`

Récupère la configuration du dashboard de l'utilisateur.

#### Réponse:

```json
{
  "success": true,
  "data": {
    "default_period": "last_30_days",
    "enabled_widgets": [
      "financial_summary",
      "revenue_chart",
      "expenses_chart",
      "invoices_stats",
      "purchase_orders_stats",
      "top_clients",
      "top_suppliers",
      "stock_alerts",
      "recent_activity"
    ],
    "favorite_metrics": [
      "revenue",
      "net_profit",
      "profit_margin",
      "pending_revenue",
      "new_invoices",
      "new_clients"
    ],
    "compare_previous_period": true,
    "export_format": "pdf",
    "email_report_enabled": false,
    "email_report_frequency": "weekly"
  }
}
```

**PUT** `/api/v1/analytics/config/`

Met à jour la configuration.

#### Body (JSON):

```json
{
  "default_period": "last_7_days",
  "enabled_widgets": ["financial_summary", "revenue_chart", "invoices_stats"],
  "favorite_metrics": ["revenue", "net_profit"],
  "compare_previous_period": false,
  "export_format": "xlsx"
}
```

---

### 4. Vues Sauvegardées

**GET** `/api/v1/analytics/saved-views/`

Liste toutes les vues sauvegardées.

**POST** `/api/v1/analytics/saved-views/`

Crée une nouvelle vue sauvegardée.

#### Body:

```json
{
  "name": "Vue Trimestrielle",
  "description": "Vue pour l'analyse trimestrielle",
  "configuration": {
    "period": "custom",
    "start_date": "2025-07-01",
    "end_date": "2025-09-30",
    "modules": ["invoices", "purchase_orders", "financial"],
    "compare": true
  },
  "is_default": false
}
```

**DELETE** `/api/v1/analytics/saved-views/{view_id}/`

Supprime une vue sauvegardée.

---

## 📈 Statistiques Disponibles

### Résumé Financier

- Revenus (factures payées)
- Dépenses (bons de commande)
- Profit net
- Marge bénéficiaire
- Revenus en attente
- **Comparaison** avec période précédente

### Factures

- Total factures
- Répartition par statut (draft, sent, paid, overdue, cancelled)
- Nouvelles factures (période)
- Montant total / payé / en attente
- Taux de paiement
- **Tendance quotidienne** (graphique)
- **Comparaison** avec période précédente

### Bons de Commande

- Total BCs
- Répartition par statut
- Nouveaux BCs (période)
- Montant total / moyen
- **Tendance quotidienne** (graphique)
- **Comparaison** avec période précédente

### Clients

- Total clients
- Clients actifs
- Nouveaux clients (période)
- Clients avec revenus (période)
- **Top 5 clients** par chiffre d'affaires
- **Comparaison** avec période précédente

### Fournisseurs

- Total fournisseurs
- Fournisseurs actifs
- Nouveaux fournisseurs (période)
- Répartition par note (1-5 étoiles)
- **Top 5 fournisseurs** par volume
- **Comparaison** avec période précédente

### Produits & Stock

- Total produits
- Produits actifs
- Répartition par type (physique/service)
- **Alertes stock** (stock bas/rupture)
- Valeur totale du stock
- **Top 5 produits** les plus vendus

### Métriques de Performance

- Délai moyen de paiement des factures
- Taux de conversion (draft → paid)

---

## 🎨 Widgets Disponibles

Widgets personnalisables pour le dashboard:

1. **financial_summary** - Résumé financier global
2. **revenue_chart** - Graphique des revenus
3. **expenses_chart** - Graphique des dépenses
4. **invoices_stats** - Statistiques factures détaillées
5. **purchase_orders_stats** - Statistiques BCs
6. **top_clients** - Top 5 clients
7. **top_suppliers** - Top 5 fournisseurs
8. **stock_alerts** - Alertes de stock
9. **recent_activity** - Activité récente
10. **performance_metrics** - Métriques de performance

---

## 📤 Export

### Format PDF

Le PDF inclut:
- En-tête avec période et informations
- Résumé financier avec variations
- Statistiques par module
- Top clients et fournisseurs
- Produits et alertes de stock
- **Graphiques** (si disponibles)
- Mise en page professionnelle A4 paysage

### Format Excel

Le fichier Excel contient:
- Feuille "Résumé" avec vue d'ensemble
- Feuille "Factures" avec détails
- Feuille "Bons de Commande"
- Feuille "Clients" (top clients)
- Feuille "Fournisseurs" (top fournisseurs)
- Feuille "Produits & Stock"
- **Formatage professionnel** avec couleurs

---

## 🔄 Comparaison avec Période Précédente

Lorsque `compare=true`, le système:

1. Calcule automatiquement la période précédente (même durée)
2. Compare toutes les métriques clés
3. Affiche les variations en **pourcentage** et **valeur absolue**
4. Utilise des symboles: ▲ (hausse) / ▼ (baisse) / = (stable)

### Exemple:

Période actuelle: 01/10/2025 - 31/10/2025 (30 jours)
Période précédente: 01/09/2025 - 30/09/2025 (30 jours)

```json
{
  "revenue": 150000.00,
  "comparison": {
    "previous_revenue": 140000.00,
    "revenue_change": 10000.00,
    "revenue_percent_change": 7.14
  }
}
```

---

## 💡 Cas d'Usage

### 1. Tableau de Bord Mensuel

```javascript
// Récupérer stats du mois avec comparaison au mois précédent
fetch('/api/v1/analytics/stats/?period=this_month&compare=true')
  .then(res => res.json())
  .then(data => {
    console.log('Revenus:', data.data.financial.revenue);
    console.log('Variation:', data.data.financial.comparison.revenue_percent_change + '%');
  });
```

### 2. Export Rapport Trimestriel

```javascript
// Exporter Q3 2025 en PDF
fetch('/api/v1/analytics/export/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    format: 'pdf',
    period: 'custom',
    start_date: '2025-07-01',
    end_date: '2025-09-30',
    compare: true
  })
})
.then(res => res.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rapport_Q3_2025.pdf';
  a.click();
});
```

### 3. Dashboard Personnalisé

```javascript
// Créer une vue sauvegardée
fetch('/api/v1/analytics/saved-views/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Vue Finances uniquement',
    description: 'Pour suivre uniquement les finances',
    configuration: {
      modules: ['invoices', 'purchase_orders', 'financial'],
      period: 'last_30_days',
      compare: true
    },
    is_default: true
  })
});
```

---

## 🚀 Intégration Frontend

### Exemple React Component

```jsx
import { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('last_30_days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    const response = await fetch(
      `/api/v1/analytics/stats/?period=${period}&compare=true`
    );
    const data = await response.json();
    setStats(data.data);
    setLoading(false);
  };

  const exportPDF = async () => {
    const response = await fetch('/api/v1/analytics/export/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'pdf', period })
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url);
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="dashboard">
      <header>
        <h1>Tableau de Bord</h1>
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="today">Aujourd'hui</option>
          <option value="last_7_days">7 derniers jours</option>
          <option value="last_30_days">30 derniers jours</option>
          <option value="this_month">Ce mois</option>
          <option value="this_year">Cette année</option>
        </select>
        <button onClick={exportPDF}>Exporter PDF</button>
      </header>

      {/* Résumé financier */}
      <section className="financial-summary">
        <h2>Résumé Financier</h2>
        <div className="metrics">
          <div className="metric">
            <label>Revenus</label>
            <span className="value">
              {stats.financial.revenue.toFixed(2)} €
            </span>
            {stats.financial.comparison && (
              <span className={
                stats.financial.comparison.revenue_percent_change > 0
                  ? 'positive' : 'negative'
              }>
                {stats.financial.comparison.revenue_percent_change > 0 ? '▲' : '▼'}
                {Math.abs(stats.financial.comparison.revenue_percent_change).toFixed(1)}%
              </span>
            )}
          </div>
          {/* Autres métriques... */}
        </div>
      </section>

      {/* Autres sections... */}
    </div>
  );
}
```

---

## 📝 Notes Importantes

1. **Authentification requise**: Tous les endpoints nécessitent un token d'authentification valide
2. **Permissions**: L'utilisateur ne voit que les statistiques des modules auxquels il a accès
3. **Performance**: Les stats sont calculées en temps réel, les grandes périodes peuvent prendre quelques secondes
4. **Timezone**: Toutes les dates utilisent le timezone configuré dans Django (UTC par défaut)
5. **Cache**: Considérez l'ajout de cache pour les requêtes fréquentes
6. **Limite**: Les tendances quotidiennes sont limitées à 365 jours maximum

---

## 🛠️ Développement

### Ajouter un Nouveau Module de Stats

1. Ouvrir `apps/analytics/dashboard_service.py`
2. Ajouter une méthode `get_VOTRE_MODULE_stats()`
3. L'ajouter dans `get_comprehensive_stats()`
4. Mettre à jour la documentation

### Ajouter un Nouveau Widget

1. Ajouter le widget dans `DashboardConfig.get_default_widgets()`
2. Implémenter la logique frontend
3. Documenter dans ce guide

---

## 📞 Support

Pour toute question ou problème:
- 📧 Email: support@procuregenius.com
- 📚 Documentation: https://docs.procuregenius.com
- 🐛 Issues: https://github.com/procuregenius/issues

---

**Version**: 2.0.0
**Dernière mise à jour**: 25 Octobre 2025
**Auteur**: ProcureGenius Team
