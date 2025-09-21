# Architecture de l'Application de Gestion avec IA Chatbot

## Vue d'ensemble

Cette application est construite avec une architecture moderne séparant le backend (Django REST API) et le frontend (React.js), avec un module d'IA intégré utilisant Mistral AI.

## Structure du projet

```
/workspace/
├── apps/                    # Applications Django
│   ├── api/                # API REST principale
│   ├── suppliers/          # Gestion des fournisseurs
│   ├── purchase_orders/    # Bons de commande
│   ├── invoicing/          # Facturation
│   ├── accounts/           # Gestion des utilisateurs
│   ├── ai_assistant/       # Module IA
│   └── core/              # Fonctionnalités de base
├── frontend/              # Application React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── layouts/       # Layouts de l'application
│   │   ├── pages/         # Pages/vues
│   │   ├── services/      # Services API
│   │   ├── store/         # Redux store
│   │   └── utils/         # Utilitaires
│   └── package.json
├── templates/             # Templates Django (à supprimer après migration)
├── static/                # Fichiers statiques Django
└── manage.py             # Script de gestion Django
```

## Backend - Django REST API

### Technologies utilisées
- **Django 5.0.3** : Framework web Python
- **Django REST Framework 3.14** : Construction d'APIs REST
- **PostgreSQL/SQLite** : Base de données
- **Redis** : Cache et sessions
- **Celery** : Tâches asynchrones (optionnel)

### Endpoints principaux

#### Authentification
- `POST /api/v1/auth/token/` : Obtenir un token d'authentification

#### Fournisseurs
- `GET /api/v1/suppliers/` : Liste des fournisseurs
- `POST /api/v1/suppliers/` : Créer un fournisseur
- `GET /api/v1/suppliers/{id}/` : Détail d'un fournisseur
- `PUT/PATCH /api/v1/suppliers/{id}/` : Modifier un fournisseur
- `DELETE /api/v1/suppliers/{id}/` : Supprimer un fournisseur

#### Bons de commande
- `GET /api/v1/purchase-orders/` : Liste des bons de commande
- `POST /api/v1/purchase-orders/` : Créer un bon de commande
- `POST /api/v1/purchase-orders/{id}/add_item/` : Ajouter un item
- `POST /api/v1/purchase-orders/{id}/approve/` : Approuver

#### Factures
- `GET /api/v1/invoices/` : Liste des factures
- `POST /api/v1/invoices/` : Créer une facture
- `POST /api/v1/invoices/{id}/send/` : Envoyer
- `POST /api/v1/invoices/{id}/mark_paid/` : Marquer comme payée

### Modèles de données

#### Supplier (Fournisseur)
```python
- name: Nom
- contact_person: Personne contact
- email: Email
- phone: Téléphone
- address: Adresse
- city: Ville
- province: Province
- status: Statut (active, pending, inactive, blocked)
- rating: Note (0-5)
- categories: Catégories (ManyToMany)
```

#### PurchaseOrder (Bon de commande)
```python
- po_number: Numéro unique
- supplier: Fournisseur (ForeignKey)
- status: Statut
- items: Articles (OneToMany)
- total_amount: Montant total
- created_by: Créateur
```

#### Invoice (Facture)
```python
- invoice_number: Numéro unique
- client: Client (ForeignKey)
- status: Statut
- items: Articles (OneToMany)
- total_amount: Montant total
- due_date: Date d'échéance
```

## Frontend - React.js

### Technologies utilisées
- **React 18.2** : Bibliothèque UI
- **Redux Toolkit** : Gestion d'état
- **Material-UI 5** : Composants UI
- **React Router 6** : Routing
- **Axios** : Requêtes HTTP
- **Formik + Yup** : Formulaires et validation
- **Chart.js** : Graphiques

### Structure des composants

```
src/
├── components/
│   ├── common/          # Composants partagés
│   ├── forms/           # Composants de formulaire
│   └── guards/          # Route guards
├── layouts/
│   ├── MainLayout.jsx   # Layout principal avec sidebar
│   └── AuthLayout.jsx   # Layout pour l'authentification
├── pages/
│   ├── Dashboard.jsx    # Tableau de bord
│   ├── suppliers/       # Pages fournisseurs
│   ├── purchase-orders/ # Pages bons de commande
│   ├── invoices/        # Pages factures
│   └── ai-chat/         # Interface IA
├── services/
│   └── api.js          # Services API
├── store/
│   ├── store.js        # Configuration Redux
│   └── slices/         # Redux slices
└── utils/
    └── formatters.js   # Utilitaires de formatage
```

### Flux de données

1. **Authentification** : Token JWT stocké dans localStorage
2. **État global** : Redux pour les données partagées
3. **API calls** : Axios avec intercepteurs pour l'auth
4. **Routing** : Routes protégées avec PrivateRoute

## Module IA - Mistral AI

### Fonctionnalités planifiées

1. **Chat conversationnel**
   - Interface type ChatGPT
   - Historique des conversations
   - Contexte persistant

2. **Actions système**
   - Création d'entités via conversation
   - Recherche et consultation
   - Modification et suppression
   - Génération de rapports

3. **Scanning de documents**
   - Intégration caméra/upload
   - OCR avec extraction de données
   - Ajout automatique en base

### Architecture IA

```python
# apps/ai_assistant/
├── models.py          # Modèles de conversation
├── services.py        # Service Mistral AI
├── actions.py         # Actions système
├── serializers.py     # Serializers API
└── views.py          # Endpoints API
```

### Intégration Mistral AI

```python
# Configuration
MISTRAL_API_KEY = "votre_clé_api"
MISTRAL_MODEL = "mistral-large"

# Service
class MistralService:
    def chat(prompt, context):
        # Appel API Mistral
        # Traitement de la réponse
        # Exécution d'actions si nécessaire
```

## Progressive Web App (PWA)

### Fonctionnalités PWA

1. **Service Worker** : Cache et offline
2. **Manifest** : Installation sur mobile
3. **Responsive** : Adaptatif mobile/desktop
4. **Push notifications** : Alertes temps réel

### Configuration PWA

```javascript
// public/manifest.json
{
  "name": "Application de Gestion",
  "short_name": "GestionApp",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4F46E5",
  "background_color": "#ffffff"
}
```

## Déploiement

### Développement

```bash
# Backend
cd /workspace
python manage.py runserver

# Frontend
cd /workspace/frontend
npm install
npm run dev
```

### Production

1. **Backend**
   - Gunicorn + Nginx
   - PostgreSQL
   - Redis
   - Celery + RabbitMQ

2. **Frontend**
   - Build React : `npm run build`
   - Servir avec Nginx
   - CDN pour les assets

## Sécurité

1. **Authentification** : Token JWT
2. **CORS** : Configuration stricte
3. **HTTPS** : SSL/TLS obligatoire
4. **Validation** : Côté client et serveur
5. **Permissions** : RBAC (Role-Based Access Control)

## Performance

1. **Pagination** : API et frontend
2. **Cache** : Redis pour les données fréquentes
3. **Lazy loading** : Chargement à la demande
4. **Optimisation** : Minification, compression
5. **CDN** : Assets statiques

## Prochaines étapes

1. ✅ Structure de base créée
2. ✅ API REST fonctionnelle
3. ✅ Frontend React initialisé
4. ⏳ Implémenter les pages détaillées
5. ⏳ Intégrer Mistral AI
6. ⏳ Ajouter le scanning OCR
7. ⏳ Convertir en PWA
8. ⏳ Tests et optimisation
9. ⏳ Déploiement