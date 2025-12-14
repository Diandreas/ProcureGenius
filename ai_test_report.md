# Rapport de Test du Module IA

Date: 2025-12-13 17:40:06
Utilisateur: test@example.com
Scénarios: 22

---

## Scénario 1.1.A: Création réussie (nouveau fournisseur)

**Section:** 1. Actions de Gestion des Fournisseurs

**Étape 1:** `Crée un fournisseur TechCorp_0OF2 avec email tech_0OF2@corp.com`

**Réponse IA:**
```
Je vais créer le fournisseur...

✓ Fournisseur 'TechCorp_0OF2' créé avec succès [Voir les détails](/suppliers/3ef93dfc-2398-4640-bca2-a9c590fb9bed)
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 1.1.B: Fournisseur similaire détecté (Confirmation)

**Section:** 1. Actions de Gestion des Fournisseurs

**Étape 1:** `Crée un fournisseur TechCorp`

**Réponse IA:**
```
Je vais créer le fournisseur...

⚠️ **Attention**: J'ai trouvé 3 fournisseur(s) similaire(s) :

**1. TechCorp**
   - Email: tech@corp.com
   - Similarité: 100%
   - Raison: Nom similaire (85%)

**2. TechCorp**
   - Similarité: 100%
   - Raison: Nom similaire (85%)

**3. TechCorp**
   - Similarité: 100%
   - Raison: Nom similaire (85%)


⚠️ **Attention**: Un fournisseur similaire existe déjà.

**Choisissez une option ci-dessous:**
```

✅ **SUCCÈS ÉTAPE**

**Étape 2:** `1`

**Réponse IA:**
```
✗ Désolé, une erreur s'est produite : similar_entities_found
```

❌ **ÉCHEC ÉTAPE**: Manquant: utilisé, existant

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 1.1.D: Fournisseur similaire détecté (Forcer création)

**Section:** 1. Actions de Gestion des Fournisseurs

**Étape 1:** `Crée un fournisseur TechCorp`

**Réponse IA:**
```
Je vais créer le fournisseur...

⚠️ **Attention**: J'ai trouvé 3 fournisseur(s) similaire(s) :

**1. TechCorp**
   - Email: tech@corp.com
   - Similarité: 100%
   - Raison: Nom similaire (85%)

**2. TechCorp**
   - Similarité: 100%
   - Raison: Nom similaire (85%)

**3. TechCorp**
   - Similarité: 100%
   - Raison: Nom similaire (85%)


⚠️ **Attention**: Un fournisseur similaire existe déjà.

**Choisissez une option ci-dessous:**
```

✅ **SUCCÈS ÉTAPE**

**Étape 2:** `2`

**Réponse IA:**
```
✗ Désolé, une erreur s'est produite : similar_entities_found
```

❌ **ÉCHEC ÉTAPE**: Manquant: Tech

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 1.2.B: Recherche sans résultats

**Section:** 1. Actions de Gestion des Fournisseurs

**Étape 1:** `Cherche le fournisseur XYZ_0OF2`

**Réponse IA:**
```
Je recherche les fournisseurs...

✓ Aucun fournisseur trouvé pour 'XYZ_0OF2'
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 1.3.A: Mise à jour réussie

**Section:** 1. Actions de Gestion des Fournisseurs

**Étape 1:** `Mets à jour l'email du fournisseur TechCorp_0OF2 à newemail_0OF2@tech.com`

**Réponse IA:**
```
Je modifie le fournisseur...

✓ Fournisseur 'TechCorp_0OF2' modifié avec succès
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 2.1.A: Création réussie

**Section:** 2. Actions de Gestion des Clients

**Étape 1:** `Crée un client Acme_0OF2 avec email contact_0OF2@acme.com`

**Réponse IA:**
```
Je vais créer le client...

✓ Client 'Acme_0OF2' créé avec succès [Voir les détails](/clients/fe7a0248-2016-408f-8035-2255741efac5)
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 2.1.B: Client similaire détecté

