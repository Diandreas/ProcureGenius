# Scénarios Complets du Module IA - ProcureGenius

## Table des Matières

1. [Actions de Gestion des Fournisseurs](#1-actions-de-gestion-des-fournisseurs)
2. [Actions de Gestion des Clients](#2-actions-de-gestion-des-clients)
3. [Actions de Gestion des Factures](#3-actions-de-gestion-des-factures)
4. [Actions de Gestion des Bons de Commande](#4-actions-de-gestion-des-bons-de-commande)
5. [Actions de Gestion des Produits](#5-actions-de-gestion-des-produits)
6. [Actions de Gestion du Stock](#6-actions-de-gestion-du-stock)
7. [Actions de Rapports](#7-actions-de-rapports)
8. [Flux de Confirmation Universel](#8-flux-de-confirmation-universel)

---

## 1. Actions de Gestion des Fournisseurs

### 1.1 create_supplier

**Description:** Crée un nouveau fournisseur avec détection d'entités similaires.

**Scénarios:**

#### Scénario 1.1.A: Création réussie (nouveau fournisseur)
```
Utilisateur: "Crée un fournisseur TechCorp avec email tech@corp.com"

Flux:
1. AI détecte l'intention → appelle create_supplier
2. Entity matching ne trouve aucun fournisseur similaire
3. Création du fournisseur
4. Retour: success=True avec données du fournisseur

Résultat attendu:
✓ Fournisseur 'TechCorp' créé avec succès
[Boutons: Voir | Modifier]
```

#### Scénario 1.1.B: Fournisseur similaire détecté
```
Utilisateur: "Crée un fournisseur TechCorp"

Flux:
1. AI détecte l'intention → appelle create_supplier
2. Entity matching trouve "TechCorp Inc." (85% similarité)
3. Retour: success=False, error='similar_entities_found'
4. Affichage des options de confirmation

Résultat attendu:
⚠️ Attention: Fournisseur similaire trouvé
1. TechCorp Inc. (85% de similarité)
   - Email: existing@techcorp.com
   - Téléphone: +1234567890

Choisissez:
[✓ Utiliser TechCorp Inc.] [+ Créer nouveau] [✗ Annuler]
```

#### Scénario 1.1.C: Confirmation - Utiliser existant
```
Utilisateur: Clique sur "✓ Utiliser TechCorp Inc."

Flux:
1. Frontend envoie "1"
2. Backend détecte confirmation_detected = 'use_existing'
3. Récupère pending_confirmation avec use_existing_supplier_id
4. Retourne les informations du fournisseur existant

Résultat attendu:
✓ Parfait ! J'ai utilisé le fournisseur existant.
Fournisseur: TechCorp Inc.
[Boutons: Voir | Modifier]
```

#### Scénario 1.1.D: Confirmation - Créer nouveau
```
Utilisateur: Clique sur "+ Créer nouveau"

Flux:
1. Frontend envoie "2"
2. Backend détecte confirmation_detected = 'force_create'
3. Ajoute force_create_supplier=True aux params
4. Re-exécute create_supplier qui crée le nouveau fournisseur

Résultat attendu:
✓ D'accord ! J'ai créé un nouveau fournisseur.
Fournisseur: TechCorp créé
[Boutons: Voir | Modifier]
```

#### Scénario 1.1.E: Erreur - Champ obligatoire manquant
```
Utilisateur: "Crée un fournisseur" (sans nom)

Flux:
1. AI détecte l'intention mais params incomplets
2. create_supplier essaie de créer sans 'name'
3. Django lève ValidationError

Résultat attendu:
✗ Erreur: Le nom du fournisseur est obligatoire
```

---

### 1.2 search_supplier

**Scénarios:**

#### Scénario 1.2.A: Recherche avec résultats
```
Utilisateur: "Cherche les fournisseurs avec 'Tech' dans le nom"

Résultat attendu:
📋 J'ai trouvé 3 fournisseur(s):
1. TechCorp Inc. - Actif
2. TechSupply Ltd. - En attente
3. HighTech Solutions - Actif
```

#### Scénario 1.2.B: Recherche sans résultats
```
Utilisateur: "Cherche le fournisseur XYZ Corp"

Résultat attendu:
ℹ️ Aucun fournisseur trouvé pour 'XYZ Corp'
```

---

### 1.3 update_supplier

**Scénarios:**

#### Scénario 1.3.A: Mise à jour réussie
```
Utilisateur: "Mets à jour l'email de TechCorp à newemail@tech.com"

Résultat attendu:
✓ Fournisseur 'TechCorp Inc.' mis à jour avec succès
```

#### Scénario 1.3.B: Fournisseur non trouvé
```
Utilisateur: "Mets à jour le fournisseur XYZ"

Résultat attendu:
✗ Erreur: Fournisseur 'XYZ' non trouvé
```

---

### 1.4 delete_supplier

**Scénarios:**

#### Scénario 1.4.A: Suppression réussie
```
Utilisateur: "Supprime le fournisseur TechCorp"

Résultat attendu:
✓ Fournisseur 'TechCorp Inc.' supprimé avec succès
```

#### Scénario 1.4.B: Fournisseur avec dépendances
```
Utilisateur: "Supprime le fournisseur ActiveSupplier"

Résultat attendu:
✗ Erreur: Impossible de supprimer - 5 bon(s) de commande liés
```

---

## 2. Actions de Gestion des Clients

### 2.1 create_client

**Scénarios:** (Similaires à create_supplier)

#### Scénario 2.1.A: Création réussie
```
Utilisateur: "Crée un client Acme Corp avec email contact@acme.com"

Résultat attendu:
✓ Client 'Acme Corp' créé avec succès
[Boutons: Voir | Modifier]
```

#### Scénario 2.1.B: Client similaire détecté
```
Utilisateur: "Crée un client Acme"

Résultat attendu:
⚠️ Attention: Client similaire trouvé
1. Acme Corp (90% de similarité)
   - Email: existing@acme.com

[✓ Utiliser Acme Corp] [+ Créer nouveau] [✗ Annuler]
```

---

### 2.2 search_client

#### Scénario 2.2.A: Recherche par nom
```
Utilisateur: "Liste les clients dont le nom contient 'Corp'"

Résultat attendu:
📋 J'ai trouvé 4 client(s):
1. Acme Corp - Actif
2. Tech Corp - Actif
3. Global Corp - Inactif
4. Local Corp Ltd. - Actif
```

---

### 2.3 list_clients

#### Scénario 2.3.A: Liste complète
```
Utilisateur: "Liste tous mes clients"

Résultat attendu:
📋 Vous avez 12 client(s) actif(s):
1. Acme Corp
2. Tech Solutions
3. ...
[Affichage paginé des 10 premiers]
```

---

## 3. Actions de Gestion des Factures

### 3.1 create_invoice

**Scénarios:**

#### Scénario 3.1.A: Création complète (client + items)
```
Utilisateur: "Crée une facture pour Acme Corp:
- 10 licences logicielles à 500€
- Date d'échéance: dans 30 jours"

Flux:
1. Entity matching trouve "Acme Corp" existant
2. Crée facture avec client existant
3. Crée produit "licences logicielles" automatiquement
4. Ajoute 1 item à la facture
5. Recalcule totaux

Résultat attendu:
✓ Facture 'FAC2025120001' créée pour Acme Corp
Montant total: 5 000,00 €
Date d'échéance: 13/01/2026
[Boutons: Voir | Modifier | PDF]
```

#### Scénario 3.1.B: Client similaire détecté
```
Utilisateur: "Crée une facture pour Acme"

Résultat attendu:
⚠️ Attention: Client similaire trouvé
1. Acme Corp (90%)
2. Acme Industries (75%)

[✓ Utiliser Acme Corp] [+ Créer nouveau client] [✗ Annuler]
```

#### Scénario 3.1.C: Création auto du client
```
Utilisateur: "Crée une facture pour NewClient Inc. (email: new@client.com)
- Produit A: 1000€"

Flux:
1. Entity matching ne trouve pas "NewClient Inc."
2. Crée automatiquement le client
3. Crée la facture

Résultat attendu:
✓ Client 'NewClient Inc.' créé automatiquement
✓ Facture 'FAC2025120002' créée pour NewClient Inc.
Montant: 1 000,00 €
```

#### Scénario 3.1.D: Items multiples
```
Utilisateur: "Crée une facture pour Client X:
- 5 laptops Dell à 800€
- 10 souris à 20€
- 10 claviers à 30€"

Résultat attendu:
✓ Facture 'FAC2025120003' créée pour Client X
3 articles ajoutés:
  - 5x Laptops Dell (4 000,00 €)
  - 10x Souris (200,00 €)
  - 10x Claviers (300,00 €)
Montant total: 4 500,00 €
```

---

### 3.2 search_invoice

#### Scénario 3.2.A: Recherche par numéro
```
Utilisateur: "Cherche la facture FAC2025120001"

Résultat attendu:
📋 Facture trouvée:
FAC2025120001 - Acme Corp
Montant: 5 000,00 €
Statut: Brouillon
[Bouton: Voir]
```

#### Scénario 3.2.B: Recherche par client
```
Utilisateur: "Liste les factures de Acme Corp"

Résultat attendu:
📋 3 facture(s) trouvée(s) pour Acme Corp:
1. FAC2025120001 - 5 000,00 € (Brouillon)
2. FAC2025110025 - 2 500,00 € (Envoyée)
3. FAC2025100010 - 1 200,00 € (Payée)
```

---

### 3.3 add_invoice_items

#### Scénario 3.3.A: Ajout réussi
```
Utilisateur: "Ajoute 5 monitors à 300€ à la facture FAC2025120001"

Résultat attendu:
✓ 1 article(s) ajouté(s) à la facture FAC2025120001
Nouveau total: 6 500,00 €
```

#### Scénario 3.3.B: Facture non trouvée
```
Utilisateur: "Ajoute un item à la facture FAC9999"

Résultat attendu:
✗ Erreur: Facture 'FAC9999' non trouvée
```

---

### 3.4 send_invoice

#### Scénario 3.4.A: Envoi réussi
```
Utilisateur: "Envoie la facture FAC2025120001 à contact@acme.com"

Résultat attendu:
✓ Facture FAC2025120001 envoyée avec succès à contact@acme.com
```

#### Scénario 3.4.B: Email invalide
```
Utilisateur: "Envoie la facture FAC2025120001 à email-invalide"

Résultat attendu:
✗ Erreur: Adresse email invalide
```

---

### 3.5 update_invoice

#### Scénario 3.5.A: Mise à jour statut
```
Utilisateur: "Marque la facture FAC2025120001 comme payée"

Résultat attendu:
✓ Facture 'FAC2025120001' mise à jour
Nouveau statut: Payée
```

---

### 3.6 delete_invoice

#### Scénario 3.6.A: Suppression réussie
```
Utilisateur: "Supprime la facture FAC2025120001"

Résultat attendu:
✓ Facture 'FAC2025120001' supprimée avec succès
```

---

## 4. Actions de Gestion des Bons de Commande

### 4.1 create_purchase_order

**Scénarios:**

#### Scénario 4.1.A: Création complète avec fournisseur existant
```
Utilisateur: "Crée un bon de commande pour DL Light Telecom:
- 45 Lenovo Radian XR 4 à 12000€
- Date de livraison: dans une semaine"

Flux:
1. Entity matching trouve "DL Light Telecom" (85%)
2. Demande confirmation
3. Utilisateur confirme
4. Crée BC avec fournisseur existant
5. Crée produit "Lenovo Radian XR 4" automatiquement
6. Ajoute item au BC

Résultat attendu (après confirmation):
✓ Bon de commande 'BC2025120001' créé pour DL Light Telecom
45x Lenovo Radian XR 4
Montant total: 540 000,00 €
Date de livraison: 20/12/2025
[Boutons: Voir | Modifier | PDF]
```

#### Scénario 4.1.B: Fournisseur similaire détecté
```
Utilisateur: "Crée un BC pour DL Light"

Résultat attendu:
⚠️ Attention: Fournisseur similaire trouvé
1. DL Light Telecom (85%)
   - Email: contact@dllight.com

[✓ Utiliser DL Light Telecom] [+ Créer nouveau] [✗ Annuler]
```

#### Scénario 4.1.C: Création avec nouveau fournisseur
```
Utilisateur: "Crée un BC pour NewSupplier (email: new@supplier.com)
- 100 items à 50€"

Résultat attendu:
✓ Fournisseur 'NewSupplier' créé automatiquement
✓ Bon de commande 'BC2025120002' créé
Montant: 5 000,00 €
```

---

### 4.2 search_purchase_order

#### Scénario 4.2.A: Recherche par numéro
```
Utilisateur: "Cherche le bon de commande BC2025120001"

Résultat attendu:
📋 Bon de commande trouvé:
BC2025120001 - DL Light Telecom
Montant: 540 000,00 €
Statut: Brouillon
```

---

### 4.3 add_po_items

#### Scénario 4.3.A: Ajout réussi
```
Utilisateur: "Ajoute 20 câbles HDMI à 15€ au BC BC2025120001"

Résultat attendu:
✓ 1 article(s) ajouté(s) au bon de commande BC2025120001
Nouveau total: 540 300,00 €
```

---

### 4.4 send_purchase_order

#### Scénario 4.4.A: Envoi réussi
```
Utilisateur: "Envoie le BC BC2025120001 au fournisseur"

Résultat attendu:
✓ Bon de commande BC2025120001 envoyé à contact@dllight.com
```

---

## 5. Actions de Gestion des Produits

### 5.1 create_product

#### Scénario 5.1.A: Produit physique
```
Utilisateur: "Crée un produit 'Laptop Dell XPS 15':
- Référence: DELL-XPS15
- Prix: 1500€
- Type: Physique
- Stock initial: 10"

Résultat attendu:
✓ Produit 'Laptop Dell XPS 15' créé avec succès
Référence: DELL-XPS15
Prix: 1 500,00 €
Stock: 10 unités
```

#### Scénario 5.1.B: Produit service
```
Utilisateur: "Crée un service 'Consultation IT':
- Prix: 100€/heure"

Résultat attendu:
✓ Service 'Consultation IT' créé
Prix: 100,00 €/heure
```

---

### 5.2 search_product

#### Scénario 5.2.A: Recherche par nom
```
Utilisateur: "Cherche les produits 'Laptop'"

Résultat attendu:
📋 3 produit(s) trouvé(s):
1. Laptop Dell XPS 15 - 1 500,00 € (Stock: 10)
2. Laptop HP Pavilion - 800,00 € (Stock: 5)
3. Laptop Lenovo ThinkPad - 1 200,00 € (Stock: 0)
```

---

### 5.3 update_product

#### Scénario 5.3.A: Mise à jour prix
```
Utilisateur: "Change le prix du Laptop Dell XPS 15 à 1400€"

Résultat attendu:
✓ Produit 'Laptop Dell XPS 15' mis à jour
Nouveau prix: 1 400,00 €
```

---

## 6. Actions de Gestion du Stock

### 6.1 adjust_stock

#### Scénario 6.1.A: Ajustement positif
```
Utilisateur: "Ajoute 50 unités au stock de Laptop Dell XPS 15"

Résultat attendu:
✓ Stock ajusté pour 'Laptop Dell XPS 15'
Ancien stock: 10
Nouveau stock: 60
```

#### Scénario 6.1.B: Ajustement négatif
```
Utilisateur: "Retire 5 unités du stock de Laptop Dell XPS 15"

Résultat attendu:
✓ Stock ajusté pour 'Laptop Dell XPS 15'
Ancien stock: 60
Nouveau stock: 55
```

---

### 6.2 get_stock_alerts

#### Scénario 6.2.A: Alertes de stock faible
```
Utilisateur: "Montre-moi les alertes de stock"

Résultat attendu:
⚠️ 3 produit(s) en stock faible:
1. Laptop Lenovo ThinkPad - Stock: 0 (Seuil: 10)
2. Souris sans fil - Stock: 3 (Seuil: 20)
3. Clavier mécanique - Stock: 5 (Seuil: 15)
```

---

## 7. Actions de Rapports

### 7.1 generate_report

#### Scénario 7.1.A: Rapport des ventes
```
Utilisateur: "Génère un rapport des ventes de décembre 2025"

Résultat attendu:
✓ Rapport généré: 'Ventes - Décembre 2025'
Statut: En cours de génération...
[Bouton: Vérifier le statut]
```

---

### 7.2 get_report_status

#### Scénario 7.2.A: Rapport prêt
```
Utilisateur: "Quel est le statut du rapport des ventes?"

Résultat attendu:
✓ Rapport 'Ventes - Décembre 2025' est prêt
[Boutons: Télécharger | Voir]
```

---

## 8. Flux de Confirmation Universel

### 8.1 Détection d'Entité Similaire

**Pattern universel pour TOUTES les actions de création:**

```
Action: create_X (supplier, client, invoice, purchase_order, product)

Étape 1: Entity Matching
  → Recherche d'entités similaires
  → Score de similarité calculé (0-100%)

Étape 2: Si similaires trouvés (score > 60%)
  → Retour avec success=False
  → Format standardisé:
    {
      'success': False,
      'requires_confirmation': True,
      'error': 'similar_entities_found',
      'entity_type': 'client|supplier|product',
      'similar_entities': [
        {
          'id': 'uuid',
          'name': 'Nom',
          'email': 'email@example.com',
          'similarity': 85,  # int (0-100)
          'reason': 'Nom similaire (85%)'
        }
      ],
      'pending_confirmation': {
        'action': 'create_X',
        'original_params': {...},
        'entity_type': 'client|supplier|product',
        'suggested_entity_id': 'uuid-du-meilleur-match',
        'choices': {
          'use_existing': {'use_existing_X_id': 'uuid'},
          'force_create': {'force_create_X': True},
          'cancel': None
        }
      }
    }

Étape 3: Affichage Frontend
  → Boutons d'action générés dynamiquement
  → [✓ Utiliser X] [+ Créer nouveau] [✗ Annuler]

Étape 4: Clic Utilisateur
  → Option 1 (✓): Envoie "1" → use_existing
  → Option 2 (+): Envoie "2" → force_create
  → Option 3 (✗): Envoie "3" → cancel

Étape 5: Backend Détection
  → Mots-clés détectés pour confirmation
  → Récupération de pending_confirmation
  → Fusion des params: original + choice

Étape 6: Re-exécution
  → Action re-exécutée avec params confirmés
  → Retour final avec success=True
```

---

## 9. Cas d'Erreur Communs

### 9.1 Champs Obligatoires Manquants

```
Action: create_invoice sans montant

Résultat:
✗ Erreur: Le montant total est obligatoire
```

### 9.2 Entité Non Trouvée

```
Action: update_invoice pour facture inexistante

Résultat:
✗ Erreur: Facture 'FAC9999' non trouvée
```

### 9.3 Validation de Modèle Échouée

```
Action: create_product avec prix négatif

Résultat:
✗ Erreur: Le prix doit être supérieur ou égal à 0
```

### 9.4 Contrainte de Base de Données

```
Action: create_supplier avec email déjà utilisé

Résultat:
✗ Erreur: Un fournisseur avec cet email existe déjà
```

---

## 10. Format de Retour Standardisé

### 10.1 Succès

```json
{
  "success": true,
  "message": "Action exécutée avec succès",
  "data": {
    "id": "uuid",
    "entity_type": "invoice|client|supplier|product|purchase_order",
    "name": "Nom de l'entité",
    "url": "/path/to/entity/uuid",
    // ... autres données spécifiques
  }
}
```

### 10.2 Confirmation Requise

```json
{
  "success": false,
  "requires_confirmation": true,
  "error": "similar_entities_found",
  "entity_type": "client|supplier|product",
  "message": "Client similaire trouvé...",
  "similar_entities": [...],
  "pending_confirmation": {
    "action": "create_X",
    "original_params": {...},
    "choices": {...}
  }
}
```

### 10.3 Erreur

```json
{
  "success": false,
  "error": "Message d'erreur descriptif"
}
```

---

## Conclusion

Ce document couvre **TOUS** les scénarios possibles dans le module IA de ProcureGenius. Après les corrections planifiées, tous ces scénarios fonctionneront sans erreur.
