/**
 * Structure de documentation pour ProcureGenius
 * Contient tous les articles de documentation organisés par catégorie
 */

export const documentationCategories = [
  {
    id: 'getting-started',
    title: 'Démarrage',
    description: 'Premiers pas avec ProcureGenius',
    icon: 'Rocket',
    color: '#2563eb',
  },
  {
    id: 'suppliers',
    title: 'Fournisseurs',
    description: 'Gérer vos fournisseurs',
    icon: 'Business',
    color: '#10b981',
  },
  {
    id: 'purchase-orders',
    title: 'Bons de commande',
    description: 'Créer et suivre vos commandes',
    icon: 'ShoppingCart',
    color: '#f59e0b',
  },
  {
    id: 'invoices',
    title: 'Factures',
    description: 'Gérer vos factures',
    icon: 'Receipt',
    color: '#8b5cf6',
  },
  {
    id: 'clients',
    title: 'Clients',
    description: 'Gérer votre portefeuille clients',
    icon: 'People',
    color: '#06b6d4',
  },
  {
    id: 'products',
    title: 'Produits',
    description: 'Catalogue et gestion des produits',
    icon: 'Inventory',
    color: '#ec4899',
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Configuration de l\'application',
    icon: 'Settings',
    color: '#64748b',
  },
  {
    id: 'tips',
    title: 'Astuces',
    description: 'Conseils et bonnes pratiques',
    icon: 'Lightbulb',
    color: '#f97316',
  },
];