**Section:** 2. Actions de Gestion des Clients

**Étape 1:** `Crée un client Acme`

**Réponse IA:**
```
Je vais créer le client...

⚠️ **Attention**: J'ai trouvé 1 client(s) similaire(s) :

**1. Acme Corp**
   - Email: contact@acme.com
   - Similarité: 85%
   - Raison: Nom d'entreprise similaire (85%)


⚠️ **Attention**: Un client similaire existe déjà.

**Choisissez une option ci-dessous:**
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 2.2.A: Recherche par nom

**Section:** 2. Actions de Gestion des Clients

**Étape 1:** `Liste les clients dont le nom contient 'Acme'`

**Réponse IA:**
```
Je recherche les clients...

✓ Aucun client trouvé pour 'Acme'
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 2.3.A: Liste complète

**Section:** 2. Actions de Gestion des Clients

**Étape 1:** `Liste tous mes clients`

**Réponse IA:**
```
Je liste les clients...

✓ Aucun client trouvé
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 3.1.A: Création complète (avec confirmation si client existe)

**Section:** 3. Actions de Gestion des Factures

**Étape 1:** `Crée une facture pour Acme Corp:
- 10 licences logicielles à 500€`

**Réponse IA:**
```
Je vais créer la facture...

⚠️ **Attention**: J'ai trouvé 1 client(s) similaire(s) :

**1. Acme Corp**
   - Email: contact@acme.com
   - Similarité: 100%
   - Raison: Nom similaire (100%)


⚠️ **Attention**: Un client similaire existe déjà.

**Choisissez une option ci-dessous:**
```

✅ **SUCCÈS ÉTAPE**

**Étape 2:** `1`

**Réponse IA:**
```
✓ Parfait ! J'ai utilisé le client existant.

✓ Facture 'FAC2025120030' créée pour Acme Corp [Voir les détails](/invoices/593c7196-07a5-42b7-8331-b0ac62fb8c3c)
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 3.1.C: Création auto du client

**Section:** 3. Actions de Gestion des Factures

**Étape 1:** `Crée une facture pour NewClient_0OF2 (email: new_0OF2@client.com)
- Produit A: 1000€`

**Réponse IA:**
```
Je vais créer la facture...

✓ ✓ Client 'NewClient_0OF2' créé automatiquement
✓ Facture 'FAC2025120031' créée pour NewClient_0OF2 [Voir les détails](/invoices/cd2261ba-e649-433e-84dc-8e8d42cc3da7)
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 3.2.A: Recherche par numéro (Simulé car on ne connait pas le numéro exact)

**Section:** 3. Actions de Gestion des Factures

**Étape 1:** `Cherche les factures du client Acme Corp`

**Réponse IA:**
```
Je recherche les clients...

✓ Aucun client trouvé pour 'Acme Corp'
```

❌ **ÉCHEC ÉTAPE**: Manquant: facture

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 4.1.A: Création complète (avec confirmation)

**Section:** 4. Actions de Gestion des Bons de Commande

**Étape 1:** `Crée un bon de commande pour DL Light Telecom:
- 45 Lenovo Radian XR 4 à 12000€`

**Réponse IA:**
```
Je vais créer le bon de commande...

⚠️ **Attention**: J'ai trouvé 1 fournisseur(s) similaire(s) :

**1. DL Light Telecom**
   - Similarité: 100%
   - Raison: Nom similaire (85%)


⚠️ **Attention**: Un fournisseur similaire existe déjà.

**Choisissez une option ci-dessous:**
```

✅ **SUCCÈS ÉTAPE**

**Étape 2:** `1`

**Réponse IA:**
```
✗ Désolé, une erreur s'est produite : similar_entities_found
```

❌ **ÉCHEC ÉTAPE**: Manquant: utilisé, existant, Bon de commande, créé

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 4.1.C: Création avec nouveau fournisseur

**Section:** 4. Actions de Gestion des Bons de Commande

**Étape 1:** `Crée un BC pour NewSupplier_0OF2 (email: new_0OF2@supplier.com)
- 100 items à 50€`

**Réponse IA:**
```
Je vais créer le bon de commande...

