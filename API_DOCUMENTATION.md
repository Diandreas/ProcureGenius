# API REST Documentation - Application de Gestion avec IA Chatbot

## Vue d'ensemble

Cette API REST permet d'interagir avec l'application de gestion. Elle suit les principes RESTful et utilise JSON pour les échanges de données.

## URL de base

```
http://localhost:8000/api/v1/
```

## Authentification

L'API utilise l'authentification par token. Pour obtenir un token :

```bash
POST /api/v1/auth/token/
Content-Type: application/json

{
  "username": "votre_username",
  "password": "votre_password"
}
```

Réponse :
```json
{
  "token": "votre_token_d_authentification"
}
```

Utilisez ce token dans l'en-tête de toutes vos requêtes :
```
Authorization: Token votre_token_d_authentification
```

## Endpoints

### Fournisseurs

#### Liste des fournisseurs
```
GET /api/v1/suppliers/
```

Paramètres de requête optionnels :
- `status` : active, pending, inactive, blocked
- `province` : QC, ON, BC, etc.
- `is_local` : true/false
- `category` : ID de la catégorie
- `min_rating` : Note minimale (0-5)
- `search` : Recherche dans nom, contact, email

#### Créer un fournisseur
```
POST /api/v1/suppliers/
Content-Type: application/json

{
  "name": "Nom du fournisseur",
  "contact_person": "Personne contact",
  "email": "contact@example.com",
  "phone": "514-555-0123",
  "address": "123 rue Example",
  "city": "Montréal",
  "province": "QC",
  "status": "active",
  "category_ids": [1, 2]
}
```

#### Détail d'un fournisseur
```
GET /api/v1/suppliers/{id}/
```

#### Modifier un fournisseur
```
PUT /api/v1/suppliers/{id}/
PATCH /api/v1/suppliers/{id}/
```

#### Supprimer un fournisseur
```
DELETE /api/v1/suppliers/{id}/
```

#### Actions spéciales
```
POST /api/v1/suppliers/{id}/toggle_status/
GET /api/v1/suppliers/export_csv/
```

### Bons de commande

#### Liste des bons de commande
```
GET /api/v1/purchase-orders/
```

Paramètres :
- `status` : draft, pending, approved, sent, received, cancelled
- `supplier` : ID du fournisseur
- `date_from` : Date de début (YYYY-MM-DD)
- `date_to` : Date de fin (YYYY-MM-DD)

#### Créer un bon de commande
```
POST /api/v1/purchase-orders/
Content-Type: application/json

{
  "title": "Titre du bon de commande",
  "description": "Description",
  "supplier": "uuid-du-fournisseur",
  "currency": "CAD",
  "required_date": "2024-12-31",
  "delivery_address": "Adresse de livraison",
  "terms_conditions": "Conditions"
}
```

#### Ajouter un item
```
POST /api/v1/purchase-orders/{id}/add_item/
Content-Type: application/json

{
  "product_reference": "REF-001",
  "description": "Description du produit",
  "quantity": 10,
  "unit_price": "99.99",
  "unit_of_measure": "unité"
}
```

#### Approuver un bon de commande
```
POST /api/v1/purchase-orders/{id}/approve/
```

### Factures

#### Liste des factures
```
GET /api/v1/invoices/
```

Paramètres :
- `status` : draft, sent, paid, cancelled
- `client` : ID du client
- `overdue` : true (factures en retard)
- `date_from` : Date de début
- `date_to` : Date de fin

#### Créer une facture
```
POST /api/v1/invoices/
Content-Type: application/json

{
  "title": "Titre de la facture",
  "description": "Description",
  "client": "uuid-du-client",
  "currency": "CAD",
  "due_date": "2024-12-31",
  "billing_address": "Adresse de facturation",
  "terms_conditions": "Conditions"
}
```

#### Ajouter un item
```
POST /api/v1/invoices/{id}/add_item/
Content-Type: application/json

{
  "product": "uuid-du-produit",
  "description": "Description",
  "quantity": 5,
  "unit_price": "150.00",
  "discount_percent": 10
}
```

#### Envoyer une facture
```
POST /api/v1/invoices/{id}/send/
```

#### Marquer comme payée
```
POST /api/v1/invoices/{id}/mark_paid/
Content-Type: application/json

{
  "payment_method": "credit_card",
  "payment_reference": "REF-PAYMENT-123"
}
```

### Produits

#### Liste des produits
```
GET /api/v1/products/
```

#### Produits en rupture de stock
```
GET /api/v1/products/low_stock/
```

### Clients

#### Liste des clients
```
GET /api/v1/clients/
```

### Tableau de bord

#### Statistiques générales
```
GET /api/v1/dashboard/stats/
```

Réponse :
```json
{
  "total_suppliers": 25,
  "active_suppliers": 20,
  "total_purchase_orders": 150,
  "pending_purchase_orders": 5,
  "total_invoices": 200,
  "unpaid_invoices": 10,
  "total_revenue": "50000.00",
  "total_expenses": "30000.00"
}
```

#### Activité récente
```
GET /api/v1/dashboard/recent/
```

## Codes de statut HTTP

- `200 OK` : Requête réussie
- `201 Created` : Ressource créée avec succès
- `204 No Content` : Suppression réussie
- `400 Bad Request` : Données invalides
- `401 Unauthorized` : Token manquant ou invalide
- `403 Forbidden` : Permissions insuffisantes
- `404 Not Found` : Ressource non trouvée
- `500 Internal Server Error` : Erreur serveur

## Pagination

Les listes sont paginées par défaut (20 items par page) :

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/suppliers/?page=2",
  "previous": null,
  "results": [...]
}
```

## Filtrage et tri

### Filtrage
Utilisez les paramètres de requête pour filtrer :
```
GET /api/v1/suppliers/?status=active&province=QC
```

### Tri
Utilisez le paramètre `ordering` :
```
GET /api/v1/suppliers/?ordering=-created_at
GET /api/v1/suppliers/?ordering=name,-rating
```

### Recherche
Utilisez le paramètre `search` :
```
GET /api/v1/suppliers/?search=montreal
```

## Exemples avec cURL

### Obtenir un token
```bash
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Liste des fournisseurs
```bash
curl -X GET http://localhost:8000/api/v1/suppliers/ \
  -H "Authorization: Token votre_token"
```

### Créer un fournisseur
```bash
curl -X POST http://localhost:8000/api/v1/suppliers/ \
  -H "Authorization: Token votre_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouveau Fournisseur",
    "email": "contact@example.com",
    "status": "active"
  }'
```

## Intégration React

Exemple d'utilisation avec Axios :

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const token = localStorage.getItem('authToken');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  }
});

// Obtenir la liste des fournisseurs
const getSuppliers = async () => {
  try {
    const response = await api.get('/suppliers/');
    return response.data;
  } catch (error) {
    console.error('Erreur:', error);
  }
};

// Créer un nouveau fournisseur
const createSupplier = async (supplierData) => {
  try {
    const response = await api.post('/suppliers/', supplierData);
    return response.data;
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```