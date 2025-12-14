# Guide d'Utilisation - Rapport PDF Simplifié

## 🎯 Nouveau Comportement

### 1️⃣ Cliquez sur "Rapport PDF"
```
┌─────────────────────────────────────┐
│  Factures                           │
│                                     │
│  [🔍 Rechercher...]  [📄 Rapport PDF] │
└─────────────────────────────────────┘
```

### 2️⃣ Génération Automatique
```
┌─────────────────────────────────────┐
│  📄 Générer un PDF du rapport       │
├─────────────────────────────────────┤
│                                     │
│         ⭕ Chargement...            │
│                                     │
│   Génération du rapport en cours... │
│                                     │
└─────────────────────────────────────┘
```

### 3️⃣ Choisissez une Action
```
┌─────────────────────────────────────┐
│  📄 Générer un PDF du rapport       │
├─────────────────────────────────────┤
│  ✅ Rapport généré avec succès !    │
│                                     │
│  Vous pouvez prévisualiser,         │
│  télécharger ou imprimer            │
│  directement le rapport.            │
├─────────────────────────────────────┤
│  [Annuler]  [👁 Aperçu]            │
│             [🖨 Imprimer]           │
│             [⬇ Télécharger]        │
└─────────────────────────────────────┘
```

## 🚀 Actions Disponibles

### 👁 Aperçu
- Ouvre le PDF dans un nouvel onglet
- Permet de visualiser avant de télécharger
- Idéal pour vérifier le contenu

### 🖨 Imprimer
- Ouvre directement la fenêtre d'impression
- Le PDF s'affiche dans un nouvel onglet
- Prêt à imprimer immédiatement

### ⬇ Télécharger
- Télécharge le PDF sur votre ordinateur
- Nom du fichier : `rapport-factures-[timestamp].pdf`
- Sauvegarde locale pour archivage

## 📊 Contenu du Rapport

Le rapport inclut automatiquement :

✅ **Toutes les factures filtrées**
- Respecte les filtres rapides (Payées, Impayées, etc.)
- Respecte les filtres avancés (Statut)
- Respecte la recherche par texte

✅ **Statistiques globales**
- Nombre total de factures
- Montant total
- Valeur moyenne

✅ **Répartition par statut**
- Brouillon
- Envoyée
- Payée
- En retard
- Annulée

✅ **Liste détaillée**
- Numéro de facture
- Client
- Date d'émission
- Date d'échéance
- Statut
- Montant

## 💡 Astuces

### Générer un rapport spécifique

**Pour les factures payées uniquement :**
1. Cliquez sur la carte "Payées" (verte)
2. Cliquez sur "Rapport PDF"
3. Le rapport contiendra uniquement les factures payées

**Pour les factures en retard :**
1. Cliquez sur la carte "En retard" (rouge)
2. Cliquez sur "Rapport PDF"
3. Le rapport contiendra uniquement les factures en retard

**Pour un client spécifique :**
1. Tapez le nom du client dans la recherche
2. Cliquez sur "Rapport PDF"
3. Le rapport contiendra uniquement les factures de ce client

### Impression optimale

Pour une meilleure qualité d'impression :
1. Utilisez le bouton "Aperçu" d'abord
2. Vérifiez le contenu dans le nouvel onglet
3. Fermez l'onglet
4. Cliquez sur "Imprimer"
5. Ajustez les paramètres d'impression si nécessaire

## ⚡ Performances

- **Génération rapide** : ~2-3 secondes pour 100 factures
- **Limite** : Maximum 500 factures par rapport
- **Format** : PDF optimisé pour l'impression et l'affichage

## 🔧 Dépannage

### Le rapport ne se génère pas
1. Vérifiez votre connexion Internet
2. Vérifiez que le backend est démarré
3. Consultez la console du navigateur (F12)

### Le PDF ne s'ouvre pas
1. Vérifiez que les popups ne sont pas bloqués
2. Autorisez les popups pour localhost
3. Essayez "Télécharger" au lieu de "Aperçu"

### Aucune facture dans le rapport
1. Vérifiez vos filtres actifs
2. Essayez de réinitialiser les filtres
3. Vérifiez qu'il y a des factures dans la base de données

## 📝 Différences avec l'Ancien Système

| Ancien | Nouveau |
|--------|---------|
| Dialogue de configuration | Génération directe ✅ |
| Sélection manuelle des factures | Automatique selon filtres ✅ |
| Sélection de dates | Automatique (toutes) ✅ |
| Téléchargement forcé | Choix d'action ✅ |
| 2 clics minimum | 2 clics (génération + action) ✅ |

## ✅ Avantages

1. **Plus rapide** - Moins d'étapes
2. **Plus simple** - Pas de configuration
3. **Plus flexible** - 3 actions au choix
4. **Plus intuitif** - Interface cohérente
5. **Plus pratique** - Filtres automatiques

---

**Besoin d'aide ?** Consultez `RAPPORT_PDF_SIMPLIFICATION.md` pour les détails techniques.