export const documentationArticles = [
  // DÉMARRAGE
  {
    id: 'getting-started-intro',
    category: 'getting-started',
    title: 'Bienvenue sur ProcureGenius',
    content: `
# Bienvenue sur ProcureGenius

ProcureGenius est votre solution complète de gestion des achats et de la relation fournisseur.

## Fonctionnalités principales

### 📦 Gestion des achats
- Création et suivi des bons de commande
- Gestion des factures fournisseurs
- Catalogue produits centralisé

### 👥 Gestion des relations
- Fiche fournisseur complète
- Suivi des contacts
- Historique des transactions

### 🤖 Intelligence artificielle
- Assistant IA pour vous aider dans vos tâches
- Analyse automatique des documents
- Suggestions intelligentes

### 📊 Tableaux de bord
- Vue d'ensemble de votre activité
- Indicateurs clés de performance
- Rapports personnalisables

## Par où commencer ?

1. **Configurez votre profil** dans les paramètres
2. **Ajoutez vos premiers fournisseurs**
3. **Créez votre catalogue produits**
4. **Commencez à créer des bons de commande**

## Besoin d'aide ?

- Utilisez le **tutoriel interactif** depuis le bouton d'aide
- Consultez la **FAQ** pour les questions fréquentes
- Contactez le **support** via le menu d'aide
`,
    keywords: ['démarrage', 'introduction', 'bienvenue', 'commencer', 'premiers pas'],
    relatedTopics: ['getting-started-navigation', 'getting-started-dashboard'],
  },
  {
    id: 'getting-started-navigation',
    category: 'getting-started',
    title: 'Navigation dans l\'interface',
    content: `
# Navigation dans l'interface

## Menu principal

Le menu latéral gauche vous permet d'accéder aux différents modules :

- **Tableau de bord** : Vue d'ensemble de votre activité
- **Fournisseurs** : Gestion de vos fournisseurs
- **Bons de commande** : Création et suivi des commandes
- **Factures** : Gestion des factures
- **Produits** : Catalogue produits
- **Clients** : Gestion clients
- **Assistant IA** : Votre assistant intelligent

## Barre d'outils supérieure

### Bouton "Nouveau"
Créez rapidement un nouvel élément dans le module actif.

### Thème clair/sombre
Basculez entre les modes clair et sombre selon vos préférences.

### Notifications
Recevez des alertes sur les événements importants.

### Aide et tutoriel
Accédez au tutoriel interactif, à la documentation et au support.

### Menu utilisateur
Gérez votre profil et déconnectez-vous.

## Navigation mobile

Sur mobile, utilisez la barre de navigation en bas de l'écran pour accéder rapidement aux modules principaux.
`,
    keywords: ['navigation', 'menu', 'interface', 'barre d\'outils'],
    relatedTopics: ['getting-started-intro', 'shortcuts-navigation'],
  },
  {
    id: 'getting-started-dashboard',
    category: 'getting-started',
    title: 'Utiliser le tableau de bord',
    content: `
# Utiliser le tableau de bord

Le tableau de bord vous offre une vue d'ensemble de votre activité.

## Widgets disponibles

### Widgets de statistiques
- Nombre total de fournisseurs
- Bons de commande en cours
- Factures à traiter
- Produits au catalogue

### Graphiques d'analyse
- Évolution des achats
- Répartition par fournisseur
- Tendances des dépenses

### Listes rapides
- Derniers bons de commande
- Factures en attente
- Actions à effectuer

## Personnalisation

Vous pouvez personnaliser votre tableau de bord :

1. Cliquez sur **"Personnaliser le tableau de bord"**
2. Glissez-déposez les widgets pour les réorganiser
3. Ajoutez ou supprimez des widgets selon vos besoins
4. Ajustez la période d'affichage

## Périodes d'affichage

Changez la période pour voir vos données sur :
- Aujourd'hui
- Cette semaine
- Ce mois-ci
- Ce trimestre
- Cette année
- Période personnalisée
`,
    keywords: ['tableau de bord', 'dashboard', 'widgets', 'statistiques', 'personnalisation'],
    relatedTopics: ['getting-started-intro'],
  },

  // FOURNISSEURS
  {
    id: 'suppliers-create',
    category: 'suppliers',
    title: 'Créer un fournisseur',
    content: `
# Créer un fournisseur

## Étapes de création

1. **Accédez au module Fournisseurs**
   - Cliquez sur "Fournisseurs" dans le menu principal

2. **Créez un nouveau fournisseur**
   - Cliquez sur le bouton "Nouveau" ou "Nouveau fournisseur"

3. **Remplissez les informations**

### Informations générales (obligatoire)
- **Nom** : Raison sociale du fournisseur
- **Code fournisseur** : Référence unique (généré automatiquement si vide)
- **Email** : Email de contact principal
- **Téléphone** : Numéro de téléphone

### Adresse
- Adresse complète
- Ville
- Code postal
- Pays

### Informations financières
- **Conditions de paiement** : Délai de paiement (ex: 30 jours)
- **Devise** : Devise par défaut
- **TVA** : Numéro de TVA intracommunautaire

### Contacts
Ajoutez les personnes de contact chez le fournisseur :
- Nom et prénom
- Fonction
- Email
- Téléphone

4. **Enregistrez**
   - Cliquez sur "Enregistrer" pour créer le fournisseur

## Conseils

- Utilisez des codes fournisseurs cohérents (ex: FOUR-001, FOUR-002)
- Ajoutez tous les contacts pertinents
- Renseignez les conditions de paiement pour faciliter la gestion des factures
`,
    keywords: ['créer fournisseur', 'nouveau fournisseur', 'ajouter fournisseur'],
    relatedTopics: ['suppliers-manage', 'suppliers-contacts'],
  },
  {
    id: 'suppliers-manage',
    category: 'suppliers',
    title: 'Gérer les fournisseurs',
    content: `
# Gérer les fournisseurs

## Liste des fournisseurs

La page liste affiche tous vos fournisseurs avec :
- Nom et code
- Statut (actif/inactif)
- Contact principal
- Nombre de commandes
- Montant total des achats

### Filtres et recherche
- **Recherche** : Recherchez par nom, code ou email
- **Statut** : Filtrez par actif/inactif
- **Tri** : Triez par nom, date de création, montant

## Fiche fournisseur

Cliquez sur un fournisseur pour voir :

### Onglet Informations
- Coordonnées complètes
- Informations financières
- Liste des contacts

### Onglet Historique
- Tous les bons de commande
- Toutes les factures
- Statistiques d'achat

### Onglet Documents
- Documents attachés
- Contrats
- Certifications

### Onglet Notes
- Notes internes
- Historique des échanges

## Actions rapides

Depuis la fiche fournisseur :
- **Créer un bon de commande**
- **Créer une facture**
- **Modifier les informations**
- **Désactiver/Activer**
- **Supprimer** (si aucune transaction)
`,
    keywords: ['gérer fournisseurs', 'liste fournisseurs', 'fiche fournisseur'],
    relatedTopics: ['suppliers-create', 'purchase-orders-create'],
  },
  {
    id: 'suppliers-contacts',
    category: 'suppliers',
    title: 'Gérer les contacts fournisseurs',
    content: `
# Gérer les contacts fournisseurs

## Ajouter un contact

1. Ouvrez la fiche du fournisseur
2. Allez dans la section "Contacts"
3. Cliquez sur "Ajouter un contact"
4. Remplissez les informations :
   - Nom et prénom
   - Fonction/Poste
   - Email professionnel
   - Téléphone direct
   - Mobile (optionnel)
   - Notes (optionnel)

## Définir un contact principal

Le contact principal est utilisé par défaut pour :
- Les communications
- Les bons de commande
- Les factures

Pour définir un contact principal :
1. Cliquez sur l'étoile à côté du contact
2. Le contact devient le contact principal

## Modifier un contact

1. Cliquez sur le contact à modifier
2. Modifiez les informations
3. Enregistrez les modifications

## Supprimer un contact

1. Cliquez sur l'icône de suppression
2. Confirmez la suppression

**Note** : Vous ne pouvez pas supprimer le dernier contact d'un fournisseur.
`,
    keywords: ['contacts', 'contact fournisseur', 'contact principal'],
    relatedTopics: ['suppliers-create', 'suppliers-manage'],
  },

  // BONS DE COMMANDE
  {
    id: 'purchase-orders-create',
    category: 'purchase-orders',
    title: 'Créer un bon de commande',
    content: `
# Créer un bon de commande

## Étapes de création

1. **Accédez au module Bons de commande**
   - Menu principal > Bons de commande

2. **Nouveau bon de commande**
   - Cliquez sur "Nouveau" ou "Nouveau bon de commande"

3. **Sélectionnez le fournisseur**
   - Recherchez et sélectionnez le fournisseur
   - Les informations du fournisseur se remplissent automatiquement

4. **Informations générales**
   - **Numéro** : Généré automatiquement (modifiable)
   - **Date** : Date du bon de commande
   - **Date de livraison attendue** : Date prévue de réception
   - **Référence fournisseur** : Référence de devis ou commande fournisseur

5. **Ajoutez des produits**

### Depuis le catalogue
- Cliquez sur "Ajouter un produit"
- Sélectionnez le produit
- Indiquez la quantité
- Le prix se remplit automatiquement (modifiable)

### Produit personnalisé
- Entrez directement la description
- Indiquez le prix unitaire
- Spécifiez la quantité

6. **Conditions et notes**
   - Conditions de paiement
   - Conditions de livraison
   - Notes internes
   - Remarques pour le fournisseur

7. **Validez**
   - Cliquez sur "Enregistrer" pour créer le brouillon
   - Cliquez sur "Enregistrer et envoyer" pour valider et envoyer

## Statuts du bon de commande

- **Brouillon** : En cours de création
- **Envoyé** : Envoyé au fournisseur
- **Confirmé** : Confirmé par le fournisseur
- **Partiellement reçu** : Réception partielle
- **Reçu** : Livraison complète
- **Annulé** : Commande annulée
`,
    keywords: ['créer bon de commande', 'nouveau bon de commande', 'purchase order'],
    relatedTopics: ['purchase-orders-manage', 'products-add'],
  },
  {
    id: 'purchase-orders-manage',
    category: 'purchase-orders',
    title: 'Gérer les bons de commande',
    content: `
# Gérer les bons de commande

## Liste des bons de commande

Visualisez tous vos bons de commande avec :
- Numéro et date
- Fournisseur
- Montant total
- Statut
- Date de livraison prévue

### Filtres disponibles
- **Statut** : Brouillon, Envoyé, Reçu, etc.
- **Fournisseur** : Filtrer par fournisseur
- **Période** : Par date de création ou de livraison
- **Montant** : Plage de montants

### Recherche
Recherchez par :
- Numéro de commande
- Nom du fournisseur
- Référence fournisseur

## Détail d'un bon de commande

Cliquez sur un bon de commande pour voir :

### Informations générales
- Détails du fournisseur
- Dates et références
- Statut actuel

### Liste des produits
- Description
- Quantité commandée / reçue
- Prix unitaire
- Total

### Historique
- Création
- Envoi
- Confirmations
- Réceptions
- Modifications

## Actions possibles

### Sur un brouillon
- Modifier
- Envoyer au fournisseur
- Supprimer

### Sur un bon envoyé
- Marquer comme confirmé
- Enregistrer une réception partielle
- Enregistrer la réception complète
- Créer une facture
- Annuler

### Sur un bon reçu
- Créer une facture
- Voir les factures liées
- Exporter en PDF
`,
    keywords: ['gérer bons de commande', 'suivi commande', 'réception'],
    relatedTopics: ['purchase-orders-create', 'invoices-create'],
  },
  {
    id: 'purchase-orders-receive',
    category: 'purchase-orders',
    title: 'Réceptionner une commande',
    content: `
# Réceptionner une commande

## Réception complète

Pour une réception de tous les produits :

1. Ouvrez le bon de commande
2. Cliquez sur "Réceptionner"
3. Vérifiez les quantités
4. Ajoutez une note de réception (optionnel)
5. Validez

Le statut passe automatiquement à "Reçu".

## Réception partielle

Pour une réception d'une partie des produits :

1. Ouvrez le bon de commande
2. Cliquez sur "Réception partielle"
3. Pour chaque produit :
   - Indiquez la quantité reçue
   - Notez les éventuels problèmes
4. Validez

Le statut devient "Partiellement reçu".
Vous pouvez faire plusieurs réceptions partielles jusqu'à réception complète.

## Gestion des écarts

En cas de différence entre commandé et reçu :

### Quantité différente
- Indiquez la quantité réellement reçue
- Notez la raison de l'écart
- Décidez si vous voulez :
  - Attendre le complément
  - Annuler le reste
  - Créer une nouvelle commande

### Produit endommagé
- Marquez le produit comme "endommagé"
- Indiquez la quantité concernée
- Ajoutez des photos si nécessaire
- Contactez le fournisseur

### Produit manquant
- Ne marquez pas le produit comme reçu
- Contactez le fournisseur
- Le système vous rappellera les produits en attente

## Historique des réceptions

Consultez l'historique des réceptions dans l'onglet "Historique" :
- Date de chaque réception
- Quantités reçues
- Notes et commentaires
- Utilisateur ayant effectué la réception
`,
    keywords: ['réception', 'livraison', 'réceptionner commande', 'réception partielle'],
    relatedTopics: ['purchase-orders-manage', 'purchase-orders-create'],
  },

  // FACTURES
  {
    id: 'invoices-pdf-email',
    category: 'invoices',
    title: 'Génération et envoi de factures PDF',
    content: `
# Génération et envoi de factures PDF

ProcureGenius génère automatiquement des factures PDF professionnelles et les envoie par email.

## Ce qui EST possible

### ✅ Génération automatique de PDF

Chaque facture peut être générée en PDF professionnel avec :

**4 templates disponibles :**
1. **Classic** : Design traditionnel et sobre
2. **Modern** : Style contemporain avec couleurs
3. **Minimal** : Épuré et élégant
4. **Professional** : Format corporatif avancé

**Personnalisation :**
- Votre logo d'entreprise
- Vos couleurs de marque
- Mentions légales personnalisées
- Conditions générales de vente

**Éléments automatiques :**
- QR code de paiement (selon configuration)
- Numérotation automatique
- Calculs TTC/HT automatiques
- Multi-devises (€, $, £, etc.)

### ✅ Envoi par email avec PDF attaché

**Depuis la facture :**
1. Cliquez sur "Envoyer"
2. Le PDF est **généré automatiquement**
3. Email pré-rempli avec :
   - Destinataire (email du client)
   - Objet personnalisé
   - Message professionnel
   - **PDF de la facture en pièce jointe**
4. Personnalisez le message si besoin
5. Envoyez

**Confirmation :**
- Email envoyé avec succès
- Date d'envoi enregistrée
- Historique complet des envois

### ✅ Téléchargement et impression

**Télécharger :**
- Cliquez sur "Télécharger PDF"
- Le PDF se télécharge instantanément
- Format optimisé pour archivage

**Imprimer :**
- Cliquez sur "Imprimer"
- Le PDF s'ouvre dans une fenêtre d'impression
- Format A4 optimisé

### ✅ Templates personnalisables

Dans **Paramètres > Facturation** :
- Choisissez votre template par défaut
- Uploadez votre logo (PNG, JPG)
- Configurez vos couleurs (hexadécimal)
- Ajoutez vos mentions légales
- Prévisualisez en temps réel

## Ce qui N'EST PAS possible

### ❌ Upload de PDF externe

Vous **ne pouvez pas** :
- Uploader un PDF scanné depuis votre ordinateur
- Remplacer le PDF généré par un autre
- Stocker des PDFs externes dans les factures

**Pourquoi ?**
Les factures sont générées dynamiquement à partir des données du système pour garantir la cohérence et l'intégrité.

**Alternative :**
- Utilisez le chat IA pour **extraire les données** d'un PDF scanné
- L'IA crée la facture dans le système avec ces données
- Un nouveau PDF est alors généré automatiquement

### ❌ Modification du PDF après génération

Une fois généré, le PDF ne peut pas être :
- Modifié directement
- Annoté dans l'application
- Signé électroniquement dans ProcureGenius

**Alternative :**
- Modifiez la facture dans le système
- Régénérez un nouveau PDF avec les modifications

### ❌ Signature électronique intégrée

ProcureGenius ne gère pas :
- La signature électronique qualifiée
- La validation de signatures
- Les certificats numériques

**Alternative :**
- Téléchargez le PDF
- Utilisez un outil externe de signature (Adobe Sign, DocuSign, etc.)
- Archivez le PDF signé séparément

## Comment générer et envoyer une facture

### Méthode 1 : Génération simple

1. Ouvrez la facture
2. Cliquez sur **"Télécharger PDF"** ou **"Imprimer"**
3. Le PDF est généré à la volée
4. Choisissez l'action (télécharger, imprimer, ouvrir)

### Méthode 2 : Envoi par email

1. Ouvrez la facture
2. Cliquez sur **"Envoyer"**
3. Vérifiez/modifiez :
   - Email destinataire
   - Objet du message
   - Corps du message
4. Cliquez sur **"Envoyer l'email"**
5. Le PDF est **automatiquement attaché**

**Le client reçoit :**
- Email personnalisé
- Facture en PDF de qualité professionnelle
- Prête à être payée ou archivée

### Méthode 3 : Envoi groupé

Pour envoyer plusieurs factures :
1. Page liste des factures
2. Sélectionnez les factures (cases à cocher)
3. Actions groupées > **"Envoyer par email"**
4. Confirmez
5. Chaque facture est envoyée individuellement avec son PDF

## Configuration email

Pour que l'envoi fonctionne, configurez vos paramètres SMTP :

1. **Paramètres > Email**
2. Renseignez :
   - Serveur SMTP (ex: smtp.gmail.com)
   - Port (465 SSL ou 587 TLS)
   - Email expéditeur
   - Mot de passe SMTP
3. Testez la configuration
4. Sauvegardez

**Services compatibles :**
- Gmail
- Outlook / Office 365
- OVH
- Infomaniak
- Tout serveur SMTP standard

## Astuces

### Testez vos templates
Avant d'envoyer à un client :
- Générez un PDF de test
- Vérifiez le rendu (logo, couleurs, alignement)
- Imprimez un exemplaire

### Personnalisez vos messages
Créez des templates d'email pour :
- Première facture d'un client
- Factures récurrentes
- Relances de paiement
- Factures avec remise

### Archivage automatique
Les PDFs ne sont pas stockés, ils sont générés à la demande.
Pour archiver :
- Téléchargez les PDFs importants
- Sauvegardez-les dans votre GED externe
`,
    keywords: ['PDF', 'email', 'envoi', 'génération', 'template', 'facture PDF'],
    relatedTopics: ['invoices-manage', 'settings-company'],
  },
  {
    id: 'invoices-create',
    category: 'invoices',
    title: 'Créer une facture',
    content: `
# Créer une facture

## Création depuis un bon de commande

C'est la méthode recommandée :

1. Ouvrez le bon de commande reçu
2. Cliquez sur "Créer une facture"
3. Les informations se remplissent automatiquement :
   - Fournisseur
   - Produits et quantités
   - Prix

4. Complétez :
   - Numéro de facture fournisseur
   - Date de facture
   - Date d'échéance

5. Enregistrez

## Création manuelle

Pour une facture sans bon de commande :

1. Menu > Factures > Nouveau
2. Sélectionnez le fournisseur
3. Remplissez les informations :
   - Numéro de facture
   - Date de facture
   - Date d'échéance

4. Ajoutez les lignes de facture :
   - Description
   - Quantité
   - Prix unitaire
   - TVA

5. Vérifiez le total
6. Enregistrez

## Joindre le document

Pour ajouter le PDF de la facture :

1. Dans la facture, section "Documents"
2. Cliquez sur "Ajouter un document"
3. Sélectionnez le fichier PDF
4. Le document est attaché à la facture

## Import automatique

Utilisez l'assistant IA pour importer automatiquement les factures :

1. Menu > Assistant IA
2. Glissez-déposez le PDF de facture
3. L'IA extrait les informations
4. Vérifiez et validez
5. La facture est créée automatiquement
`,
    keywords: ['créer facture', 'nouvelle facture', 'invoice'],
    relatedTopics: ['invoices-manage', 'purchase-orders-manage'],
  },
  {
    id: 'invoices-manage',
    category: 'invoices',
    title: 'Gérer les factures',
    content: `
# Gérer les factures

## Liste des factures

Visualisez toutes vos factures avec :
- Numéro de facture
- Fournisseur
- Date de facture
- Date d'échéance
- Montant TTC
- Statut de paiement

### Filtres
- **Statut** : À payer, Payée, En retard, Annulée
- **Fournisseur** : Par fournisseur
- **Période** : Par date de facture ou échéance
- **Montant** : Plage de montants

### Vue calendrier
Basculez en vue calendrier pour voir :
- Les factures à échéance
- Les retards de paiement
- Planning de trésorerie

## Détail d'une facture

### Informations principales
- Coordonnées fournisseur
- Numéro et dates
- Référence bon de commande (si applicable)

### Lignes de facture
- Description
- Quantité
- Prix unitaire HT
- TVA
- Total TTC

### Documents
- PDF de la facture
- Autres documents joints

### Paiements
- Historique des paiements
- Montant restant à payer

## Actions sur les factures

### Enregistrer un paiement
1. Ouvrez la facture
2. Cliquez sur "Enregistrer un paiement"
3. Indiquez :
   - Date de paiement
   - Montant payé
   - Mode de paiement
   - Référence (numéro de chèque, virement, etc.)
4. Validez

### Paiement partiel
Vous pouvez enregistrer plusieurs paiements partiels.
Le solde restant est calculé automatiquement.

### Annuler une facture
1. Ouvrez la facture
2. Cliquez sur "Annuler"
3. Indiquez la raison
4. Confirmez

### Exporter
- **PDF** : Générer un PDF de la facture
- **Excel** : Exporter dans Excel pour analyse
`,
    keywords: ['gérer factures', 'paiement facture', 'liste factures'],
    relatedTopics: ['invoices-create', 'invoices-payment'],
  },
  {
    id: 'invoices-payment',
    category: 'invoices',
    title: 'Suivi des paiements',
    content: `
# Suivi des paiements

## Tableau de suivi

Le tableau de bord des paiements affiche :
- Factures à payer ce mois
- Factures en retard
- Total à payer
- Prévisions de trésorerie

## Enregistrer un paiement

### Paiement simple
1. Depuis la liste des factures, cliquez sur "Payer"
2. Ou ouvrez la facture et cliquez sur "Enregistrer un paiement"
3. Renseignez :
   - Date de paiement
   - Montant (pré-rempli avec le solde)
   - Mode de paiement :
     * Virement
     * Chèque
     * Carte bancaire
     * Espèces
     * Autre
   - Référence de transaction
4. Validez

### Paiement en plusieurs fois
Pour payer une facture en plusieurs fois :
1. Enregistrez le premier paiement partiel
2. La facture reste en statut "Partiellement payée"
3. Enregistrez les paiements suivants
4. Quand le total est atteint, le statut passe à "Payée"

## Gestion des retards

### Factures en retard
Les factures non payées après leur échéance apparaissent en rouge.

### Relances
Pour relancer un fournisseur (facture avoir) :
1. Ouvrez la facture
2. Cliquez sur "Relancer"
3. Un email est généré avec les détails
4. Modifiez si nécessaire
5. Envoyez

### Historique de relance
Consultez toutes les relances envoyées dans l'onglet "Historique".

## Rapports de paiement

Générez des rapports :
- État des paiements par période
- Paiements par fournisseur
- Prévisions de trésorerie
- Historique des paiements

Pour générer un rapport :
1. Menu > Factures > Rapports
2. Choisissez le type de rapport
3. Sélectionnez la période
4. Exportez en PDF ou Excel
`,
    keywords: ['paiement', 'payer facture', 'relance', 'retard paiement'],
    relatedTopics: ['invoices-manage', 'invoices-create'],
  },

  // CLIENTS
  {
    id: 'clients-create',
    category: 'clients',
    title: 'Créer un client',
    content: `
# Créer un client

## Étapes de création

1. **Accédez au module Clients**
   - Menu principal > Clients

2. **Nouveau client**
   - Cliquez sur "Nouveau" ou "Nouveau client"

3. **Informations de base**
   - **Nom/Raison sociale** : Nom du client ou de l'entreprise
   - **Code client** : Référence unique (auto-généré si vide)
   - **Type** : Entreprise ou Particulier
   - **Email** : Email de contact
   - **Téléphone** : Numéro principal

4. **Adresse**
   - Adresse complète
   - Code postal et ville
   - Pays

5. **Informations commerciales**
   - Conditions de paiement par défaut
   - Remise habituelle (%)
   - Devise
   - Représentant commercial

6. **Informations fiscales**
   - Numéro de TVA
   - Numéro SIRET/SIREN (France)
   - Régime de TVA

7. **Contacts**
   Ajoutez les personnes de contact :
   - Nom et fonction
   - Email et téléphone
   - Contact principal

8. **Notes**
   - Notes internes
   - Préférences du client
   - Historique de la relation

9. **Enregistrez**
   - Cliquez sur "Enregistrer"

## Création rapide

Pour une création rapide depuis un formulaire de facture :
1. Dans le champ "Client", tapez le nom
2. Cliquez sur "Créer un nouveau client"
3. Remplissez les informations essentielles
4. Le client est créé et sélectionné automatiquement
`,
    keywords: ['créer client', 'nouveau client', 'ajouter client'],
    relatedTopics: ['clients-manage', 'invoices-create'],
  },
  {
    id: 'clients-manage',
    category: 'clients',
    title: 'Gérer les clients',
    content: `
# Gérer les clients

## Liste des clients

La liste affiche tous vos clients avec :
- Nom et code client
- Type (Entreprise/Particulier)
- Contact principal
- Chiffre d'affaires total
- Dernière commande

### Filtres et recherche
- **Recherche** : Par nom, code, email
- **Type** : Entreprise ou Particulier
- **Statut** : Actif ou Inactif
- **Tri** : Par nom, CA, date

### Actions en masse
Sélectionnez plusieurs clients pour :
- Exporter en Excel
- Envoyer un email groupé
- Modifier en masse

## Fiche client

Cliquez sur un client pour accéder à sa fiche complète.

### Onglet Vue d'ensemble
- Informations générales
- Statistiques clés
- Dernières activités

### Onglet Factures
- Toutes les factures du client
- Factures en attente
- Historique des paiements
- Statistiques de facturation

### Onglet Contacts
- Liste des contacts
- Historique des communications
- Préférences de contact

### Onglet Documents
- Devis
- Contrats
- Documents légaux
- Correspondances

### Onglet Notes
- Notes internes
- Historique des interactions
- Rappels et tâches

## Actions rapides

Depuis la fiche client :
- **Créer une facture**
- **Créer un devis**
- **Envoyer un email**
- **Planifier une tâche**
- **Modifier les informations**
- **Voir le CA annuel**

## Segmentation clients

Créez des segments pour mieux gérer vos clients :
- Clients VIP (> 100 000€ CA)
- Clients réguliers
- Nouveaux clients
- Clients inactifs

Pour créer un segment :
1. Menu Clients > Segments
2. Définissez les critères
3. Enregistrez le segment
4. Utilisez-le pour le reporting ou les actions de masse
`,
    keywords: ['gérer clients', 'fiche client', 'liste clients'],
    relatedTopics: ['clients-create', 'invoices-create'],
  },

  // PRODUITS
  {
    id: 'products-create',
    category: 'products',
    title: 'Créer un produit',
    content: `
# Créer un produit

## Création d'un produit

1. **Accédez au catalogue**
   - Menu > Produits

2. **Nouveau produit**
   - Cliquez sur "Nouveau produit"

3. **Informations de base**
   - **Nom** : Nom du produit
   - **Référence/SKU** : Référence unique
   - **Code-barres** : EAN/UPC (optionnel)
   - **Description courte** : Résumé
   - **Description détaillée** : Description complète

4. **Classification**
   - **Catégorie** : Catégorie principale
   - **Sous-catégorie** : Précision (optionnel)
   - **Tags** : Mots-clés pour la recherche
   - **Type** : Produit, Service, Abonnement

5. **Prix et coûts**
   - **Prix d'achat** : Coût d'achat
   - **Prix de vente** : Prix de vente HT
   - **Marge** : Calculée automatiquement
   - **TVA** : Taux de TVA applicable

6. **Stock** (si produit physique)
   - **Gérer le stock** : Oui/Non
   - **Quantité en stock** : Stock actuel
   - **Stock minimum** : Seuil d'alerte
   - **Unité** : Pièce, Kg, L, m², etc.

7. **Fournisseurs**
   - Ajoutez les fournisseurs pour ce produit
   - Prix d'achat par fournisseur
   - Référence fournisseur
   - Délai de livraison

8. **Images**
   - Image principale
   - Images secondaires
   - Formats acceptés : JPG, PNG

9. **Enregistrez**

## Création rapide

Lors de la création d'un bon de commande, vous pouvez créer un produit rapidement :
1. Dans la liste des produits, cliquez sur "Nouveau produit"
2. Remplissez les champs essentiels
3. Le produit est ajouté au catalogue et à votre commande
`,
    keywords: ['créer produit', 'nouveau produit', 'catalogue'],
    relatedTopics: ['products-manage', 'products-stock'],
  },
  {
    id: 'products-manage',
    category: 'products',
    title: 'Gérer le catalogue produits',
    content: `
# Gérer le catalogue produits

## Liste des produits

Visualisez tous vos produits avec :
- Image
- Référence et nom
- Catégorie
- Prix de vente
- Stock (si géré)
- Statut

### Vue liste ou grille
Basculez entre :
- **Vue liste** : Tableau détaillé
- **Vue grille** : Cards avec images

### Filtres
- **Catégorie** : Par catégorie/sous-catégorie
- **Fournisseur** : Produits d'un fournisseur
- **Stock** : En stock, Rupture, Stock faible
- **Statut** : Actif, Inactif, Archivé
- **Prix** : Plage de prix

### Recherche
Recherchez par :
- Nom du produit
- Référence/SKU
- Code-barres
- Description
- Tags

## Fiche produit

### Informations générales
- Toutes les caractéristiques
- Images
- Prix et marges

### Historique
- Historique des achats
- Historique des ventes
- Évolution des prix

### Stock
- Niveau de stock actuel
- Mouvements de stock
- Alertes de stock

### Fournisseurs
- Liste des fournisseurs
- Prix par fournisseur
- Dernier achat

## Actions en masse

Sélectionnez plusieurs produits pour :
- Modifier les prix
- Changer de catégorie
- Ajuster les stocks
- Exporter en Excel
- Archiver

## Import/Export

### Importer des produits
1. Menu > Produits > Importer
2. Téléchargez le modèle Excel
3. Remplissez vos données
4. Importez le fichier
5. Vérifiez et validez

### Exporter le catalogue
1. Menu > Produits > Exporter
2. Choisissez le format (Excel, CSV, PDF)
3. Sélectionnez les colonnes
4. Téléchargez le fichier
`,
    keywords: ['gérer produits', 'catalogue', 'liste produits'],
    relatedTopics: ['products-create', 'products-stock'],
  },
  {
    id: 'products-stock',
    category: 'products',
    title: 'Gestion des stocks',
    content: `
# Gestion des stocks

## Activation de la gestion de stock

Pour chaque produit, vous pouvez :
- Activer ou désactiver le suivi du stock
- Définir un stock minimum
- Recevoir des alertes

## Mouvements de stock

Les stocks sont mis à jour automatiquement lors :
- **Réception de commande** : Stock +
- **Vente** : Stock -
- **Ajustement manuel** : +/-

### Ajuster manuellement le stock
1. Ouvrez la fiche produit
2. Section "Stock"
3. Cliquez sur "Ajuster"
4. Indiquez :
   - Type de mouvement (Entrée/Sortie)
   - Quantité
   - Raison (Inventaire, Perte, Don, etc.)
   - Notes
5. Validez

## Historique des mouvements

Consultez l'historique complet :
- Date et heure
- Type de mouvement
- Quantité
- Stock résultant
- Raison
- Utilisateur
- Document lié (commande, facture)

## Alertes de stock

### Stock minimum
Définissez un seuil d'alerte pour chaque produit.
Vous recevrez une notification quand le stock passe sous ce seuil.

### Rupture de stock
Les produits en rupture apparaissent :
- Dans le tableau de bord (widget)
- Dans un rapport dédié
- Avec une icône d'alerte

## Inventaire

### Réaliser un inventaire
1. Menu > Produits > Inventaire
2. Créez une session d'inventaire
3. Pour chaque produit :
   - Stock théorique (dans le système)
   - Stock réel (compté)
   - Écart
4. Validez l'inventaire
5. Les stocks sont ajustés automatiquement

### Inventaire partiel
Vous pouvez faire des inventaires par :
- Catégorie
- Emplacement
- Sélection de produits

## Rapports de stock

Générez des rapports :
- Valeur du stock
- Mouvements par période
- Produits les plus/moins vendus
- Taux de rotation
- Produits à réapprovisionner
`,
    keywords: ['stock', 'inventaire', 'gestion stock', 'rupture stock'],
    relatedTopics: ['products-manage', 'purchase-orders-receive'],
  },

  // PARAMÈTRES
  {
    id: 'settings-email-smtp',
    category: 'settings',
    title: 'Configuration Email SMTP (Gmail, Outlook)',
    content: `
# Configuration Email SMTP pour l'envoi automatique

Pour que ProcureGenius puisse envoyer des emails (factures, bons de commande, relances), vous devez configurer les paramètres SMTP.

## ⚠️ Configuration Gmail (LA PLUS UTILISÉE)

Gmail est le service le plus courant mais nécessite une configuration spécifique à cause de la sécurité renforcée.

### Étape 1 : Activer la validation en 2 étapes

**OBLIGATOIRE** depuis mai 2022, vous ne pouvez plus utiliser votre mot de passe Gmail normal.

1. Allez sur **https://myaccount.google.com/security**
2. Section "Connexion à Google"
3. Cliquez sur **"Validation en deux étapes"**
4. Suivez les étapes pour activer la 2FA (SMS ou application)

### Étape 2 : Créer un mot de passe d'application

C'est la partie CRITIQUE que beaucoup d'utilisateurs ratent.

1. Une fois la 2FA activée, retournez sur **https://myaccount.google.com/security**
2. Cherchez **"Mots de passe des applications"** (section "Connexion à Google")
3. Sélectionnez :
   - **Application** : "Autre (nom personnalisé)"
   - **Nom** : "ProcureGenius" ou "SMTP ProcureGenius"
4. Cliquez sur **"Générer"**
5. Google affiche un mot de passe de 16 caractères (ex: `abcd efgh ijkl mnop`)
6. **COPIEZ CE MOT DE PASSE** (vous ne le reverrez jamais)

### Étape 3 : Configuration dans ProcureGenius

1. **Paramètres > Entreprise > Configuration Email**
2. Remplissez exactement :

**Serveur SMTP :** smtp.gmail.com

**Port :** 587

**Sécurité :** TLS (ou STARTTLS)

**Email expéditeur :** votre.email@gmail.com
(Celui que vous utilisez pour Gmail)

**Nom d'utilisateur :** votre.email@gmail.com
(Identique à l'email expéditeur)

**Mot de passe :** abcd efgh ijkl mnop
(Le mot de passe d'application de 16 caractères, **AVEC les espaces** ou sans, ça marche dans les deux cas)

3. Cliquez sur **"Tester la configuration"**
4. Si ça fonctionne : ✅ "Email de test envoyé avec succès"
5. Cliquez sur **"Enregistrer"**

## Configuration Outlook / Office 365

### Outlook personnel (outlook.com, hotmail.com, live.com)

**Serveur SMTP :** smtp-mail.outlook.com

**Port :** 587

**Sécurité :** STARTTLS

**Email + Username :** votre.email@outlook.com

**Mot de passe :**
- Votre mot de passe Outlook normal fonctionne
- Si vous avez activé la 2FA, créez un mot de passe d'application

### Office 365 Professionnel

**Serveur SMTP :** smtp.office365.com

**Port :** 587

**Sécurité :** STARTTLS

**Email + Username :** votre.email@votreentreprise.com

**Mot de passe :**
- Mot de passe Office 365
- Contactez votre administrateur IT si problème

## Configuration OVH

**Serveur SMTP :** ssl0.ovh.net

**Port :** 587 (TLS) ou 465 (SSL)

**Email + Username :** votre.email@votredomaine.com

**Mot de passe :**
- Mot de passe email OVH

## Problèmes fréquents et solutions

### ❌ "Authentification échouée" (Gmail)

**Causes :**
1. Vous utilisez votre mot de passe Gmail au lieu du mot de passe d'application
2. La validation en 2 étapes n'est pas activée
3. Le mot de passe d'application est mal copié

**Solution :**
- Refaites les étapes 1 et 2 ci-dessus
- Créez un NOUVEAU mot de passe d'application
- Copiez-le sans espaces supplémentaires

### ❌ "Connexion refusée" ou "Connection timed out"

**Causes :**
- Port incorrect
- Pare-feu bloque le port SMTP

**Solution :**
- Vérifiez le port : **587** pour Gmail/Outlook
- Vérifiez que votre pare-feu autorise les connexions sortantes sur le port 587
- Essayez le port **465** avec SSL au lieu de TLS

### ❌ "L'accès au compte moins sécurisé est désactivé"

**Cause :**
- Vous n'utilisez pas un mot de passe d'application (Gmail)

**Solution :**
- N'essayez PAS d'activer "Accès moins sécurisé" (Google l'a supprimé)
- Utilisez un mot de passe d'application (voir étape 2)

### ❌ Les emails partent en SPAM

**Causes :**
- Votre domaine n'a pas de configuration SPF/DKIM
- Vous envoyez beaucoup d'emails d'un coup

**Solutions :**
- Utilisez Gmail/Outlook au lieu d'un serveur personnel
- Demandez aux destinataires de marquer vos emails comme "Non spam"
- Configurez les enregistrements SPF de votre domaine

## Vérification rapide

Pour tester si tout fonctionne :

1. Créez une facture de test
2. Envoyez-la à votre propre email
3. Vérifiez que vous recevez bien :
   - L'email
   - Avec le PDF attaché
   - Dans votre boîte de réception (pas les spams)

## Limites d'envoi

### Gmail gratuit
- **500 emails / jour**
- Si vous dépassez : compte temporairement bloqué (24h)

### Gmail Workspace (payant)
- **2000 emails / jour**

### Outlook personnel
- **300 emails / jour**

### Office 365
- **10 000 emails / jour**

## Recommandations

### Pour une petite entreprise (< 50 factures/mois)
✅ **Gmail gratuit** suffit largement

### Pour une moyenne entreprise (> 100 factures/mois)
✅ **Google Workspace** (à partir de 5€/mois/utilisateur)

### Pour une grande entreprise
✅ **Office 365** ou serveur SMTP dédié

## Configuration serveur SMTP personnalisé

Si vous avez votre propre serveur SMTP :

1. Demandez à votre hébergeur :
   - Adresse serveur SMTP
   - Port (587, 465, ou 25)
   - Type de sécurité (TLS, SSL, ou aucune)

2. Testez avec un client email (Thunderbird, Outlook) d'abord

3. Si ça marche en local, ça marchera dans ProcureGenius

## Sécurité

**NE PARTAGEZ JAMAIS :**
- Votre mot de passe d'application
- Votre configuration SMTP complète

**Bonnes pratiques :**
- Changez le mot de passe d'application tous les 6 mois
- Révoquez les anciens mots de passe inutilisés
- Utilisez un email dédié pour l'application (ex: facturation@votreentreprise.com)
`,
    keywords: ['email', 'SMTP', 'Gmail', 'Outlook', 'configuration', 'mot de passe application', 'envoi email'],
    relatedTopics: ['invoices-pdf-email', 'settings-company'],
  },
  {
    id: 'settings-profile',
    category: 'settings',
    title: 'Configurer votre profil',
    content: `
# Configurer votre profil

## Accéder aux paramètres

1. Cliquez sur votre avatar en haut à droite
2. Sélectionnez "Paramètres"
3. Onglet "Profil"

## Informations personnelles

### Informations de base
- **Prénom et nom**
- **Email** : Email de connexion (attention, modifiable uniquement par admin)
- **Téléphone**
- **Poste/Fonction**
- **Photo de profil**

### Préférences de langue
- Français (par défaut)
- Anglais
- Espagnol

### Thème
- Clair
- Sombre
- Automatique (selon le système)

## Paramètres de notification

### Notifications par email
Choisissez de recevoir des emails pour :
- Nouveaux bons de commande
- Factures à payer
- Alertes de stock
- Commentaires et mentions
- Résumé hebdomadaire

### Notifications dans l'app
- Notifications push
- Sons
- Badges

### Fréquence
- Immédiate
- Résumé quotidien
- Résumé hebdomadaire

## Sécurité

### Changer le mot de passe
1. Section "Sécurité"
2. "Changer le mot de passe"
3. Entrez :
   - Mot de passe actuel
   - Nouveau mot de passe
   - Confirmation
4. Validez

Exigences du mot de passe :
- Minimum 8 caractères
- Au moins une majuscule
- Au moins un chiffre
- Au moins un caractère spécial

### Authentification à deux facteurs (2FA)
1. Activez la 2FA
2. Scannez le QR code avec votre app d'authentification
3. Entrez le code de vérification
4. Sauvegardez les codes de secours

### Sessions actives
Consultez vos sessions actives :
- Appareil
- Localisation
- Dernière activité
- Révoque les sessions suspectes
`,
    keywords: ['profil', 'paramètres utilisateur', 'mot de passe', 'notifications'],
    relatedTopics: ['settings-company', 'settings-users'],
  },
  {
    id: 'settings-company',
    category: 'settings',
    title: 'Paramètres de l\'entreprise',
    content: `
# Paramètres de l'entreprise

## Informations de l'entreprise

### Identité
- **Nom de l'entreprise**
- **Forme juridique** (SARL, SAS, SA, etc.)
- **Logo** : Pour les documents (factures, devis, etc.)
- **Slogan** (optionnel)

### Coordonnées
- **Adresse du siège**
- **Téléphone**
- **Email général**
- **Site web**

### Informations légales
- **SIRET/SIREN**
- **Numéro de TVA intracommunautaire**
- **Code NAF/APE**
- **Capital social**
- **RCS** : Ville d'immatriculation

## Paramètres financiers

### Devise principale
- Euro (€)
- Dollar ($)
- Livre sterling (£)
- Autre

### Taux de TVA par défaut
- TVA normale (20% en France)
- TVA intermédiaire (10%)
- TVA réduite (5.5%)
- Personnalisé

### Conditions de paiement
- 15 jours
- 30 jours
- 45 jours
- 60 jours
- Personnalisé

### Mentions légales
Textes affichés sur les documents :
- Mentions de facture
- Conditions générales de vente
- Clause de confidentialité

## Numérotation

### Format des numéros
Personnalisez le format de numérotation pour :
- **Factures** : Ex: FAC-2024-0001
- **Devis** : Ex: DEV-2024-0001
- **Bons de commande** : Ex: BC-2024-0001
- **Clients** : Ex: CLI-0001
- **Fournisseurs** : Ex: FOUR-0001

Variables disponibles :
- {YYYY} : Année sur 4 chiffres
- {YY} : Année sur 2 chiffres
- {MM} : Mois
- {DD} : Jour
- {N} : Numéro incrémental

### Compteurs
Réinitialisez les compteurs si nécessaire.

## Modules

Activez ou désactivez les modules :
- Fournisseurs
- Bons de commande
- Factures
- Produits
- Clients

Chaque module peut être activé/désactivé selon vos besoins et votre abonnement.
`,
    keywords: ['paramètres entreprise', 'configuration', 'société', 'modules'],
    relatedTopics: ['settings-profile', 'settings-users'],
  },
  {
    id: 'settings-users',
    category: 'settings',
    title: 'Gestion des utilisateurs',
    content: `
# Gestion des utilisateurs

## Ajouter un utilisateur

1. Paramètres > Utilisateurs
2. Cliquez sur "Inviter un utilisateur"
3. Renseignez :
   - Email de l'utilisateur
   - Prénom et nom
   - Rôle
4. Envoyez l'invitation

L'utilisateur reçoit un email avec un lien pour créer son compte.

## Rôles et permissions

### Administrateur
- Accès complet
- Gestion des utilisateurs
- Paramètres de l'entreprise
- Tous les modules

### Manager
- Gestion des données
- Création et modification
- Pas d'accès aux paramètres
- Peut gérer son équipe

### Utilisateur
- Consultation
- Création limitée
- Pas de suppression
- Modules selon permissions

### Lecture seule
- Consultation uniquement
- Pas de modification
- Rapports et exports

### Personnalisé
Créez un rôle sur mesure :
1. Paramètres > Rôles
2. Créez un nouveau rôle
3. Définissez les permissions par module :
   - Lecture
   - Création
   - Modification
   - Suppression
4. Assignez le rôle aux utilisateurs

## Gérer les utilisateurs

### Modifier un utilisateur
1. Liste des utilisateurs
2. Cliquez sur l'utilisateur
3. Modifiez les informations
4. Changez le rôle si nécessaire
5. Enregistrez

### Désactiver un utilisateur
Pour suspendre temporairement un accès :
1. Ouvrez la fiche utilisateur
2. Cliquez sur "Désactiver"
3. L'utilisateur ne peut plus se connecter
4. Ses données restent intactes
5. Vous pouvez le réactiver à tout moment

### Supprimer un utilisateur
⚠️ **Attention** : La suppression est définitive.

Pour supprimer :
1. Ouvrez la fiche utilisateur
2. Cliquez sur "Supprimer"
3. Confirmez la suppression
4. Les données créées par l'utilisateur sont conservées

## Équipes

Organisez vos utilisateurs en équipes :

### Créer une équipe
1. Paramètres > Équipes
2. Créez une nouvelle équipe
3. Nommez l'équipe (ex: "Achats", "Comptabilité")
4. Ajoutez les membres
5. Définissez un responsable

### Permissions d'équipe
Les équipes peuvent avoir :
- Accès à certains fournisseurs uniquement
- Budget d'achat limité
- Modules spécifiques
- Notifications groupées
`,
    keywords: ['utilisateurs', 'permissions', 'rôles', 'équipes'],
    relatedTopics: ['settings-profile', 'settings-company'],
  },

  // ASTUCES
  {
    id: 'tips-shortcuts',
    category: 'tips',
    title: 'Raccourcis clavier',
    content: `
# Raccourcis clavier

## Navigation générale

- **Ctrl/Cmd + K** : Recherche globale
- **Ctrl/Cmd + /** : Afficher l'aide
- **Ctrl/Cmd + B** : Basculer le menu latéral
- **Ctrl/Cmd + ,** : Ouvrir les paramètres

## Actions rapides

- **Ctrl/Cmd + N** : Nouveau (selon le module actif)
- **Ctrl/Cmd + S** : Enregistrer
- **Ctrl/Cmd + E** : Modifier
- **Échap** : Annuler/Fermer

## Navigation dans les listes

- **↑ / ↓** : Naviguer dans les lignes
- **Entrée** : Ouvrir l'élément sélectionné
- **Ctrl/Cmd + A** : Tout sélectionner
- **Suppr** : Supprimer (avec confirmation)

## Formulaires

- **Tab** : Champ suivant
- **Shift + Tab** : Champ précédent
- **Ctrl/Cmd + Entrée** : Enregistrer et fermer

## Recherche et filtres

- **Ctrl/Cmd + F** : Rechercher dans la page
- **Ctrl/Cmd + G** : Résultat suivant
- **Ctrl/Cmd + Shift + G** : Résultat précédent

## Tableaux

- **Ctrl/Cmd + Clic** : Sélection multiple
- **Shift + Clic** : Sélection en série
- **Ctrl/Cmd + C** : Copier les cellules sélectionnées

Consultez la page complète des raccourcis depuis le menu Aide.
`,
    keywords: ['raccourcis', 'clavier', 'shortcuts', 'touches'],
    relatedTopics: ['getting-started-navigation'],
  },
  {
    id: 'tips-best-practices',
    category: 'tips',
    title: 'Bonnes pratiques',
    content: `
# Bonnes pratiques

## Organisation des données

### Codes et références
- Utilisez des codes cohérents et logiques
- Établissez une nomenclature dès le début
- Exemples :
  - Fournisseurs : FOUR-XXX ou par catégorie (FOUR-INFO-001)
  - Produits : CAT-SOUSCAT-XXX
  - Clients : CLI-XXX ou GEO-CLI-XXX

### Catégorisation
- Créez une structure de catégories claire
- N'allez pas trop loin dans la granularité
- 2-3 niveaux maximum
- Utilisez les tags pour plus de flexibilité

## Gestion quotidienne

### Routine matinale
1. Consultez le tableau de bord
2. Vérifiez les notifications
3. Traitez les factures à échéance
4. Vérifiez les commandes en attente

### Fin de semaine
1. Mettez à jour les stocks
2. Relancez les factures en retard
3. Vérifiez les bons de commande en attente
4. Nettoyez les brouillons inutiles

## Saisie efficace

### Utilisez l'import
Pour des données en masse :
- Import Excel pour les produits
- Import de factures par PDF (IA)
- Import de contacts

### Quick create
Utilisez la création rapide depuis les formulaires pour gagner du temps.

### Templates
- Créez des modèles de bons de commande
- Enregistrez des notes types
- Utilisez les favoris

## Collaboration

### Mentions
Dans les notes et commentaires, mentionnez vos collègues avec @nom pour les notifier.

### Notes internes
Documentez vos actions et décisions dans les notes pour faciliter le suivi.

### Pièces jointes
Attachez systématiquement les documents pertinents (devis, contrats, emails).

## Sécurité

### Mots de passe
- Utilisez un mot de passe fort
- Activez la 2FA
- Ne partagez jamais vos identifiants

### Permissions
- Donnez les permissions minimales nécessaires
- Revoyez régulièrement les accès
- Désactivez les comptes inutilisés

### Sauvegardes
- Exportez régulièrement vos données
- Conservez des copies hors ligne
- Testez la restauration

## Performance

### Nettoyage
- Archivez les données anciennes
- Supprimez les brouillons inutiles
- Nettoyez les doublons

### Recherche
- Utilisez les filtres plutôt que la recherche globale
- Sauvegardez vos filtres favoris
- Utilisez les raccourcis clavier
`,
    keywords: ['bonnes pratiques', 'conseils', 'astuces', 'organisation'],
    relatedTopics: ['tips-shortcuts', 'getting-started-intro'],
  },
  {
    id: 'tips-ai-document-analysis',
    category: 'tips',
    title: 'Analyser des documents PDF avec l\'IA',
    content: `
# Analyser des documents PDF avec l'IA

L'IA de ProcureGenius peut extraire automatiquement les données de vos documents PDF, vous faisant gagner un temps considérable.

## Ce que vous pouvez faire

### 1. Extraction automatique depuis une facture PDF

**Téléchargez une facture fournisseur dans le chat IA**, et l'IA extrait instantanément :
- Numéro de facture
- Date d'émission et date d'échéance
- Nom du fournisseur
- Adresse du fournisseur
- Liste complète des produits/services
- Quantités et prix unitaires
- Montant HT, TVA, et TTC

**Exemple concret :**
1. Glissez-déposez "Facture_ACME_2024.pdf" dans le chat IA
2. L'IA analyse le document en 2-3 secondes
3. Elle affiche toutes les données extraites
4. Vous pouvez demander : **"Créé une facture dans le système avec ces informations"**
5. La facture est automatiquement enregistrée

### 2. Créer un fournisseur depuis un PDF

Si le fournisseur n'existe pas encore :

**Demandez :** "Extrait les infos du fournisseur et crée-le dans le système"

**L'IA va créer automatiquement :**
- Le fournisseur avec nom, adresse, email, téléphone
- Toutes les informations de contact trouvées dans le PDF

### 3. Analyser des devis

Téléchargez plusieurs devis de différents fournisseurs :

**Demandez :** "Compare ces 3 devis et dis-moi lequel est le plus avantageux"

**L'IA analyse :**
- Prix unitaires de chaque ligne
- Conditions de paiement
- Délais de livraison
- Services inclus/exclus
- **Et vous donne une recommandation motivée**

### 4. Extraire des données de bons de livraison

Téléchargez un bon de livraison fournisseur :

**Demandez :** "Vérifie si la livraison correspond à notre bon de commande BC-2024-0042"

**L'IA va :**
- Extraire les quantités livrées
- Comparer avec le bon de commande original
- Signaler les écarts éventuels
- Proposer de mettre à jour la réception

## Conseils d'utilisation

### Format des PDFs
- Privilégiez les PDFs **générés** (pas des scans)
- Pour les scans, assurez-vous qu'ils soient **nets et lisibles**
- L'IA gère les documents en français et en anglais

### Soyez explicite
Au lieu de juste télécharger le PDF, dites ce que vous voulez faire :
- "Analyse cette facture et crée-la dans le système"
- "Extrait les informations du fournisseur"
- "Compare ce devis avec notre bon de commande"

### Vérifiez toujours
L'IA est très précise, mais vérifiez toujours :
- Les montants critiques
- Les dates d'échéance
- Les références produits

## Cas d'usage avancés

### Traitement par lots
Téléchargez 5-10 factures d'un coup :

"Analyse toutes ces factures et dis-moi le total à payer ce mois"

### Détection d'anomalies
"Vérifie si cette facture correspond au bon de commande BC-2024-0123 et signale les différences"

### Historique
"Montre-moi toutes les factures du fournisseur XYZ que j'ai importées ce mois"
`,
    keywords: ['IA', 'PDF', 'extraction', 'documents', 'factures', 'analyse automatique'],
    relatedTopics: ['invoices-create', 'suppliers-create'],
  },
  {
    id: 'tips-ai-smart-search',
    category: 'tips',
    title: 'Recherche intelligente avec l\'IA',
    content: `
# Recherche intelligente avec l'IA

Au lieu de naviguer manuellement dans les menus et filtres, utilisez le chat IA pour trouver exactement ce que vous cherchez en langage naturel.

## Pourquoi c'est remarquable

### Avant (sans IA)
1. Aller dans le module Factures
2. Cliquer sur filtres
3. Sélectionner "Statut : Impayé"
4. Chercher le nom du client
5. Trier par date
6. Parcourir la liste

### Avec l'IA
Demandez simplement : **"Trouve toutes les factures impayées de ABC Corp"**

L'IA affiche instantanément les résultats pertinents.

## Exemples de recherches puissantes

### Recherche de factures

**Dates relatives (l'IA comprend le contexte temporel) :**
- "Factures de la semaine dernière"
- "Factures émises ce mois"
- "Factures dues hier"
- "Factures créées aujourd'hui"

**Par statut :**
- "Toutes les factures impayées"
- "Factures en retard depuis plus de 30 jours"
- "Factures payées partiellement"

**Par client :**
- "Dernière facture de [Client XYZ]"
- "Toutes les factures de [Client] de cette année"
- "Facture la plus récente pour ABC Corp"

**Combinaisons complexes :**
- "Factures impayées de plus de 1000€ datant de plus de 15 jours"
- "Factures du client XYZ émises en novembre avec TVA 20%"

### Recherche de produits

- "Produits en rupture de stock"
- "Produits de la catégorie Bureautique avec stock faible"
- "Produits achetés chez le fournisseur ACME"
- "Produits jamais vendus depuis 6 mois"

### Recherche de fournisseurs

- "Fournisseurs avec factures en retard"
- "Meilleur fournisseur pour les chaises de bureau" (l'IA analyse prix et historique)
- "Fournisseurs contactés ce mois"

### Recherche de bons de commande

- "Bons de commande en attente de livraison"
- "Commandes passées chez [Fournisseur] ce trimestre"
- "BC non réceptionnés depuis plus de 7 jours"

## Analyses et statistiques

L'IA peut aussi faire des calculs :

**Questions financières :**
- "Combien j'ai dépensé chez le fournisseur XYZ ce mois ?"
- "Quel est mon CA total du trimestre ?"
- "Quelle est ma facture moyenne par client ?"

**Comparaisons :**
- "Compare les prix du papier A4 entre mes fournisseurs"
- "Quel fournisseur me livre le plus vite ?"
- "Qui a le meilleur taux de remise ?"

**Tendances :**
- "Mes dépenses augmentent ou diminuent ce mois ?"
- "Quels produits se vendent le mieux ?"

## Commandes d'actions

L'IA ne fait pas que chercher, elle peut aussi **agir** :

**Créer :**
- "Créé un nouveau fournisseur avec le nom ACME Corp"
- "Créé une facture pour le client ABC de 1500€"

**Modifier :**
- "Marque la facture FAC-2024-0123 comme payée"
- "Change le statut du BC-2024-0042 en livré"

**Exporter :**
- "Export toutes les factures impayées en Excel"
- "Génère un rapport PDF des achats de décembre"

## Conseils pour de meilleures recherches

### Soyez naturel
Pas besoin de syntaxe spéciale, parlez normalement :
- "Montre-moi mes factures en retard"
- "C'est quoi la dernière commande passée ?"

### Utilisez des références exactes quand vous les avez
- "Facture FAC-2024-0123" (plus précis que "une facture")
- "Client Entreprise SARL" (nom exact)

### Demandez des précisions si besoin
Si les résultats ne sont pas ceux attendus :
- "Non, je veux seulement celles de ce mois"
- "Filtre par montant supérieur à 500€"

### Explorez
L'IA comprend beaucoup de variations :
- "Quoi de neuf aujourd'hui ?"
- "Qu'est-ce qui nécessite mon attention ?"
- "Résumé de mon activité cette semaine"
`,
    keywords: ['IA', 'recherche', 'chat', 'langage naturel', 'assistant intelligent'],
    relatedTopics: ['tips-ai-document-analysis', 'getting-started-intro'],
  },
];

