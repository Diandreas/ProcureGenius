# Guide de Test des Corrections

## 🔍 Tests à Effectuer

### 1. Test Facture - Affichage Client ✓

**Étapes:**
1. Accéder à une facture existante (ou en créer une nouvelle)
2. Vérifier l'affichage du client sur la page de détail

**Résultat attendu:**
- ✅ Le nom du client s'affiche correctement
- ✅ L'email du client s'affiche
- ✅ Possibilité de naviguer vers la fiche client
- ✅ Plus d'erreur "Cannot read property 'name' of undefined"

**URL de test:** `/invoices/{id}`

---

### 2. Test Facture - Calcul Total Articles ✓

**Étapes:**
1. Créer une nouvelle facture
2. Ajouter des articles avec quantité et prix
3. Vérifier les totaux affichés

**Résultat attendu:**
- ✅ Le total de chaque article = quantité × prix unitaire - remise
- ✅ Le total n'est plus à 0
- ✅ Le sous-total de la facture est correct
- ✅ Le total TTC est calculé

**Calcul:**
```
Article: 5 × 100$ avec 10% remise
Total attendu: (5 × 100) - 50 = 450$
```

---

### 3. Test Facture - Validation Stock ✓

**Étapes:**
1. Identifier un produit physique avec stock limité (ex: 5 unités)
2. Créer une facture
3. Tenter d'ajouter cet article avec quantité > stock (ex: 10 unités)

**Résultat attendu:**
- ✅ Message d'erreur: "Stock insuffisant. Disponible: 5, Demandé: 10"
- ✅ L'article n'est pas ajouté à la facture
- ✅ Le stock n'est pas impacté

**Note:** Cette validation fonctionne uniquement pour les produits physiques (pas pour les services).

---

### 4. Test Facture - Créé Par ✓

**Étapes:**
1. Accéder à une facture existante
2. Faire défiler jusqu'à la sidebar "Créé par"

**Résultat attendu:**
- ✅ Prénom et nom de l'utilisateur affichés
- ✅ Email de l'utilisateur affiché
- ✅ Avatar avec initiales
- ✅ Plus d'erreur console

---

### 5. Test Client - Produits Achetés ✓

**Étapes:**
1. Accéder à la fiche d'un client qui a des factures
2. Cliquer sur l'onglet "Produits achetés"

**Résultat attendu:**
- ✅ Liste des produits affichée
- ✅ Nom du produit visible
- ✅ Référence du produit visible
- ✅ Quantité totale achetée
- ✅ Nombre d'achats
- ✅ Total dépensé
- ✅ Si produit supprimé: "Produit non disponible" + "Réf: N/A"

**URL de test:** `/clients/{id}` → Onglet "Produits achetés"

---

### 6. Test Produit - Affichage Clients ✓

**Étapes:**
1. Accéder à la fiche d'un produit qui a été vendu
2. Cliquer sur l'onglet "Clients"

**Résultat attendu:**
- ✅ Liste des clients affichée
- ✅ Nom du client visible
- ✅ Nombre d'achats
- ✅ Quantité totale achetée
- ✅ Total dépensé
- ✅ Plus d'erreur "Cannot read property 'invoice__client__first_name'"

**URL de test:** `/products/{id}` → Onglet "Clients"

---

### 7. Test Produit - Disponibilité ✓

**Étapes:**
1. Accéder à la fiche d'un produit actif
2. Vérifier le badge de statut

**Résultat attendu:**
- ✅ Badge "Disponible" (vert) si `is_active = True`
- ✅ Badge "Indisponible" (rouge) si `is_active = False`
- ✅ Statut cohérent dans toute l'interface

**Avant:** Utilisait `is_available` (inexistant)  
**Après:** Utilise `is_active` (correct)

---

### 8. Test Produit - Champs Optionnels ✓

**Étapes:**
1. Accéder à la fiche d'un produit sans délai de livraison
2. Vérifier que la section ne s'affiche pas

**Résultat attendu:**
- ✅ "Délai de livraison" ne s'affiche PAS si le champ est vide/null
- ✅ Pas d'erreur "undefined jours"
- ✅ Layout propre sans section vide

**Champs conditionnels:**
- Délai de livraison (lead_time_days)
- Fournisseur (supplier)
- Entrepôt (warehouse)

---

### 9. Test Produit - Tarification ✓

**Étapes:**
1. Accéder à la fiche d'un produit
2. Vérifier la section "Tarification"
3. Vérifier le "Calculateur de prix"

**Résultat attendu:**

**Section Tarification:**
- ✅ Prix de vente affiché (price)
- ✅ Prix d'achat affiché si > 0 (cost_price)
- ✅ Marge calculée et affichée si applicable

