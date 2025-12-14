# Implémentation des Rapports PDF par Module

## Vue d'ensemble

Ce document décrit l'implémentation complète du système de rapports PDF pour les modules **Suppliers**, **Clients** et **Products** en utilisant **WeasyPrint**.

## Architecture

### Backend (Django)

#### 1. Service de Génération PDF (`apps/api/services/report_generator_weasy.py`)

Service unifié utilisant WeasyPrint pour générer des rapports PDF professionnels avec:
- Support HTML/CSS pour des designs modernes
- QR codes pour vérification
- Logos d'organisation
- Statistiques détaillées
- Tableaux et graphiques

**Méthodes principales:**
- `generate_supplier_report()` - Rapport fournisseur
- `generate_client_report()` - Rapport client  
- `generate_product_report()` - Rapport produit

#### 2. Endpoints API

**Suppliers** (`apps/api/views.py`):
```
GET /api/suppliers/{id}/pdf-report/
```

**Clients** (`apps/api/views.py`):
```
GET /api/clients/{id}/pdf-report/
```

**Products** (`apps/api/views.py`):
```
GET /api/products/{id}/pdf-report/
```

Chaque endpoint:
- Génère un PDF avec WeasyPrint
- Retourne le fichier en streaming
- Gère les erreurs avec fallback approprié
- Authentification requise

### Frontend (React)

#### 1. Service PDF (`frontend/src/services/pdfReportService.js`)

Service frontend unifié pour gérer les téléchargements:
- `downloadSupplierReport(supplierId)` - Télécharge rapport fournisseur
- `downloadClientReport(clientId)` - Télécharge rapport client
- `downloadProductReport(productId)` - Télécharge rapport produit
- `viewReport(entityId, entityType)` - Ouvre dans nouvel onglet
- `downloadReport(entityId, entityType)` - Méthode générique

**Caractéristiques:**
- Gestion automatique des blobs
- Nettoyage mémoire
- Noms de fichiers avec timestamps
- Gestion d'erreurs complète

#### 2. Boutons d'Interface

Boutons PDF subtils ajoutés dans les pages de détail:

**ClientDetail.jsx:**
- Bouton vert avec icône PDF
- Loading spinner pendant le téléchargement
- Tooltip explicatif
- Placement subtil à côté Edit/Delete

**SupplierDetail.jsx:**
- Bouton outline avec icône PDF
- Intégré dans la barre d'actions
- Messages de succès/erreur

**ProductDetail.jsx:**
- Bouton IconButton avec icône PDF
- Design cohérent avec les autres actions
- État disabled pendant téléchargement

## Templates HTML WeasyPrint

### Template de Base (`templates/reports/pdf/base_report.html`)

Template parent réutilisable avec:
- Styles CSS3 modernes
- En-tête avec logo organisation
- Pied de page avec QR code
- Grilles responsives
- Badges de statut
- Cartes statistiques colorées

### Templates Spécifiques

#### 1. Rapport Fournisseur (`templates/reports/pdf/supplier_report.html`)

**Sections:**
- Informations générales (nom, contact, adresse)
- Statut et évaluation (note, local/international)
- Statistiques financières (total dépensé, nb commandes, valeur moyenne)
- Répartition des commandes par statut
- Top 10 produits/services achetés
- Activité récente (6 derniers mois)
- Notes

#### 2. Rapport Client (`templates/reports/pdf/client_report.html`)

**Sections:**
- Informations générales et commerciales
- Statistiques financières (total facturé, nb factures, valeur moyenne)
- Répartition des factures par statut
- Factures récentes (20 dernières)
- Résumé de la relation commerciale

#### 3. Rapport Produit (`templates/reports/pdf/product_report.html`)

**Sections:**
- Informations générales (SKU, référence, type)
- Informations commerciales (prix, coût, stock)
- Statistiques ventes/achats (unités vendues, revenu, achats)
- Liste des fournisseurs associés
- Ventes récentes (15 dernières)
- Achats récents (15 derniers)
- Résumé de performance

## Design & UX

### Boutons d'Action

**Couleur:** Vert (success) pour se distinguer
**Icône:** PictureAsPdf de Material-UI
**Placement:** Avant les boutons Edit/Delete
**État:** Loading spinner pendant génération
**Feedback:** Toast notification (succès/erreur)

### Rapports PDF

**Format:** A4 Portrait
**Marges:** 15mm
**Police:** System fonts (Helvetica, Arial, Segoe UI)
**Couleurs:**
- Primaire: #2563eb (bleu)
- Succès: #10b981 (vert)
- Warning: #f59e0b (orange)
- Danger: #ef4444 (rouge)

**Éléments visuels:**
- QR codes pour vérification
- Badges colorés pour statuts
- Cartes statistiques avec gradients
- Tableaux alternés pour lisibilité
- Highlight boxes pour informations importantes