✓ Bon de commande 'BC2025120020' créé avec succès [Voir les détails](/purchase-orders/b12af165-acb4-45ef-8f68-f26125da12c5)
```

❌ **ÉCHEC ÉTAPE**: Manquant: Fournisseur

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 5.1.A: Produit physique (Unique)

**Section:** 5. Actions de Gestion des Produits

**Étape 1:** `Crée un produit 'Laptop_0OF2':
- Référence: REF-0OF2
- Code-barres: BAR-0OF2
- Prix: 1500€
- Type: Physique
- Stock initial: 10`

**Réponse IA:**
```
Je vais créer le produit...

✓ Produit 'Laptop_0OF2' créé avec succès
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 5.1.B: Produit service

**Section:** 5. Actions de Gestion des Produits

**Étape 1:** `Crée un service 'Consultation_Unique_0OF2':
- Prix: 100€/heure`

**Réponse IA:**
```
Je vais créer le produit...

✗ Désolé, une erreur s'est produite : Erreur: {'barcode': ['Un objet Produit avec ce champ Code-barres existe déjà.']}
```

❌ **ÉCHEC ÉTAPE**: Manquant: Consultation_Unique, créé

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 5.2.A: Recherche par nom

**Section:** 5. Actions de Gestion des Produits

**Étape 1:** `Cherche les produits 'Laptop'`

**Réponse IA:**
```
Je recherche les produits...

✓ Aucun produit trouvé pour 'Laptop'
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 5.3.A: Mise à jour prix

**Section:** 5. Actions de Gestion des Produits

**Étape 1:** `Mets à jour le produit Laptop_0OF2 avec un prix de 1400€`

**Réponse IA:**
```
Je modifie le produit...

✓ Produit 'Laptop_0OF2' modifié avec succès
```

❌ **ÉCHEC ÉTAPE**: Manquant: 1 400

❌ **RÉSULTAT SCÉNARIO: ÉCHEC**

---

## Scénario 6.1.A: Ajustement positif

**Section:** 6. Actions de Gestion du Stock

**Étape 1:** `Ajuste le stock du produit Laptop_0OF2 en ajoutant 50 unités`

**Réponse IA:**
```
J'ajuste le stock...

✓ Ajout de 50 unité(s) pour 'Laptop_0OF2'. Stock: 10 → 60
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 6.2.A: Alertes de stock

**Section:** 6. Actions de Gestion du Stock

**Étape 1:** `Montre-moi les alertes de stock`

**Réponse IA:**
```
Je consulte les alertes de stock...

✓ Alertes stock: 4 rupture(s), 9 stock(s) bas
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 7.1.A: Rapport des ventes

**Section:** 7. Actions de Rapports

**Étape 1:** `Génère un rapport des ventes de décembre 2025`

**Réponse IA:**
```
Je génère le rapport...

✓ Rapport invoice (PDF) en cours de génération
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

## Scénario 7.2.A: Statut rapport

**Section:** 7. Actions de Rapports

**Étape 1:** `Quel est le statut du rapport des ventes?`

**Réponse IA:**
```
Je vais vérifier ça tout de suite ! As-tu généré ce rapport récemment ? Si oui, te souviens-tu du format (PDF, Excel, CSV) ou de la période couverte ? Ça m'aidera à le retrouver plus vite. 😊

*(Je vais chercher le statut du dernier rapport de ventes généré.)*

✓ J'ai trouvé 1 rapport(s)
```

✅ **SUCCÈS ÉTAPE**

✅ **RÉSULTAT SCÉNARIO: SUCCÈS**

---

# Résumé

- Total: 22
- Succès: 15
- Échecs: 7