// Fonction de recherche dans la documentation
export const searchDocumentation = (query) => {
  if (!query || query.trim() === '') {
    return [];
  }

  const searchTerms = query.toLowerCase().split(' ');

  const results = documentationArticles.map(article => {
    let score = 0;
    const searchableText = `
      ${article.title}
      ${article.content}
      ${article.keywords.join(' ')}
    `.toLowerCase();

    // Calcul du score de pertinence
    searchTerms.forEach(term => {
      if (article.title.toLowerCase().includes(term)) {
        score += 10; // Titre = haute priorité
      }
      if (article.keywords.some(keyword => keyword.includes(term))) {
        score += 5; // Mots-clés = priorité moyenne
      }
      const contentMatches = (searchableText.match(new RegExp(term, 'g')) || []).length;
      score += contentMatches; // Contenu = basse priorité
    });

    return {
      article,
      score,
    };
  })
  .filter(result => result.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 10) // Top 10 résultats
  .map(result => result.article);

  return results;
};

// Fonction pour obtenir les articles liés
export const getRelatedArticles = (articleId) => {
  const article = documentationArticles.find(a => a.id === articleId);
  if (!article || !article.relatedTopics) {
    return [];
  }

  return article.relatedTopics
    .map(topicId => documentationArticles.find(a => a.id === topicId))
    .filter(Boolean);
};

// Fonction pour obtenir les articles par catégorie
export const getArticlesByCategory = (categoryId) => {
  return documentationArticles.filter(article => article.category === categoryId);
};