**Calculateur de prix:**
- ✅ Prix pour 1, 5, 10, 20, 50 unités
- ✅ Calcul correct: quantité × price
- ✅ Plus de référence à bulk_price (n'existe pas)

**Exemple:**
```
Produit à 100$
1 unité  = 100$
5 unités = 500$
10 unités = 1,000$
```

---

### 10. Test Fournisseur - Récupération ✓

**Étapes:**
1. Accéder à la fiche d'un fournisseur
2. Vérifier toutes les informations

**Résultat attendu:**
- ✅ Nom du fournisseur affiché
- ✅ Contact, email, téléphone visibles
- ✅ Adresse complète
- ✅ Bons de commande récents affichés
- ✅ Statistiques financières visibles

**URL de test:** `/suppliers/{id}`

---

## 🧪 Tests API (Optionnel)

### Test API Client Statistics

**Endpoint:** `GET /api/clients/{id}/statistics/`

**Vérifier la réponse:**
```json
{
  "top_products": [
    {
      "product__id": "uuid",
      "product__name": "Produit ABC",
      "product__reference": "PRD0001",
      "total_quantity": 50,
      "total_amount": 5000.00,
      "purchase_count": 3
    }
  ]
}
```

---

### Test API Product Statistics

**Endpoint:** `GET /api/products/{id}/statistics/`

**Vérifier la réponse:**
```json
{
  "top_clients": [
    {
      "invoice__client__id": "uuid",
      "invoice__client__name": "Client ABC",
      "invoice__client__email": "client@example.com",
      "total_purchases": 5000.00,
      "purchase_count": 3,
      "total_quantity": 50
    }
  ]
}
```

---

### Test API Invoice avec Items

**Endpoint:** `GET /api/invoices/{id}/`

**Vérifier la réponse:**
```json
{
  "id": "uuid",
  "invoice_number": "FAC202510001",
  "client": {
    "id": "uuid",
    "name": "Client ABC",
    "email": "client@example.com",
    ...
  },
  "created_by": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "items": [
    {
      "id": "uuid",
      "product_reference": "PRD0001",
      "description": "Produit ABC",
      "quantity": 5,
      "unit_price": "100.00",
      "total": "500.00"
    }
  ]
}
```

---

### Test Validation Stock via API

**Endpoint:** `POST /api/invoices/{id}/add_item/`

**Body (avec stock insuffisant):**
```json
{
  "product": "product-uuid-with-low-stock",
  "quantity": 100,
  "unit_price": 50.00,
  "description": "Test"
}
```

**Réponse attendue (400 Bad Request):**
```json
{
  "quantity": [
    "Stock insuffisant. Disponible: 5, Demandé: 100"
  ]
}
```

---

## 📊 Checklist Complète

### Backend
- [ ] Aucune erreur dans les logs Django
- [ ] Validation du stock fonctionne
- [ ] Serializers renvoient les objets complets
- [ ] Statistics endpoints renvoient les bons formats

### Frontend - Factures
- [ ] Client affiché correctement
- [ ] Créé par affiché avec nom complet
- [ ] Totaux calculés (≠ 0)
- [ ] Items listés correctement

### Frontend - Produits
- [ ] Disponibilité correcte (is_active)
- [ ] Référence affichée (reference au lieu de sku)
- [ ] Tarification correcte (price au lieu de unit_price)
- [ ] Délai livraison conditionnel
- [ ] Calculateur de prix fonctionnel
- [ ] Stock affiché pour produits physiques
- [ ] Fournisseur affiché si présent

### Frontend - Clients
- [ ] Produits achetés visibles avec détails
- [ ] Gestion des produits supprimés

### Frontend - Composants Croisés
- [ ] ProductClientsTable affiche les clients
- [ ] ClientProductsTable affiche les produits

---

## 🐛 Bugs Connus Résolus

1. ✅ "Cannot read property 'name' of undefined" sur factures
2. ✅ Total articles toujours à 0
3. ✅ Créé par non récupéré sur factures
4. ✅ Clients non affichés sur produits
5. ✅ Produits non affichés sur clients
6. ✅ "is_available is not defined" sur produits
7. ✅ "sku is not defined" sur produits
8. ✅ "unit_price is not defined" sur produits
9. ✅ Délai de livraison affiché même si absent
10. ✅ Calculateur de prix toujours à 0

---

## 📝 Notes Importantes

### Pas de Migration Nécessaire
Les corrections n'ont pas modifié la structure de la base de données. Aucune migration n'est requise.

### Compatibilité
Les modifications sont rétrocompatibles. Les anciennes factures/produits/clients fonctionnent toujours.

### Performance
Les corrections n'impactent pas négativement les performances. Les requêtes sont optimisées avec des filtres appropriés.

---

## 🚨 En Cas de Problème

### Logs à Vérifier
```bash
# Backend
tail -f logs/django.log

# Console navigateur (F12)
# Vérifier l'onglet Console pour les erreurs JavaScript
```

### Commandes Utiles
```bash
# Redémarrer le serveur Django
python manage.py runserver

# Vérifier les migrations
python manage.py showmigrations

# Console Python pour tester
python manage.py shell
```

### Support
Si un test échoue, vérifier:
1. Le fichier de logs Django
2. La console du navigateur
3. Le résumé des corrections (CORRECTIONS_SUMMARY.md)
4. Les champs du modèle dans apps/invoicing/models.py