## Données Incluses

### Fournisseurs
- Coordonnées complètes
- Note et statut
- Total dépensé & nombre de commandes
- Commandes par statut
- Top produits achetés
- Historique d'activité

### Clients
- Coordonnées & infos fiscales
- Conditions de paiement
- Total facturé & nombre de factures
- Factures par statut
- Factures récentes
- Analyse de la relation

### Produits
- Détails produit (SKU, ref, type)
- Prix et coûts
- Stock actuel (si physique)
- Statistiques ventes/achats
- Fournisseurs associés
- Historique transactions

## Gestion d'Erreurs

### Backend
- Try/catch sur génération WeasyPrint
- Messages d'erreur clairs
- Codes HTTP appropriés (503, 500)
- Logging des erreurs

### Frontend
- Try/catch sur requêtes API
- Toast notifications utilisateur
- États de loading
- Fallback gracieux

## Installation & Configuration

### Prérequis Backend

```bash
pip install weasyprint
pip install qrcode
pip install Pillow
```

**Note:** WeasyPrint nécessite GTK3 sur Windows. Voir `INSTALL_GTK3_WINDOWS.md`

### Configuration Django

Les templates sont automatiquement détectés dans:
```
templates/reports/pdf/
```

Aucune configuration supplémentaire nécessaire.

### Frontend

Le service est importé automatiquement:
```javascript
import pdfReportService from '../../services/pdfReportService';
```

## Utilisation

### Depuis l'Interface

1. Naviguer vers la page de détail (Client, Fournisseur ou Produit)
2. Cliquer sur le bouton vert avec icône PDF
3. Le rapport se télécharge automatiquement
4. Notification de succès/erreur

### Depuis l'API

```bash
# Fournisseur
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/suppliers/123/pdf-report/ \
  -o rapport-fournisseur.pdf

# Client
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/clients/456/pdf-report/ \
  -o rapport-client.pdf

# Produit
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/products/789/pdf-report/ \
  -o rapport-produit.pdf
```

### Depuis le Code

```javascript
import pdfReportService from './services/pdfReportService';

// Télécharger
await pdfReportService.downloadSupplierReport(supplierId);
await pdfReportService.downloadClientReport(clientId);
await pdfReportService.downloadProductReport(productId);

// Visualiser dans nouvel onglet
await pdfReportService.viewReport(entityId, 'supplier');
```

## Performance

- **Génération:** ~2-5 secondes selon complexité
- **Taille fichier:** 100-500 KB typiquement
- **Streaming:** Pas de mise en cache (génération à la demande)
- **Optimisations:** Images en base64, CSS inline

## Évolutions Futures

### Court Terme
- [ ] Cache des rapports (Redis)
- [ ] Génération asynchrone (Celery)
- [ ] Plus de templates (Minimal, Professional)
- [ ] Export Excel en complément

### Moyen Terme
- [ ] Rapports agrégés (tous les clients)
- [ ] Rapports périodiques automatiques
- [ ] Envoi par email
- [ ] Comparaisons périodiques

### Long Terme
- [ ] Graphiques et charts dynamiques
- [ ] Personnalisation des templates
- [ ] Multi-langue dans les PDFs
- [ ] Signatures numériques

## Support

Pour toute question ou problème:
1. Vérifier les logs Django
2. Vérifier la console navigateur
3. Tester les endpoints API directement
4. Vérifier l'installation de WeasyPrint

## Notes Importantes

- ⚠️ **Contracts et E-Sourcing:** Non implémentés (sur demande de l'utilisateur)
- ✅ **Modules supportés:** Suppliers, Clients, Products uniquement
- 🎨 **Design:** Cohérent avec le reste de l'application
- 🔒 **Sécurité:** Authentification requise, filtrage par organisation

## Résumé des Fichiers Créés/Modifiés

### Backend
- ✨ `apps/api/services/report_generator_weasy.py` (nouveau)
- 📝 `apps/api/views.py` (modifié - ajout endpoints Suppliers, Clients, Products)
- 📝 `templates/reports/pdf/base_report.html` (nouveau)
- 📝 `templates/reports/pdf/supplier_report.html` (nouveau)
- 📝 `templates/reports/pdf/client_report.html` (nouveau)
- 📝 `templates/reports/pdf/product_report.html` (nouveau)

### Frontend
- ✨ `frontend/src/services/pdfReportService.js` (nouveau)
- 📝 `frontend/src/pages/clients/ClientDetail.jsx` (modifié)
- 📝 `frontend/src/pages/suppliers/SupplierDetail.jsx` (modifié)
- 📝 `frontend/src/pages/products/ProductDetail.jsx` (modifié)

---

**Date d'implémentation:** Décembre 2025
**Version:** 1.0.0
**Statut:** ✅ Complet et fonctionnel

