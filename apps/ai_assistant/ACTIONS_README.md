# 🤖 Documentation des Actions IA - ProcureGenius

> Guide complet des actions disponibles avec scénarios conversationnels détaillés

---

## 📚 Table des Matières

1. [Actions Fournisseurs](#-actions-fournisseurs)
2. [Actions Factures](#-actions-factures)
3. [Actions Bons de Commande](#-actions-bons-de-commande)
4. [Actions Recherche](#-actions-recherche)
5. [Actions Statistiques](#-actions-statistiques)
6. [Actions Documents](#-actions-documents)

---

## 🏢 Actions Fournisseurs

### 1. `create_supplier` - Créer un Fournisseur

**Description**: Crée un nouveau fournisseur dans le système

**Paramètres**:
- ✅ **Obligatoires**:
  - `name` (string): Nom du fournisseur
- ⚪ **Optionnels**:
  - `contact_person` (string): Personne de contact
  - `email` (string): Email du fournisseur
  - `phone` (string): Téléphone
  - `address` (string): Adresse complète
  - `city` (string): Ville
  - `website` (string): Site web
  - `notes` (string): Notes additionnelles

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Création complète (toutes infos fournies)**

```
👤 Utilisateur:
"Crée un fournisseur Acme Corp, contact Jean Dupont, email jean@acme.fr,
téléphone 0123456789, adresse 15 rue de Paris, ville Lyon"

🤖 IA:
[Analyse] → Toutes les infos nécessaires présentes
[Action] → create_supplier avec tous les params
[Réponse] → "✓ Fournisseur 'Acme Corp' créé avec succès !"
[Actions de suivi]:
  • Voir le fournisseur
  • Créer un bon de commande pour ce fournisseur
  • Modifier les informations
```

---

##### **Scénario 2 : Info obligatoire manquante**

```
👤 Utilisateur:
"Je veux ajouter un nouveau fournisseur"

🤖 IA:
[Analyse] → Paramètre 'name' manquant
[Réponse] → "D'accord ! Pour créer un fournisseur, j'ai besoin du nom.
             Quel est le nom du fournisseur ?"

👤 Utilisateur:
"Tech Solutions"

🤖 IA:
[Analyse] → Nom fourni, autres infos optionnelles
[Réponse] → "Parfait ! Voulez-vous ajouter des informations supplémentaires
             (contact, email, téléphone) ou je crée le fournisseur avec
             juste le nom ?"

👤 Utilisateur:
"Crée-le comme ça"

🤖 IA:
[Action] → create_supplier(name="Tech Solutions")
[Réponse] → "✓ Fournisseur 'Tech Solutions' créé avec succès !"
[Actions de suivi]:
  • Compléter les informations
  • Créer un bon de commande
```

---

##### **Scénario 3 : Ajout progressif d'informations**

```
👤 Utilisateur:
"Ajoute le fournisseur Global Services"

🤖 IA:
[Action] → create_supplier(name="Global Services")
[Réponse] → "✓ Fournisseur 'Global Services' créé !
             Voulez-vous ajouter des informations de contact ?"

👤 Utilisateur:
"Oui, email: contact@global.com et téléphone 0145678901"

🤖 IA:
[Action] → update_supplier(email="contact@global.com", phone="0145678901")
[Réponse] → "✓ Informations de contact ajoutées !"
```

---

##### **Scénario 4 : Confirmation avant création**

```
👤 Utilisateur:
"Crée un fournisseur Mega Corp, contact Marie, email marie@mega.com"

🤖 IA:
[Analyse] → Infos suffisantes
[Réponse] → "Je vais créer le fournisseur avec ces informations :
             • Nom : Mega Corp
             • Contact : Marie
             • Email : marie@mega.com

             Voulez-vous confirmer ou modifier quelque chose ?"

👤 Utilisateur:
"Confirme"

🤖 IA:
[Action] → create_supplier(...)
[Réponse] → "✓ Fournisseur 'Mega Corp' créé avec succès !"
```

---

## 📄 Actions Factures

### 2. `create_invoice` - Créer une Facture

**Description**: Crée une nouvelle facture pour un client

**Paramètres**:
- ✅ **Obligatoires**:
  - `client_name` (string): Nom du client
  - `description` (string): Description de la facture
- ⚪ **Optionnels**:
  - `amount` (float): Montant total
  - `due_date` (date): Date d'échéance
  - `items` (array): Liste des articles
  - `tax_rate` (float): Taux de TVA

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Création simple**

```
👤 Utilisateur:
"Crée une facture pour Client ABC, prestations de conseil, montant 5000€"

🤖 IA:
[Analyse] → Infos obligatoires présentes
[Action] → create_invoice(client_name="Client ABC",
                          description="Prestations de conseil",
                          amount=5000)
[Réponse] → "✓ Facture #FAC-2024-001 créée avec succès !
             Montant : 5 000,00 €"
[Actions de suivi]:
  • Voir la facture
  • Ajouter des articles détaillés
  • Envoyer au client
  • Télécharger PDF
```

---

##### **Scénario 2 : Info manquante - description**

```
👤 Utilisateur:
"Crée une facture pour Entreprise XYZ"

🤖 IA:
[Analyse] → 'description' manquante (obligatoire)
[Réponse] → "D'accord ! Pour quelle prestation ou produit est cette facture ?"

👤 Utilisateur:
"Développement web"

🤖 IA:
[Action] → create_invoice(client_name="Entreprise XYZ",
                          description="Développement web")
[Réponse] → "✓ Facture #FAC-2024-002 créée !
             Souhaitez-vous ajouter le montant ou des articles maintenant ?"
```

---

##### **Scénario 3 : Création avec articles détaillés**

```
👤 Utilisateur:
"Facture pour Client Pro :
- Développement site web : 3 jours x 500€
- Hébergement 1 an : 1 x 200€
- Maintenance : 1 x 300€"

🤖 IA:
[Analyse] → Extraction des articles
[Action] → create_invoice(
             client_name="Client Pro",
             description="Développement site web + services",
             items=[
               {description: "Développement site web", quantity: 3, unit_price: 500},
               {description: "Hébergement 1 an", quantity: 1, unit_price: 200},
               {description: "Maintenance", quantity: 1, unit_price: 300}
             ]
           )
[Réponse] → "✓ Facture #FAC-2024-003 créée avec 3 articles !
             Sous-total : 2 000,00 €
             TVA (20%) : 400,00 €
             Total : 2 400,00 €"
[Actions de suivi]:
  • Voir la facture
  • Modifier les articles
  • Envoyer au client
  • Télécharger PDF
```

---

##### **Scénario 4 : Date d'échéance**

```
👤 Utilisateur:
"Crée une facture pour Client Z, consultation, 1500€, échéance dans 30 jours"

🤖 IA:
[Analyse] → Calcul de la date (aujourd'hui + 30 jours)
[Action] → create_invoice(
             client_name="Client Z",
             description="Consultation",
             amount=1500,
             due_date="2024-10-30"
           )
[Réponse] → "✓ Facture #FAC-2024-004 créée !
             Montant : 1 500,00 €
             Date d'échéance : 30 octobre 2024"
```

---

### 3. `add_invoice_items` - Ajouter des Articles

**Description**: Ajoute des articles/services à une facture existante

**Paramètres**:
- ✅ **Obligatoires**:
  - `invoice_id` (string): ID de la facture
  - `items` (array): Liste des articles à ajouter

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Ajout après création**

```
👤 Utilisateur:
"Ajoute à la facture #FAC-2024-001 : Formation 2 jours à 800€/jour"

🤖 IA:
[Action] → add_invoice_items(
             invoice_id="FAC-2024-001",
             items=[{description: "Formation", quantity: 2, unit_price: 800}]
           )
[Réponse] → "✓ 1 article ajouté à la facture #FAC-2024-001
             Nouveau total : 6 600,00 €"
[Actions de suivi]:
  • Voir la facture mise à jour
  • Ajouter d'autres articles
```

---

### 4. `send_invoice` - Envoyer une Facture

**Description**: Envoie une facture par email au client

**Paramètres**:
- ✅ **Obligatoires**:
  - `invoice_id` (string): ID de la facture
- ⚪ **Optionnels**:
  - `email_message` (string): Message personnalisé
  - `send_copy` (boolean): Envoyer une copie

---

#### 📖 Scénarios Conversationnels

```
👤 Utilisateur:
"Envoie la facture #FAC-2024-001 au client"

🤖 IA:
[Action] → send_invoice(invoice_id="FAC-2024-001")
[Réponse] → "✓ Facture #FAC-2024-001 envoyée avec succès à client@email.com
             Statut : En attente de paiement"
```

---

## 🛒 Actions Bons de Commande

### 5. `create_purchase_order` - Créer un Bon de Commande

**Description**: Crée un nouveau bon de commande pour un fournisseur

**Paramètres**:
- ✅ **Obligatoires**:
  - `supplier_name` (string): Nom du fournisseur
  - `description` (string): Description de la commande
- ⚪ **Optionnels**:
  - `total_amount` (float): Montant total
  - `delivery_date` (date): Date de livraison souhaitée
  - `items` (array): Liste des articles
  - `notes` (string): Notes pour le fournisseur

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : BC simple**

```
👤 Utilisateur:
"Crée un bon de commande pour Acme Corp, 100 unités de produit X, 5000€"

🤖 IA:
[Action] → create_purchase_order(
             supplier_name="Acme Corp",
             description="100 unités de produit X",
             total_amount=5000
           )
[Réponse] → "✓ Bon de commande #BC-2024-001 créé !
             Fournisseur : Acme Corp
             Montant : 5 000,00 €"
[Actions de suivi]:
  • Voir le bon de commande
  • Ajouter des articles
  • Envoyer au fournisseur
```

---

##### **Scénario 2 : BC avec date de livraison**

```
👤 Utilisateur:
"BC pour Tech Solutions, 50 ordinateurs portables, livraison le 15 novembre"

🤖 IA:
[Analyse] → Description complète, date de livraison mentionnée
[Réponse] → "Quel est le montant total de la commande ?"

👤 Utilisateur:
"25000€"

🤖 IA:
[Action] → create_purchase_order(
             supplier_name="Tech Solutions",
             description="50 ordinateurs portables",
             total_amount=25000,
             delivery_date="2024-11-15"
           )
[Réponse] → "✓ Bon de commande #BC-2024-002 créé !
             Livraison prévue : 15 novembre 2024"
```

---

## 🔍 Actions Recherche

### 6. `search_supplier` - Rechercher un Fournisseur

**Description**: Recherche des fournisseurs par nom, email ou contact

**Paramètres**:
- ✅ **Obligatoires**:
  - `query` (string): Terme de recherche
- ⚪ **Optionnels**:
  - `status` (string): Filtrer par statut (active, pending, inactive)
  - `limit` (int): Nombre max de résultats

---

#### 📖 Scénarios Conversationnels

```
👤 Utilisateur:
"Trouve les fournisseurs avec 'Tech' dans le nom"

🤖 IA:
[Action] → search_supplier(query="Tech")
[Réponse] → "J'ai trouvé 3 fournisseurs :

             1. Tech Solutions
                Contact : Marie Durand
                Email : marie@tech-solutions.fr
                Statut : Actif
                [Voir] [Modifier] [Créer BC]

             2. BioTech Corp
                Contact : Pierre Martin
                Email : p.martin@biotech.com
                Statut : Actif
                [Voir] [Modifier] [Créer BC]

             3. Tech Supplies
                Contact : Non renseigné
                Email : contact@techsupplies.fr
                Statut : En attente
                [Voir] [Modifier] [Activer]"
```

---

### 7. `search_invoice` - Rechercher une Facture

**Description**: Recherche des factures par numéro, client ou montant

**Paramètres**:
- ✅ **Obligatoires**:
  - `query` (string): Terme de recherche
- ⚪ **Optionnels**:
  - `status` (string): Filtrer par statut (draft, sent, paid, overdue)
  - `date_range` (object): Plage de dates

---

#### 📖 Scénarios Conversationnels

```
👤 Utilisateur:
"Montre-moi les factures impayées"

🤖 IA:
[Action] → search_invoice(status="sent,overdue")
[Réponse] → "Voici les 5 factures en attente de paiement :

             1. #FAC-2024-015 - Client ABC - 3 500,00 € - Échue depuis 5 jours
             2. #FAC-2024-012 - Entreprise XYZ - 8 200,00 € - Échéance dans 2 jours
             3. #FAC-2024-010 - Client Pro - 1 500,00 € - Échue depuis 12 jours
             ...

             Total impayé : 23 450,00 €"
[Actions de suivi]:
  • Envoyer des relances
  • Voir les détails
  • Marquer comme payée
```

---

## 📊 Actions Statistiques

### 8. `get_statistics` - Afficher les Statistiques

**Description**: Affiche les statistiques de l'entreprise

**Paramètres**:
- ✅ **Obligatoires**:
  - `period` (string): Période (today, week, month, year)
- ⚪ **Optionnels**:
  - `category` (string): Catégorie (suppliers, invoices, revenue, etc.)
  - `detailed` (boolean): Vue détaillée

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Stats générales**

```
👤 Utilisateur:
"Montre-moi les statistiques du mois"

🤖 IA:
[Action] → get_statistics(period="month")
[Réponse] → "📊 Statistiques - Septembre 2024

             💰 Revenus
             • Total facturé : 125 450,00 €
             • Payé : 98 200,00 € (78%)
             • En attente : 27 250,00 €

             📄 Factures
             • Créées : 42
             • Payées : 35
             • En attente : 7

             🏢 Fournisseurs
             • Actifs : 28
             • Nouveaux : 3

             🛒 Bons de commande
             • Total : 18
             • Montant : 56 800,00 €"
```

---

##### **Scénario 2 : Stats ciblées**

```
👤 Utilisateur:
"Quel est le chiffre d'affaires cette année ?"

🤖 IA:
[Action] → get_statistics(period="year", category="revenue", detailed=true)
[Réponse] → "💰 Chiffre d'affaires 2024

             Total : 856 450,00 €

             Évolution mensuelle :
             • Janvier : 65 200 €
             • Février : 72 800 €
             • Mars : 89 500 €
             ...
             • Septembre : 125 450 €

             Moyenne mensuelle : 95 161 €
             Tendance : +12% vs 2023"
```

---

## 📄 Actions Documents

### 9. `analyze_document` - Analyser un Document

**Description**: Analyse un document scanné (facture, BC, etc.)

**Paramètres**:
- ✅ **Obligatoires**:
  - `document_type` (string): Type (invoice, purchase_order, supplier_list, client_list)
- ⚪ **Optionnels**:
  - `auto_create` (boolean): Créer automatiquement l'entité
  - `confirm_before_create` (boolean): Demander confirmation avant création

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Scan de facture (détection automatique)**

```
👤 Utilisateur:
[Upload d'image] "Analyse ce document"

🤖 IA:
[Action OCR] → Extraction du texte
[Action] → detect_document_type() → Détecté: Facture
[Réponse] → "J'ai détecté une FACTURE. Est-ce correct ?
             (Si non, dites-moi de quel type de document il s'agit)"

👤 Utilisateur:
"Oui c'est ça"

🤖 IA:
[Action] → analyze_document(document_type="invoice")
[Réponse] → "✓ Facture analysée !

             📄 Informations extraites :
             • Numéro : F-2024-456
             • Date : 15/09/2024
             • Fournisseur : Acme Corp
             • Montant HT : 1 250,00 €
             • TVA : 250,00 €
             • Total TTC : 1 500,00 €

             Articles :
             1. Produit A - Qté : 10 - Prix : 50,00 €
             2. Produit B - Qté : 5 - Prix : 150,00 €

             Voulez-vous créer cette facture dans le système ?"

👤 Utilisateur:
"Oui, crée-la"

🤖 IA:
[Action] → create_invoice(...données extraites...)
[Réponse] → "✓ Facture #FAC-2024-025 créée à partir du document scanné !"
```

---

##### **Scénario 2 : Type de document explicite**

```
👤 Utilisateur:
[Upload d'image] "Voici un bon de commande"

🤖 IA:
[Action OCR] → Extraction du texte
[Action] → analyze_document(document_type="purchase_order")
[Réponse] → "✓ Bon de commande analysé !

             📋 Informations extraites :
             • Numéro BC : BC-2024-789
             • Date : 20/09/2024
             • Fournisseur : Tech Supplies
             • Date livraison : 05/10/2024

             Articles :
             1. Clavier mécanique - Qté : 50 - Prix : 25,00 €
             2. Souris sans fil - Qté : 50 - Prix : 15,00 €

             Total : 2 000,00 €

             Voulez-vous l'enregistrer dans le système ?"
```

---

##### **Scénario 3 : Document ambigu - demande de clarification**

```
👤 Utilisateur:
[Upload d'image] "Regarde ce document"

🤖 IA:
[Action OCR] → Extraction du texte
[Action] → detect_document_type() → Confiance: 40% (ambigu)
[Réponse] → "J'ai du mal à identifier le type de document. De quoi s'agit-il ?

             Options possibles :
             1️⃣ Facture (Invoice)
             2️⃣ Bon de commande (Purchase Order)
             3️⃣ Devis (Quote)
             4️⃣ Liste de fournisseurs
             5️⃣ Liste de clients
             6️⃣ Autre (précisez)"

👤 Utilisateur:
"C'est une liste de fournisseurs"

🤖 IA:
[Action] → analyze_document(document_type="supplier_list")
[Continue avec extraction...]
```

---

### 10. `import_supplier_list` - Importer une Liste de Fournisseurs

**Description**: Importe plusieurs fournisseurs depuis un registre/liste scannée

**Paramètres**:
- ✅ **Obligatoires**:
  - `suppliers_data` (array): Tableau de fournisseurs extraits
- ⚪ **Optionnels**:
  - `skip_duplicates` (boolean): Ignorer les doublons
  - `update_existing` (boolean): Mettre à jour si existe déjà

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Import complet de registre fournisseurs**

```
👤 Utilisateur:
[Upload d'image] "Voici mon registre de fournisseurs"

🤖 IA:
[Action OCR] → Extraction du texte
[Action] → analyze_document(document_type="supplier_list")
[Réponse] → "✓ Registre analysé !

             📊 J'ai détecté 12 fournisseurs :

             1. Acme Corp - Contact: Jean Dupont - Email: jean@acme.fr
             2. Tech Solutions - Contact: Marie Martin - Email: marie@tech.com
             3. Global Services - Contact: Pierre Durand - Email: p.durand@global.fr
             4. BioTech Corp - Contact: Sophie Laurent - Email: s.laurent@biotech.com
             5. Office Supplies - Contact: Luc Bernard - Email: luc@office.com
             ... (7 autres)

             Options :
             🔹 Importer tous les fournisseurs (12)
             🔹 Importer seulement certains (lesquels ?)
             🔹 Vérifier les doublons d'abord"

👤 Utilisateur:
"Vérifie les doublons d'abord"

🤖 IA:
[Action] → check_duplicate_suppliers(suppliers_data)
[Réponse] → "✓ Vérification effectuée !

             📋 Résultats :
             • 9 nouveaux fournisseurs ✅
             • 3 déjà existants dans le système ⚠️

             Fournisseurs existants détectés :
             1. Acme Corp (déjà enregistré le 15/08/2024)
             2. Tech Solutions (déjà enregistré le 22/08/2024)
             3. Office Supplies (déjà enregistré le 10/09/2024)

             Que voulez-vous faire ?
             1️⃣ Importer uniquement les 9 nouveaux
             2️⃣ Importer tous et mettre à jour les infos des existants
             3️⃣ Revoir chaque doublon manuellement"

👤 Utilisateur:
"Importe les nouveaux seulement"

🤖 IA:
[Action] → import_supplier_list(suppliers_data, skip_duplicates=true)
[Réponse] → "✓ Import terminé avec succès !

             📊 Résumé :
             • 9 fournisseurs créés ✅
             • 3 ignorés (doublons) ⏭️
             • 0 erreurs ✓

             Les nouveaux fournisseurs sont maintenant disponibles dans votre liste."
[Actions de suivi]:
  • Voir la liste complète des fournisseurs
  • Créer un bon de commande
  • Exporter la liste mise à jour
```

---

##### **Scénario 2 : Registre avec infos incomplètes**

```
👤 Utilisateur:
[Upload d'image] "Liste de mes fournisseurs"

🤖 IA:
[Action OCR + Analyse]
[Réponse] → "✓ Registre analysé - 8 fournisseurs détectés

             ⚠️ Certaines informations sont manquantes ou illisibles :

             ✅ Fournisseurs complets (5) :
             1. Acme Corp - ✓ Toutes infos
             2. Tech Solutions - ✓ Toutes infos
             3. Global Services - ✓ Toutes infos
             4. BioTech Corp - ✓ Toutes infos
             5. Office Supplies - ✓ Toutes infos

             ⚠️ Fournisseurs incomplets (3) :
             6. Mega Supplies - Nom OK, email manquant
             7. [Illisible] Corp - Nom illisible, autres infos OK
             8. Quick Services - Nom OK, téléphone illisible

             Options :
             1️⃣ Importer les 5 complets maintenant
             2️⃣ Compléter les infos manquantes avant import
             3️⃣ Importer tous (infos incomplètes)"

👤 Utilisateur:
"Importe les complets, je compléterai les autres plus tard"

🤖 IA:
[Action] → import_supplier_list(complete_suppliers)
[Réponse] → "✓ 5 fournisseurs importés avec succès !

             💡 Conseil : Pour les 3 fournisseurs incomplets, vous pouvez :
             • Me donner les infos manquantes maintenant
             • Les créer manuellement plus tard
             • Rescanner le document avec meilleure qualité"
```

---

### 11. `import_client_list` - Importer une Liste de Clients

**Description**: Importe plusieurs clients depuis un registre/liste scannée

**Paramètres**:
- ✅ **Obligatoires**:
  - `clients_data` (array): Tableau de clients extraits
- ⚪ **Optionnels**:
  - `skip_duplicates` (boolean): Ignorer les doublons
  - `update_existing` (boolean): Mettre à jour si existe déjà

---

#### 📖 Scénarios Conversationnels

##### **Scénario 1 : Import registre clients**

```
👤 Utilisateur:
[Upload d'image] "Mon carnet de clients"

🤖 IA:
[Action OCR] → Extraction
[Action] → detect_document_type() → Détecté: Liste de clients
[Réponse] → "✓ Registre de clients analysé !

             📊 15 clients détectés :

             1. StartupXYZ - Email: contact@startupxyz.com - Tél: 0123456789
             2. Entreprise ABC - Email: info@abc.fr - Tél: 0145678901
             3. Client Pro Solutions - Email: pro@solutions.com
             4. Tech Innovators - Email: hello@techinno.fr - Tél: 0167890123
             ... (11 autres)

             Voulez-vous importer tous ces clients ?"

👤 Utilisateur:
"Oui, importe tout"

🤖 IA:
[Action] → import_client_list(clients_data, skip_duplicates=true)
[Réponse] → "✓ Import terminé !

             📊 Résumé :
             • 13 nouveaux clients créés ✅
             • 2 déjà existants (ignorés) ⏭️
             • 0 erreurs ✓

             Vous pouvez maintenant créer des factures pour ces clients."
```

---

### 12. `detect_document_type` - Détecter le Type de Document

**Description**: Détecte automatiquement le type de document uploadé

**Types détectables**:
- 📄 `invoice` - Facture (mots-clés: facture, invoice, montant, TVA, total)
- 🛒 `purchase_order` - Bon de commande (mots-clés: BC, commande, livraison, fournisseur)
- 📋 `supplier_list` - Liste fournisseurs (format tableau, colonnes: nom, contact, email)
- 👥 `client_list` - Liste clients (format tableau, colonnes: nom client, email, téléphone)
- 📊 `quote` - Devis (mots-clés: devis, proposition, validité)
- 🧾 `receipt` - Reçu/Ticket (mots-clés: reçu, ticket, caisse)

---

#### 📖 Critères de Détection

##### **Facture (Invoice)**
```
Indicateurs :
✓ Mot "Facture" ou "Invoice" présent
✓ Numéro de facture (Format: FAC-XXX, INV-XXX)
✓ Montants avec TVA
✓ Date d'émission
✓ "Total TTC", "Total HT"
✓ Client/Destinataire en haut

Confiance > 80% → Détection automatique
Confiance 50-80% → Demande confirmation
Confiance < 50% → Demande type explicite
```

##### **Bon de Commande (Purchase Order)**
```
Indicateurs :
✓ Mot "Bon de commande" ou "Purchase Order"
✓ Numéro BC (Format: BC-XXX, PO-XXX)
✓ Date de livraison mentionnée
✓ Fournisseur/Supplier
✓ Liste d'articles à commander
✓ "Commander", "Commande"

Confiance > 80% → Détection automatique
```

##### **Liste de Fournisseurs (Supplier List)**
```
Indicateurs :
✓ Format tableau/liste
✓ Colonnes: Nom, Contact, Email, Téléphone
✓ Multiples entrées (> 3 lignes)
✓ Pas de montants totaux
✓ Mots "Fournisseur", "Supplier", "Contact"
✓ Pas de date d'émission unique

Confiance > 70% → Détection automatique
```

##### **Liste de Clients (Client List)**
```
Indicateurs :
✓ Format tableau/liste
✓ Colonnes: Nom, Email, Téléphone, Adresse
✓ Multiples entrées (> 3 lignes)
✓ Mots "Client", "Customer", "Contact client"
✓ Pas de montants totaux

Confiance > 70% → Détection automatique
```

---

#### 📖 Scénarios de Détection

##### **Scénario 1 : Détection claire (confiance élevée)**

```
👤 Utilisateur:
[Upload d'image]

🤖 IA:
[OCR] → Texte extrait
[Analyse] → Mot "FACTURE" trouvé, numéro "FAC-2024-123", TVA présente
[Confiance] → 95%
[Réponse] → "✓ Document identifié : FACTURE
             Confiance : 95%

             Voulez-vous que je l'analyse et l'importe ?"
```

---

##### **Scénario 2 : Détection moyenne (confirmation nécessaire)**

```
👤 Utilisateur:
[Upload d'image de tableau]

🤖 IA:
[OCR] → Texte extrait
[Analyse] → Format tableau, colonnes "Nom" "Email" "Téléphone"
[Confiance] → 65%
[Réponse] → "J'ai détecté un tableau avec des contacts.

             S'agit-il de :
             1️⃣ Une liste de FOURNISSEURS
             2️⃣ Une liste de CLIENTS
             3️⃣ Autre chose"

👤 Utilisateur:
"1"

🤖 IA:
[Action] → analyze_document(document_type="supplier_list")
[Continue...]
```

---

##### **Scénario 3 : Détection impossible (demande explicite)**

```
👤 Utilisateur:
[Upload d'image floue/complexe]

🤖 IA:
[OCR] → Texte extrait (qualité faible)
[Analyse] → Impossible d'identifier le type
[Confiance] → 25%
[Réponse] → "❌ Je n'arrive pas à identifier clairement ce document.

             Pouvez-vous me dire de quoi il s'agit ?

             Types supportés :
             📄 Facture
             🛒 Bon de commande
             📋 Liste de fournisseurs
             👥 Liste de clients
             📊 Devis
             🧾 Reçu

             Ou dites-moi en quelques mots ce que contient ce document."
```

---

##### **Scénario 4 : Document hybride (plusieurs types détectés)**

```
👤 Utilisateur:
[Upload d'un PDF multi-pages avec facture + BC]

🤖 IA:
[OCR Multi-pages] → Pages 1-2 extraites
[Analyse Page 1] → Facture détectée (95%)
[Analyse Page 2] → Bon de commande détecté (90%)
[Réponse] → "✓ Document multi-pages analysé !

             J'ai détecté plusieurs types de documents :

             📄 Page 1 : FACTURE
             • Numéro : FAC-2024-456
             • Fournisseur : Acme Corp
             • Montant : 1 500,00 €

             🛒 Page 2 : BON DE COMMANDE
             • Numéro : BC-2024-789
             • Fournisseur : Tech Supplies
             • Montant : 2 000,00 €

             Comment voulez-vous procéder ?
             1️⃣ Importer les deux documents
             2️⃣ Importer seulement la facture
             3️⃣ Importer seulement le BC
             4️⃣ Traiter page par page"
```

---

## 🔄 Workflows Multi-Étapes

### Workflow 1 : Intégration Nouveau Client

```
👤 Utilisateur:
"Nouveau client : StartupXYZ, email: contact@startupxyz.com"

🤖 IA (Étape 1):
[Action] → create_client(name="StartupXYZ", email="contact@startupxyz.com")
[Réponse] → "✓ Client 'StartupXYZ' créé !
             Voulez-vous créer une première facture pour ce client ?"

👤 Utilisateur:
"Oui, prestations de conseil, 3000€"

🤖 IA (Étape 2):
[Action] → create_invoice(client_name="StartupXYZ", ...)
[Réponse] → "✓ Facture #FAC-2024-026 créée !
             Voulez-vous l'envoyer maintenant au client ?"

👤 Utilisateur:
"Oui"

🤖 IA (Étape 3):
[Action] → send_invoice(invoice_id="FAC-2024-026")
[Réponse] → "✓ Facture envoyée à contact@startupxyz.com
             Workflow terminé avec succès ! 🎉"
```

---

### Workflow 2 : Commande Complète Fournisseur

```
👤 Utilisateur:
"Je veux commander 50 claviers chez TechSupplies"

🤖 IA (Étape 1):
[Analyse] → Recherche du fournisseur
[Action] → search_supplier(query="TechSupplies")
[Réponse] → "J'ai trouvé 'Tech Supplies' dans vos fournisseurs.
             Quel est le prix unitaire des claviers ?"

👤 Utilisateur:
"25€ pièce"

🤖 IA (Étape 2):
[Action] → create_purchase_order(
             supplier_name="Tech Supplies",
             description="50 claviers",
             items=[{description: "Clavier", quantity: 50, unit_price: 25}],
             total_amount=1250
           )
[Réponse] → "✓ Bon de commande #BC-2024-010 créé !
             Total : 1 250,00 €
             Quand souhaitez-vous la livraison ?"

👤 Utilisateur:
"Dans 2 semaines"

🤖 IA (Étape 3):
[Action] → update_purchase_order(delivery_date="2024-10-14")
[Réponse] → "✓ Date de livraison mise à jour : 14 octobre 2024
             Voulez-vous envoyer le BC au fournisseur maintenant ?"
```

---

## 🧠 Gestion du Contexte Conversationnel

### Principe de la Mémoire Contextuelle

L'IA maintient un **contexte de session** pour comprendre les références implicites et améliorer la fluidité de la conversation.

---

### Variables de Contexte

```python
SESSION_CONTEXT = {
    'last_created': {
        'supplier': {'id': 'uuid', 'name': 'Acme Corp', 'created_at': '2024-09-30'},
        'invoice': {'id': 'uuid', 'number': 'FAC-2024-001', 'client': 'Client ABC'},
        'purchase_order': {'id': 'uuid', 'number': 'BC-2024-001', 'supplier': 'Tech Supplies'}
    },
    'last_searched': {
        'suppliers': [list of results],
        'invoices': [list of results]
    },
    'current_workflow': {
        'type': 'create_invoice',
        'step': 2,
        'collected_data': {...}
    },
    'user_preferences': {
        'language': 'fr',
        'currency': 'EUR',
        'tax_rate': 0.20
    }
}
```

---

### 📖 Scénarios avec Contexte

#### **Scénario 1 : Référence à la dernière entité créée**

```
👤 Utilisateur:
"Crée un fournisseur Acme Corp"

🤖 IA:
[Action] → create_supplier(name="Acme Corp")
[Context] → SESSION_CONTEXT['last_created']['supplier'] = {id: '123', name: 'Acme Corp'}
[Réponse] → "✓ Fournisseur 'Acme Corp' créé !"

👤 Utilisateur:
"Crée un BC pour lui"  ← Référence implicite

🤖 IA:
[Analyse] → "lui" = last_created.supplier = 'Acme Corp'
[Action] → create_purchase_order(supplier_name="Acme Corp")
[Réponse] → "✓ Bon de commande #BC-2024-001 créé pour Acme Corp"
```

---

#### **Scénario 2 : Résolution de pronoms**

```
👤 Utilisateur:
"Montre-moi les factures de Client ABC"

🤖 IA:
[Action] → search_invoice(client_name="Client ABC")
[Context] → Stocke les résultats + client actuel
[Réponse] → "3 factures trouvées pour Client ABC :
             • FAC-2024-015 - 1 500€
             • FAC-2024-018 - 2 300€
             • FAC-2024-020 - 980€"

👤 Utilisateur:
"Envoie la première"  ← Référence à la liste

🤖 IA:
[Analyse] → "la première" = last_searched.invoices[0] = FAC-2024-015
[Action] → send_invoice(invoice_id="FAC-2024-015")
[Réponse] → "✓ Facture FAC-2024-015 envoyée"
```

---

#### **Scénario 3 : Suite de conversation**

```
👤 Utilisateur:
"Crée une facture pour Client XYZ"

🤖 IA:
[Context] → Démarre workflow, collecte params
[Réponse] → "D'accord ! Quelle est la description de la prestation ?"

👤 Utilisateur:
"Développement web"

🤖 IA:
[Context] → Ajoute à collected_data: {client: 'Client XYZ', description: 'Développement web'}
[Réponse] → "Parfait ! Quel est le montant ?"

👤 Utilisateur:
"3000€"

🤖 IA:
[Context] → Ajoute montant, tous params collectés
[Action] → create_invoice(client_name="Client XYZ", description="Développement web", amount=3000)
[Réponse] → "✓ Facture #FAC-2024-025 créée !"
```

---

#### **Scénario 4 : Références temporelles**

```
👤 Utilisateur:
"Montre-moi les factures de cette semaine"

🤖 IA:
[Analyse] → "cette semaine" = du 25/09 au 30/09
[Action] → search_invoice(date_range={'start': '2024-09-25', 'end': '2024-09-30'})
[Context] → Stocke période
[Réponse] → "7 factures cette semaine, total : 18 450€"

👤 Utilisateur:
"Et la semaine dernière ?"  ← Référence relative

🤖 IA:
[Analyse] → Base sur contexte temporel précédent
[Action] → search_invoice(date_range={'start': '2024-09-18', 'end': '2024-09-24'})
[Réponse] → "5 factures la semaine dernière, total : 12 300€"
```

---

### Règles de Résolution

```python
PRONOUN_RESOLUTION = {
    'lui': 'last_created.supplier',
    'elle': 'last_created.invoice',
    'ça/cela': 'last_mentioned_entity',
    'cette facture': 'last_created.invoice or last_searched.invoices[0]',
    'ce fournisseur': 'last_created.supplier or last_searched.suppliers[0]',
    'le premier/la première': 'last_searched[0]',
    'le dernier/la dernière': 'last_searched[-1]'
}

TEMPORAL_RESOLUTION = {
    'aujourd\'hui': 'date.today()',
    'hier': 'date.today() - 1 day',
    'cette semaine': 'week.start to week.end',
    'ce mois': 'month.start to month.end',
    'le mois dernier': 'previous_month',
    'dans X jours': 'date.today() + X days'
}
```

---

## 💰 Gestion des Montants et Devises

### Parser de Montants Multi-Formats

```python
AMOUNT_PATTERNS = {
    'with_currency_symbol': r'(€|EUR|\$|USD)?\s*(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)\s*(€|EUR|\$|USD)?',
    'text_number': {
        'mille': 1000,
        'cent': 100,
        'cents': 100,
        'euros': 1,
        'euro': 1
    }
}
```

---

### 📖 Scénarios de Conversion

#### **Scénario 1 : Formats variés de montants**

```
Entrées possibles → Normalisation

"1500€"           → 1500.00 EUR
"€1500"           → 1500.00 EUR
"1 500,00 EUR"    → 1500.00 EUR
"1,500.00"        → 1500.00 EUR (détection locale)
"1500 euros"      → 1500.00 EUR
"mille cinq cents euros" → 1500.00 EUR

"$1500"           → Conversion si devise différente
"1500 USD"        → Conversion EUR si nécessaire
```

---

#### **Scénario 2 : Calcul automatique TTC/HT**

```
👤 Utilisateur:
"Facture pour Client ABC, montant 1000€ HT"

🤖 IA:
[Analyse] → Montant HT détecté
[Calcul] → TVA 20% = 200€, TTC = 1200€
[Action] → create_invoice(
             amount_ht=1000,
             tax_rate=0.20,
             tax_amount=200,
             amount_ttc=1200
           )
[Réponse] → "✓ Facture créée :
             • Montant HT : 1 000,00 €
             • TVA (20%) : 200,00 €
             • Total TTC : 1 200,00 €"
```

---

#### **Scénario 3 : Ambiguïté HT/TTC**

```
👤 Utilisateur:
"Facture 1500€"  ← Non précisé

🤖 IA:
[Analyse] → Ambiguïté détectée
[Réponse] → "Le montant de 1 500€ est-il :
             1️⃣ HT (Hors Taxes) → TTC = 1 800€
             2️⃣ TTC (Toutes Taxes Comprises) → HT = 1 250€

             Par défaut j'utilise TTC, dites 'HT' si c'est hors taxes."

👤 Utilisateur:
"HT"

🤖 IA:
[Calcul] → 1500 HT + 20% TVA = 1800 TTC
[Action] → create_invoice(amount_ht=1500, amount_ttc=1800)
```

---

#### **Scénario 4 : Conversion de devises**

```
👤 Utilisateur:
"Facture pour Client US, 1000 USD"

🤖 IA:
[Détection] → Devise USD, user en EUR
[Conversion] → 1000 USD = ~920 EUR (taux du jour)
[Réponse] → "Montant : 1 000,00 USD (≈ 920,00 EUR au taux du jour)
             Voulez-vous créer la facture en USD ou EUR ?"

👤 Utilisateur:
"En USD"

🤖 IA:
[Action] → create_invoice(amount=1000, currency="USD")
```

---

### Règles de Validation

```python
AMOUNT_VALIDATION = {
    'min_amount': 0.01,  # Montant minimal
    'max_amount': 1000000,  # Alerte si dépassé
    'negative_amount': 'ask_confirmation',  # Avoir/remboursement ?
    'decimal_places': 2,  # Arrondi automatique
    'tax_rates': {
        'FR': [0.0, 0.055, 0.10, 0.20],  # TVA France
        'default': 0.20
    }
}
```

---

## ✅ Validation des Données Métier

### Règles de Validation par Type

```python
VALIDATION_RULES = {
    'email': {
        'pattern': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'action_on_invalid': 'auto_correct_or_reject'
    },
    'phone': {
        'pattern': r'^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$',  # Format FR
        'normalization': 'remove_spaces_and_format',
        'action_on_invalid': 'normalize_then_validate'
    },
    'siret': {
        'pattern': r'^\d{14}$',
        'check_luhn': True,
        'action_on_invalid': 'reject_with_message'
    },
    'date': {
        'format': ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
        'past_date_warning': True,
        'future_date_limit': '+2 years'
    }
}
```

---

### 📖 Scénarios de Validation

#### **Scénario 1 : Email invalide avec correction auto**

```
👤 Utilisateur:
"Crée fournisseur Acme Corp, email jean@acme,fr"  ← Virgule au lieu de point

🤖 IA:
[Validation] → Email invalide détecté
[Auto-correction] → "jean@acme,fr" → "jean@acme.fr" (confiance 90%)
[Réponse] → "⚠️ J'ai détecté une erreur dans l'email.
             Voulez-vous dire : jean@acme.fr ?
             (Répondez 'oui' ou donnez le bon email)"

👤 Utilisateur:
"Oui"

🤖 IA:
[Action] → create_supplier(email="jean@acme.fr")
```

---

#### **Scénario 2 : Téléphone non formaté - normalisation auto**

```
Entrées possibles → Normalisation

"0123456789"      → "+33 1 23 45 67 89"
"01 23 45 67 89"  → "+33 1 23 45 67 89"
"+33123456789"    → "+33 1 23 45 67 89"
"01-23-45-67-89"  → "+33 1 23 45 67 89"
"0033123456789"   → "+33 1 23 45 67 89"

👤 Utilisateur:
"Fournisseur XYZ, tél: 0123456789"

🤖 IA:
[Normalisation] → 0123456789 → +33 1 23 45 67 89
[Action] → create_supplier(phone="+33123456789")
[Réponse] → "✓ Fournisseur créé avec téléphone : +33 1 23 45 67 89"
```

---

#### **Scénario 3 : Date d'échéance dans le passé**

```
👤 Utilisateur:
"Facture Client ABC, échéance 15/09/2024"  ← Aujourd'hui = 30/09/2024

🤖 IA:
[Validation] → Date dans le passé détectée
[Réponse] → "⚠️ Attention : La date d'échéance (15/09/2024) est déjà passée.

             Options :
             1️⃣ Utiliser la date d'aujourd'hui (30/09/2024)
             2️⃣ Définir une nouvelle date d'échéance
             3️⃣ Continuer quand même (facture en retard)"

👤 Utilisateur:
"1"

🤖 IA:
[Action] → create_invoice(due_date="2024-09-30")
```

---

#### **Scénario 4 : Montant anormalement élevé**

```
👤 Utilisateur:
"Facture Client X, 150 000€"

🤖 IA:
[Validation] → Montant > seuil d'alerte (10 000€)
[Analyse] → Historique client : montants habituels entre 1000-5000€
[Réponse] → "⚠️ Montant inhabituellement élevé détecté : 150 000,00 €

             • Moyenne des factures pour ce client : 2 500€
             • Facture max précédente : 4 800€

             Confirmez-vous ce montant ?
             (Si erreur, vous pouvez dire '15000' au lieu de '150000')"

👤 Utilisateur:
"Oui c'est correct, projet spécial"

🤖 IA:
[Action] → create_invoice(amount=150000, note="Projet spécial - confirmé")
[Réponse] → "✓ Facture créée pour 150 000,00 €"
```

---

### Types de Validation

```python
VALIDATION_TYPES = {
    'format': 'Vérifie le format (regex)',
    'range': 'Vérifie min/max',
    'business_logic': 'Règles métier (ex: date échéance > date émission)',
    'anomaly': 'Détection de valeurs anormales',
    'cross_field': 'Validation entre plusieurs champs'
}

VALIDATION_ACTIONS = {
    'reject': 'Rejeter et demander correction',
    'auto_correct': 'Corriger automatiquement',
    'warn': 'Avertir mais continuer',
    'suggest': 'Proposer une correction'
}
```

---

## 🔗 Gestion des Relations Entre Entités

### Principe de Dépendances

Certaines actions nécessitent l'existence d'autres entités. L'IA gère ces dépendances intelligemment.

---

### Stratégies de Résolution

```python
DEPENDENCY_STRATEGIES = {
    'auto_create': 'Créer automatiquement l\'entité manquante',
    'ask_create': 'Demander si on doit créer',
    'search_first': 'Chercher d\'abord si existe',
    'error': 'Rejeter avec message d\'erreur'
}
```

---

### 📖 Scénarios de Dépendances

#### **Scénario 1 : Client inexistant - Création automatique**

```
👤 Utilisateur:
"Crée une facture pour Client NewCo, développement web, 5000€"

🤖 IA:
[Recherche] → Client "NewCo" introuvable
[Stratégie] → ask_create (demander confirmation)
[Réponse] → "Je n'ai pas trouvé de client nommé 'NewCo' dans le système.

             Voulez-vous que je le crée automatiquement avant de faire la facture ?
             (Vous pourrez compléter ses informations plus tard)"

👤 Utilisateur:
"Oui"

🤖 IA:
[Action 1] → create_client(name="NewCo")
[Action 2] → create_invoice(client_id="...", description="développement web", amount=5000)
[Réponse] → "✓ Client 'NewCo' créé
             ✓ Facture #FAC-2024-030 créée pour NewCo

             💡 Conseil : Complétez les infos du client (email, téléphone) pour pouvoir envoyer la facture."
```

---

#### **Scénario 2 : Fournisseur ambigu - Clarification**

```
👤 Utilisateur:
"BC pour Tech Solutions, 10 claviers à 25€"

🤖 IA:
[Recherche] → 3 fournisseurs trouvés :
  • Tech Solutions SARL
  • Tech Solutions Inc
  • Tech & Solutions
[Stratégie] → Demander clarification
[Réponse] → "J'ai trouvé plusieurs fournisseurs similaires :

             1️⃣ Tech Solutions SARL (Contact: Marie Durand)
             2️⃣ Tech Solutions Inc (Contact: John Smith)
             3️⃣ Tech & Solutions (Contact: Pierre Martin)

             Lequel voulez-vous ?"

👤 Utilisateur:
"1"

🤖 IA:
[Action] → create_purchase_order(supplier_id="...", items=[...])
[Réponse] → "✓ BC #BC-2024-015 créé pour Tech Solutions SARL"
```

---

#### **Scénario 3 : Produit inexistant en stock**

```
👤 Utilisateur:
"BC pour 50 unités de Produit XYZ chez Fournisseur ABC"

🤖 IA:
[Recherche] → Fournisseur ABC ✓ trouvé
[Recherche] → Produit XYZ ✗ introuvable dans catalogue
[Stratégie] → ask_create
[Réponse] → "Fournisseur ABC trouvé ✓

             ⚠️ Le produit 'XYZ' n'existe pas encore dans votre catalogue.

             Options :
             1️⃣ Créer le BC quand même (sans référence produit)
             2️⃣ Créer d'abord le produit dans le catalogue
             3️⃣ Me donner plus d'infos sur le produit (nom complet, catégorie)"

👤 Utilisateur:
"1"

🤖 IA:
[Action] → create_purchase_order(items=[{description: "Produit XYZ", quantity: 50}])
[Réponse] → "✓ BC #BC-2024-016 créé

             💡 Conseil : Ajoutez 'Produit XYZ' au catalogue pour faciliter les futures commandes."
```

---

#### **Scénario 4 : Création en cascade (workflow complet)**

```
👤 Utilisateur:
"Nouveau fournisseur TechCorp avec email contact@techcorp.fr,
puis crée un BC de 100 souris à 10€, livraison dans 15 jours"

🤖 IA:
[Analyse] → Workflow en 2 étapes détecté
[Action 1] → create_supplier(name="TechCorp", email="contact@techcorp.fr")
[Context] → Stocke fournisseur créé
[Action 2] → create_purchase_order(
               supplier_name="TechCorp",
               items=[{description: "Souris", quantity: 100, unit_price: 10}],
               delivery_date=date.today()+15days
             )
[Réponse] → "✓ Fournisseur 'TechCorp' créé
             ✓ BC #BC-2024-017 créé pour TechCorp
             • 100 souris à 10,00 € = 1 000,00 €
             • Livraison prévue : 15 octobre 2024

             Voulez-vous envoyer le BC au fournisseur maintenant ?"
```

---

#### **Scénario 5 : Détection de doublon**

```
👤 Utilisateur:
"Crée fournisseur Acme Corporation, email contact@acme.fr"

🤖 IA:
[Recherche] → Similarité détectée avec "Acme Corp" (existant)
[Stratégie] → Demander confirmation
[Réponse] → "⚠️ Attention : Un fournisseur similaire existe déjà :

             📋 Acme Corp (créé le 15/08/2024)
             • Email : contact@acme.fr  ← Même email !
             • Contact : Jean Dupont

             S'agit-il du même fournisseur ?
             1️⃣ Oui, utiliser le fournisseur existant
             2️⃣ Non, créer quand même (différent)
             3️⃣ Mettre à jour les infos du fournisseur existant"

👤 Utilisateur:
"1"

🤖 IA:
[Action] → Utilise fournisseur existant
[Réponse] → "✓ J'utilise le fournisseur 'Acme Corp' existant.
             Que voulez-vous faire avec ?"
```

---

### Matrice de Dépendances

| Action | Entité Requise | Stratégie par Défaut |
|--------|---------------|---------------------|
| `create_invoice` | Client | ask_create |
| `create_purchase_order` | Fournisseur | ask_create |
| `add_invoice_items` | Facture existante | error if not found |
| `send_invoice` | Facture + Email client | error if email missing |
| `update_supplier` | Fournisseur existant | error if not found |

---

## 🔧 Actions de Modification et Mise à Jour (CRUD Complet)

### Actions UPDATE

#### **Action 13. `update_supplier` - Modifier un Fournisseur**

**Paramètres**:
- ✅ **Obligatoires**: `supplier_id` ou `supplier_name`
- ⚪ **Optionnels**: Tous les champs modifiables

---

##### 📖 Scénarios UPDATE

```
👤 Utilisateur:
"Change l'email de Acme Corp en newemail@acme.fr"

🤖 IA:
[Recherche] → Fournisseur "Acme Corp" trouvé
[Action] → update_supplier(supplier_id="...", email="newemail@acme.fr")
[Réponse] → "✓ Email de 'Acme Corp' mis à jour : newemail@acme.fr"

---

👤 Utilisateur:
"Modifie le dernier fournisseur créé"  ← Utilise contexte

🤖 IA:
[Context] → last_created.supplier = "TechCorp"
[Réponse] → "Que voulez-vous modifier pour 'TechCorp' ?
             • Nom
             • Email
             • Téléphone
             • Adresse
             • Contact
             Ou dites-moi directement (ex: 'change le téléphone en 0612345678')"

👤 Utilisateur:
"Téléphone en 0612345678"

🤖 IA:
[Action] → update_supplier(supplier_id="...", phone="0612345678")
[Réponse] → "✓ Téléphone de 'TechCorp' mis à jour : +33 6 12 34 56 78"
```

---

#### **Action 14. `update_invoice` - Modifier une Facture**

**Restrictions**: Seulement si statut = 'draft' ou 'sent' (pas 'paid')

```
👤 Utilisateur:
"Change le montant de la facture #FAC-2024-025 en 3500€"

🤖 IA:
[Recherche] → Facture trouvée, statut = 'draft' ✓
[Action] → update_invoice(invoice_id="...", amount=3500)
[Réponse] → "✓ Facture #FAC-2024-025 mise à jour : 3 500,00 €"

---

👤 Utilisateur:
"Change le montant de la facture #FAC-2024-010 en 5000€"

🤖 IA:
[Recherche] → Facture trouvée, statut = 'paid' ✗
[Réponse] → "⚠️ Impossible de modifier la facture #FAC-2024-010 :
             Cette facture est déjà payée.

             Options :
             • Créer une facture d'avoir (remboursement)
             • Créer une nouvelle facture rectificative
             • Contacter un administrateur"
```

---

### Actions DELETE

#### **Action 15. `delete_supplier` - Supprimer un Fournisseur**

**Sécurité**: Vérification des dépendances avant suppression

```
👤 Utilisateur:
"Supprime le fournisseur TestCorp"

🤖 IA:
[Recherche] → Fournisseur trouvé
[Vérification] → 0 BC associé ✓
[Réponse] → "⚠️ Confirmer la suppression de 'TestCorp' ?
             Cette action est irréversible.
             (Répondez 'confirme' pour supprimer)"

👤 Utilisateur:
"Confirme"

🤖 IA:
[Action] → delete_supplier(supplier_id="...")
[Réponse] → "✓ Fournisseur 'TestCorp' supprimé"

---

👤 Utilisateur:
"Supprime Acme Corp"

🤖 IA:
[Vérification] → 5 BC associés ✗
[Réponse] → "⚠️ Impossible de supprimer 'Acme Corp' :
             Ce fournisseur a 5 bons de commande associés.

             Options :
             • Archiver le fournisseur (désactivation)
             • Supprimer d'abord les BC
             • Réassigner les BC à un autre fournisseur"
```

---

#### **Action 16. `cancel_invoice` - Annuler une Facture**

```
👤 Utilisateur:
"Annule la facture #FAC-2024-025"

🤖 IA:
[Recherche] → Facture trouvée, statut = 'sent'
[Réponse] → "⚠️ Annuler la facture #FAC-2024-025 ?

             Informations :
             • Client : Client ABC
             • Montant : 1 500,00 €
             • Statut : Envoyée

             L'annulation marquera la facture comme 'cancelled'.
             Confirmer ?"

👤 Utilisateur:
"Oui"

🤖 IA:
[Action] → cancel_invoice(invoice_id="...", reason="Demande utilisateur")
[Réponse] → "✓ Facture #FAC-2024-025 annulée

             💡 Si le client a déjà payé, créez une facture d'avoir."
```

---

### Actions DUPLICATE

#### **Action 17. `duplicate_invoice` - Dupliquer une Facture**

```
👤 Utilisateur:
"Duplique la facture #FAC-2024-020"

🤖 IA:
[Action] → duplicate_invoice(invoice_id="...", keep_same_client=True)
[Réponse] → "✓ Facture dupliquée : #FAC-2024-031

             Basée sur #FAC-2024-020 :
             • Même client : Client ABC
             • Même montant : 2 300,00 €
             • Nouveau statut : Brouillon

             Voulez-vous modifier quelque chose ?"
```

---

## 🔄 Workflows Automatiques Composés

### Orchestration Multi-Actions

L'IA peut exécuter plusieurs actions en séquence automatiquement.

---

### 📖 Workflows Avancés

#### **Workflow 1 : Commande Express (1 commande → 4 actions)**

```
👤 Utilisateur:
"Commande 50 claviers chez TechSupply à 25€, crée le BC et envoie-le"

🤖 IA:
[Analyse] → Workflow détecté : search → create → send
[Étape 1/4] → search_supplier(query="TechSupply")
[Réponse] → "✓ Fournisseur 'Tech Supply' trouvé"

[Étape 2/4] → create_purchase_order(
                supplier_name="Tech Supply",
                items=[{description: "Clavier", quantity: 50, unit_price: 25}]
              )
[Réponse] → "✓ BC #BC-2024-020 créé (1 250,00 €)"

[Étape 3/4] → validate_purchase_order(po_id="...")
[Réponse] → "✓ BC validé"

[Étape 4/4] → send_purchase_order(po_id="...", email="fournisseur@techsupply.com")
[Réponse] → "✓ BC envoyé à fournisseur@techsupply.com

             📊 Récapitulatif :
             • Fournisseur : Tech Supply
             • BC : #BC-2024-020
             • Montant : 1 250,00 €
             • Statut : Envoyé ✅"
```

---

#### **Workflow 2 : Facturation Projet Complet**

```
👤 Utilisateur:
"Facture Client X pour projet Y avec heures travaillées du mois"

🤖 IA:
[Étape 1/6] → get_project_hours(project_name="Y", period="current_month")
[Réponse] → "✓ Projet Y : 85 heures ce mois"

[Étape 2/6] → get_hourly_rate(client_name="Client X")
[Réponse] → "✓ Taux horaire Client X : 80,00 €/h"

[Étape 3/6] → calculate_amount(hours=85, rate=80)
[Réponse] → "✓ Montant calculé : 6 800,00 € HT"

[Étape 4/6] → create_invoice(
                client_name="Client X",
                description="Projet Y - 85 heures",
                amount_ht=6800,
                items=[{description: "Développement projet Y", quantity: 85, unit_price: 80}]
              )
[Réponse] → "✓ Facture #FAC-2024-035 créée"

[Étape 5/6] → send_invoice(invoice_id="...")
[Réponse] → "✓ Facture envoyée à Client X"

[Étape 6/6] → mark_project_billed(project_id="...")
[Réponse] → "✓ Projet Y marqué comme facturé

             📊 Workflow terminé :
             • Heures : 85h
             • Montant HT : 6 800,00 €
             • Montant TTC : 8 160,00 €
             • Facture : #FAC-2024-035 ✅
             • Envoyée au client ✅
             • Projet marqué facturé ✅"
```

---

#### **Workflow 3 : Rollback sur Erreur**

```
👤 Utilisateur:
"Crée fournisseur NewSupply, puis BC de 100 souris"

🤖 IA:
[Étape 1/2] → create_supplier(name="NewSupply")
[Réponse] → "✓ Fournisseur 'NewSupply' créé (ID: 456)"

[Étape 2/2] → create_purchase_order(supplier_id="456", ...)
[Erreur] → Email fournisseur manquant (requis pour envoi)

[Rollback] → Que faire ?
[Réponse] → "⚠️ Erreur lors de la création du BC :
             Email du fournisseur requis pour l'envoi.

             Actions effectuées :
             ✓ Fournisseur 'NewSupply' créé

             Options :
             1️⃣ Ajouter l'email maintenant et continuer
             2️⃣ Créer le BC quand même (sans envoi auto)
             3️⃣ Annuler tout (supprimer le fournisseur créé)"

👤 Utilisateur:
"1, email: supply@new.com"

🤖 IA:
[Action] → update_supplier(supplier_id="456", email="supply@new.com")
[Retry] → create_purchase_order(supplier_id="456", ...)
[Réponse] → "✓ Email ajouté
             ✓ BC #BC-2024-021 créé

             Tout est bon ! 🎉"
```

---

## 📎 Gestion des Pièces Jointes

### Principe de Stockage

Chaque document scanné ou généré est lié à son entité.

---

### Types de Fichiers

```python
SUPPORTED_FILE_TYPES = {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'tiff'],
    'documents': ['pdf', 'docx', 'xlsx'],
    'archives': ['zip']
}

STORAGE_STRUCTURE = {
    'invoices/': 'Fichiers factures',
    'purchase_orders/': 'Fichiers BC',
    'suppliers/': 'Documents fournisseurs',
    'receipts/': 'Re reçus/justificatifs'
}
```

---

### 📖 Scénarios Pièces Jointes

#### **Scénario 1 : Lier document scanné à facture créée**

```
👤 Utilisateur:
[Upload image] "Analyse cette facture"

🤖 IA:
[OCR] → Extraction données
[Action] → analyze_document(document_type="invoice")
[Stockage] → Fichier sauvegardé : /uploads/invoices/temp_12345.jpg
[Réponse] → "✓ Facture analysée

             Voulez-vous créer la facture dans le système ?"

👤 Utilisateur:
"Oui"

🤖 IA:
[Action] → create_invoice(...)
[Lien] → Attache /temp_12345.jpg à invoice_id
[Renommage] → /invoices/FAC-2024-040_scan.jpg
[Réponse] → "✓ Facture #FAC-2024-040 créée
             📎 Document original joint"
```

---

#### **Scénario 2 : Accéder aux fichiers depuis l'IA**

```
👤 Utilisateur:
"Montre-moi le document de la facture #FAC-2024-040"

🤖 IA:
[Recherche] → Facture trouvée
[Vérification] → 1 fichier attaché
[Réponse] → "📄 Facture #FAC-2024-040

             Fichier joint :
             📎 FAC-2024-040_scan.jpg (250 KB)
             📅 Ajouté le : 28/09/2024

             [Télécharger] [Visualiser]"
```

---

#### **Scénario 3 : Génération PDF et stockage**

```
👤 Utilisateur:
"Génère le PDF de la facture #FAC-2024-025"

🤖 IA:
[Action] → generate_invoice_pdf(invoice_id="...")
[Génération] → PDF créé : /invoices/FAC-2024-025.pdf
[Stockage] → Lien avec facture
[Réponse] → "✓ PDF généré

             📄 FAC-2024-025.pdf (120 KB)

             [📥 Télécharger] [📧 Envoyer par email] [👁️ Aperçu]"
```

---

#### **Scénario 4 : Multiple fichiers pour une entité**

```
👤 Utilisateur:
"Ajoute ces documents au fournisseur Acme Corp"
[Upload 3 fichiers : RIB.pdf, KBIS.pdf, Contrat.pdf]

🤖 IA:
[Upload] → 3 fichiers reçus
[Validation] → Types valides ✓
[Stockage] → /suppliers/acme_corp/
[Lien] → Attachés à supplier_id
[Réponse] → "✓ 3 documents ajoutés à 'Acme Corp' :
             📎 RIB.pdf (85 KB)
             📎 KBIS.pdf (340 KB)
             📎 Contrat.pdf (1.2 MB)

             Total : 3 fichiers attachés"
```

---

## 🔔 Notifications et Alertes Proactives

### Types d'Alertes

```python
ALERT_TYPES = {
    'payment_overdue': 'Facture impayée',
    'low_stock': 'Stock bas',
    'inactive_entity': 'Entité inactive',
    'anomaly_detected': 'Anomalie détectée',
    'expiring_soon': 'Expiration prochaine'
}
```

---

### 📖 Scénarios Proactifs

#### **Scénario 1 : Alerte facture impayée**

```
🤖 IA (Proactif):
"🔔 Notification :

3 factures sont en retard de paiement :

1. #FAC-2024-015 - Client ABC - 1 500€ - Retard : 12 jours
2. #FAC-2024-018 - Entreprise XYZ - 3 200€ - Retard : 8 jours
3. #FAC-2024-020 - Client Pro - 980€ - Retard : 5 jours

Total impayé : 5 680€

Voulez-vous :
1️⃣ Envoyer des relances automatiques
2️⃣ Voir les détails
3️⃣ Reporter la relance"

👤 Utilisateur:
"1"

🤖 IA:
[Action] → send_payment_reminders(invoice_ids=[...])
[Réponse] → "✓ 3 relances envoyées par email"
```

---

#### **Scénario 2 : Suggestion basée sur historique**

```
🤖 IA (Proactif):
"💡 Suggestion :

Vous commandez habituellement des claviers chez Tech Supply chaque mois.

Dernière commande : il y a 35 jours
Stock estimé actuel : Bas

Voulez-vous créer un BC maintenant ?
(Quantité habituelle : 50 unités)"

👤 Utilisateur:
"Oui, même quantité"

🤖 IA:
[Action] → create_purchase_order(supplier="Tech Supply", items=[...])
[Réponse] → "✓ BC #BC-2024-025 créé automatiquement"
```

---

#### **Scénario 3 : Détection d'anomalie**

```
🤖 IA (Proactif):
"⚠️ Anomalie détectée :

Facture #FAC-2024-042 pour Client ABC :
• Montant : 25 000€
• Moyenne habituelle : 2 500€
• Écart : +900% 🚨

Voulez-vous vérifier cette facture ?"

👤 Utilisateur:
"Montre-moi"

🤖 IA:
[Action] → get_invoice_details(invoice_id="...")
[Réponse] → "📄 Facture #FAC-2024-042 - Détails..."
```

---

## 🎯 Patterns de Détection d'Intention

### Mots-clés par Action

```python
INTENT_PATTERNS = {
    'create_supplier': [
        'créer fournisseur', 'ajouter fournisseur', 'nouveau fournisseur',
        'enregistrer fournisseur', 'ajoute fournisseur'
    ],
    'create_invoice': [
        'créer facture', 'nouvelle facture', 'faire facture',
        'facturer', 'facture pour'
    ],
    'create_purchase_order': [
        'bon de commande', 'BC', 'commander', 'commande pour',
        'acheter', 'créer BC'
    ],
    'search_supplier': [
        'chercher fournisseur', 'trouver fournisseur', 'recherche fournisseur',
        'liste fournisseurs', 'voir fournisseurs'
    ],
    'search_invoice': [
        'chercher facture', 'trouver facture', 'factures impayées',
        'factures en attente', 'liste factures'
    ],
    'get_statistics': [
        'statistiques', 'stats', 'chiffre', 'revenus', 'CA',
        'tableau de bord', 'performance'
    ],
    'import_supplier_list': [
        'registre fournisseurs', 'liste fournisseurs', 'carnet fournisseurs',
        'importer fournisseurs', 'plusieurs fournisseurs'
    ],
    'import_client_list': [
        'registre clients', 'liste clients', 'carnet clients',
        'importer clients', 'plusieurs clients'
    ],
    'analyze_document': [
        'analyser document', 'scanner document', 'analyser',
        'regarder document', 'extraire données'
    ],
    'detect_document_type': [
        'identifier document', 'type de document', 'c\'est quoi',
        'reconnaître document'
    ]
}
```

---

## 🛡️ Gestion des Erreurs

### Erreur 1 : Paramètre obligatoire manquant

```
👤 Utilisateur: "Crée une facture"

🤖 IA: "Pour créer une facture, j'ai besoin de :
        • Nom du client ✗
        • Description de la prestation ✗

        Pouvez-vous me donner ces informations ?"
```

### Erreur 2 : Entité non trouvée

```
👤 Utilisateur: "Crée un BC pour Fournisseur Inconnu"

🤖 IA: "Je n'ai pas trouvé de fournisseur nommé 'Fournisseur Inconnu'.

        Options :
        • Rechercher un fournisseur similaire
        • Créer ce fournisseur d'abord
        • Me donner un autre nom"
```

### Erreur 3 : Données invalides

```
👤 Utilisateur: "Facture pour Client X, montant: ABC euros"

🤖 IA: "Le montant 'ABC euros' n'est pas valide.
        Veuillez indiquer un montant numérique (ex: 1500)"
```

---

## 📝 Format des Réponses IA

### Structure Standard

```json
{
  "response": "Texte de réponse en français",
  "action": {
    "action": "nom_action",
    "params": {
      "param1": "valeur1",
      "param2": "valeur2"
    }
  },
  "missing_params": ["param3"],
  "confidence": 0.95
}
```

### Exemple avec Info Manquante

```json
{
  "response": "Pour créer cette facture, j'ai besoin du nom du client. Quel est le nom du client ?",
  "action": null,
  "missing_params": ["client_name"],
  "context": {
    "action_intent": "create_invoice",
    "collected_params": {
      "description": "Développement web",
      "amount": 5000
    }
  }
}
```

---

## 🚀 Optimisations Token

### Techniques Utilisées

1. **Intent Detection Local** : Pas d'appel IA si confiance > 80%
2. **Prompts Optimisés** : Templates courts et précis
3. **Historique Compressé** : Résumé auto après 10 messages
4. **Cache Intelligent** : Réutilisation des réponses similaires

### Exemple de Compression

```
Avant (1500 tokens):
User: "Crée un fournisseur ABC"
AI: "Fournisseur créé avec succès ! [long texte...]"
User: "Merci"
AI: "De rien ! Comment puis-je vous aider..."
...

Après (300 tokens):
[Résumé: Fournisseur ABC créé]
[Message actuel de l'utilisateur]
```

---

## ✅ Checklist de Test pour Chaque Action

### Test Basique
- [ ] Action avec tous les params → Succès
- [ ] Action sans params → Demande d'info
- [ ] Action avec params invalides → Message d'erreur

### Test Conversationnel
- [ ] Info donnée progressivement → Collecte correcte
- [ ] Confirmation avant action → Validation OK
- [ ] Modification après proposition → Update correct

### Test Edge Cases
- [ ] Caractères spéciaux → Gestion OK
- [ ] Valeurs extrêmes → Validation OK
- [ ] Timeout → Message d'erreur

---

## 📌 Résumé des Actions Disponibles

### Actions Principales (12)

| # | Action | Catégorie | Type | Description Courte |
|---|--------|-----------|------|-------------------|
| 1 | `create_supplier` | Fournisseurs | Création | Créer un fournisseur unique |
| 2 | `create_invoice` | Factures | Création | Créer une facture |
| 3 | `create_purchase_order` | Achats | Création | Créer un bon de commande |
| 4 | `add_invoice_items` | Factures | Modification | Ajouter des articles à une facture |
| 5 | `send_invoice` | Factures | Communication | Envoyer une facture par email |
| 6 | `search_supplier` | Fournisseurs | Recherche | Rechercher des fournisseurs |
| 7 | `search_invoice` | Factures | Recherche | Rechercher des factures |
| 8 | `get_statistics` | Dashboard | Analyse | Afficher statistiques |
| 9 | `analyze_document` | Documents | OCR | Analyser un document scanné |
| 10 | `import_supplier_list` | Fournisseurs | Import masse | Importer registre fournisseurs |
| 11 | `import_client_list` | Clients | Import masse | Importer registre clients |
| 12 | `detect_document_type` | Documents | Détection | Identifier type de document |

---

## 🔮 Prochaines Actions à Implémenter

### Priorité Haute
1. ✅ `import_supplier_list` - Import en masse fournisseurs (DOCUMENTÉ)
2. ✅ `import_client_list` - Import en masse clients (DOCUMENTÉ)
3. ✅ `detect_document_type` - Détection auto de documents (DOCUMENTÉ)
4. ⏳ `check_duplicate_suppliers` - Vérification doublons fournisseurs
5. ⏳ `check_duplicate_clients` - Vérification doublons clients

### Priorité Moyenne
6. `update_supplier` - Modifier un fournisseur existant
7. `update_invoice` - Modifier une facture
8. `mark_invoice_paid` - Marquer facture comme payée
9. `send_payment_reminder` - Envoyer relance de paiement
10. `get_supplier_stats` - Statistiques par fournisseur

### Priorité Basse
11. `delete_supplier` - Supprimer un fournisseur
12. `export_data` - Export Excel/CSV
13. `create_quote` - Créer un devis
14. `convert_quote_to_invoice` - Convertir devis en facture
15. `merge_suppliers` - Fusionner fournisseurs doublons

---

## 📊 Matrice de Couverture des Cas d'Usage

| Cas d'Usage | Action(s) Impliquée(s) | Statut |
|-------------|----------------------|--------|
| Créer un fournisseur à la main | `create_supplier` | ✅ Documenté |
| Scanner une facture papier | `analyze_document` → `create_invoice` | ✅ Documenté |
| Scanner un bon de commande | `analyze_document` → `create_purchase_order` | ✅ Documenté |
| Importer un fichier Excel de fournisseurs | `import_supplier_list` | ✅ Documenté |
| Importer un carnet de clients | `import_client_list` | ✅ Documenté |
| Document ambigu (type inconnu) | `detect_document_type` → action spécifique | ✅ Documenté |
| Facture + BC dans même PDF | `detect_document_type` multi-pages | ✅ Documenté |
| Vérifier doublons avant import | `check_duplicate_suppliers/clients` | ⏳ À implémenter |
| Infos manquantes dans scan | Demande interactive | ✅ Documenté |
| Mise à jour info fournisseur | `update_supplier` | ⏳ À implémenter |
| Recherche fournisseurs/clients | `search_supplier/client` | ✅ Documenté |

---

## 🧪 Scénarios de Test par Type de Document

### Test 1 : Facture Simple
```
Input: Image de facture claire avec tous les champs
Expected:
  1. Détection type = invoice (confiance > 80%)
  2. Extraction: numéro, date, client, montants, articles
  3. Proposition de création
  4. Création réussie
```

### Test 2 : Liste Fournisseurs (5 entrées)
```
Input: Image de tableau avec 5 fournisseurs
Expected:
  1. Détection type = supplier_list (confiance > 70%)
  2. Extraction: 5 entrées avec nom, contact, email
  3. Check doublons
  4. Import sélectif ou complet
  5. Rapport: X créés, Y doublons
```

### Test 3 : Document Ambigu
```
Input: Image floue ou type incertain
Expected:
  1. Détection confiance < 50%
  2. Demande explicite du type
  3. User précise le type
  4. Traitement selon type
```

### Test 4 : Registre Clients avec Doublons
```
Input: Liste 10 clients dont 3 déjà en base
Expected:
  1. Détection supplier_list ou client_list
  2. User confirme = clients
  3. Extraction 10 entrées
  4. Check doublons → 3 trouvés
  5. Proposition: import 7 nouveaux ou update 3
  6. Exécution selon choix user
```

### Test 5 : PDF Multi-Pages
```
Input: PDF avec Page 1 = Facture, Page 2 = BC
Expected:
  1. Détection multi-pages
  2. Page 1: invoice (95%)
  3. Page 2: purchase_order (90%)
  4. Proposition: importer les 2 ou choisir
  5. Exécution selon choix
```

---

## 🎓 Guide de Contribution

### Ajouter une Nouvelle Action

1. **Documenter dans `actions_config.json`**
```json
{
  "new_action_name": {
    "name": "Nom affiché",
    "description": "Description claire",
    "icon": "material_icon",
    "category": "suppliers|invoices|purchase_orders|documents|dashboard",
    "required_params": ["param1", "param2"],
    "optional_params": ["param3"],
    "success_actions": [...],
    "ai_prompts": {...}
  }
}
```

2. **Implémenter dans `ActionExecutor` (services.py)**
```python
async def new_action_name(self, params: Dict, user) -> Dict:
    """Description de l'action"""
    # Validation
    # Logique métier
    # Retourner résultat
    return {
        'success': True,
        'message': 'Action réussie',
        'data': {...}
    }
```

3. **Ajouter les tests**
```python
# apps/ai_assistant/tests/test_actions.py
async def test_new_action_name():
    executor = ActionExecutor()
    result = await executor.execute('new_action_name', params, user)
    assert result['success'] == True
```

4. **Documenter les scénarios dans ce README**

---

## 📈 Métriques de Performance

### Temps de Réponse Cible

| Type d'Action | Temps Max | Note |
|---------------|-----------|------|
| Création simple (supplier, invoice) | < 2s | Sans OCR |
| Recherche | < 1s | Avec cache |
| OCR + Analyse document | < 5s | Dépend qualité image |
| Import liste (< 10 entrées) | < 3s | Sans doublons |
| Import liste (> 10 entrées) | < 10s | Avec check doublons |
| Statistiques | < 2s | Avec cache |

### Taux de Succès Cible

| Métrique | Objectif |
|----------|----------|
| Détection type document (confiance > 80%) | > 90% |
| Extraction données facture complète | > 85% |
| Extraction données BC complète | > 85% |
| Import liste sans erreur | > 95% |
| Détection doublons précise | > 98% |

---

**📅 Dernière mise à jour** : 30 septembre 2024
**🔧 Version** : 1.1
**✨ Nouveautés v1.1** : Import masse fournisseurs/clients, détection automatique documents
**👤 Auteur** : Système IA ProcureGenius