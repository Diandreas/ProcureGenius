# 🤖 Guide d'Utilisation - Assistant IA ProcureGenius

## 🚀 Démarrage Rapide

### Accès
Allez sur: **http://localhost:5173/ai-chat**

---

## ✨ Fonctionnalités Principales

### 1. 👤 Créer un Fournisseur

**Exemple:**
```
Extrait les informations du fournisseur: ACME Corp, +33612345678, contact@acme.com, Paris
Crée moi un fournisseur
```

**Ce que vous verrez:**
- ✅ Message de confirmation
- 📦 Carte avec les détails du fournisseur créé
- 🔗 Boutons **"Voir"** et **"Modifier"**
- 💡 Actions suggérées

**Variantes:**
```
Je veux créer un fournisseur nommé "Tech Solutions", email: tech@solutions.fr, téléphone: 0601020304

Ajoute un nouveau fournisseur: NomDuFournisseur, contact@email.com, ville
```

---

### 2. 📄 Créer une Facture

**Exemple:**
```
Crée une facture pour le client "Entreprise ABC", montant 2500€, description "Services de développement web"
```

**Ce que vous verrez:**
- ✅ Facture créée avec numéro
- 🔗 Boutons: **Voir**, **Modifier**, **Télécharger PDF**
- 📊 Détails de la facture

**Variantes:**
```
Je veux créer une facture pour "Client XYZ", 1500 euros

Nouvelle facture: Client "Société Martin", montant 3000€, date d'échéance 30/11/2025
```

---

### 3. 🛒 Créer un Bon de Commande

**Exemple:**
```
Crée un bon de commande pour le fournisseur "ACME Corp", description "Matériel informatique", montant 5000€
```

---

### 4. 🔍 Rechercher

**Exemples:**
```
Recherche le fournisseur ACME

Trouve tous les fournisseurs avec "tech" dans le nom

Cherche les factures du client ABC
```

---

### 5. 📊 Statistiques

**Exemples:**
```
Montre-moi les statistiques du mois

Affiche les stats des fournisseurs

Statistiques de revenus cette année
```

---

## 🎯 Actions Rapides (Raccourcis)

Au démarrage, cliquez sur l'une des cartes pour déclencher rapidement:

1. **Créer un fournisseur** 📦
2. **Créer une facture** 📄
3. **Créer un bon de commande** 🛒
4. **Voir les statistiques** 📊
5. **Analyser un document** 📸
6. **Rechercher un fournisseur** 🔍

---

## 💬 Exemples de Conversations Naturelles

### Conversation 1: Nouveau Fournisseur
```
Vous: Bonjour!
IA: Bonjour! Comment puis-je vous aider aujourd'hui?

Vous: Je veux ajouter un nouveau fournisseur
IA: Bien sûr! Donnez-moi les informations du fournisseur...

Vous: CYNTHIA, téléphone +237620287935, email david@gmail.com, ville Yaoundé
IA: Je vais créer le fournisseur...
[Action exécutée]
✓ Fournisseur 'CYNTHIA' créé avec succès
[Boutons: Voir | Modifier]
```

### Conversation 2: Facture Complète
```
Vous: Crée une facture
IA: D'accord, donnez-moi les informations...

Vous: Client "Entreprise Durand", 3500€, description "Formation et consulting"
IA: Je vais créer la facture...
[Action exécutée]
✓ Facture #INV-2025-001 créée avec succès
[Boutons: Voir | Modifier | Télécharger PDF]
```

---

## 🎨 Comprendre l'Interface

### Header (En haut)
- **Menu** (☰) - Ouvre l'historique des conversations
- **Assistant IA ProcureGenius** - Titre
- **Badge "En ligne"** - Statut de l'IA

### Zone de Messages
- **Messages utilisateur** (à droite, fond violet clair)
- **Messages IA** (à gauche, fond blanc)
- **Badge "IA"** sur les messages de l'assistant
- **Cartes vertes** = Actions réussies
- **Cartes rouges** = Erreurs

### Zone de Saisie (En bas)
- **Champ de texte** - Tapez votre message
- **📎 Joindre** - Attacher un fichier (à venir)
- **📷 Scanner** - Scanner un document (à venir)
- **➤ Envoyer** - Envoyer le message (ou touche Entrée)

---

## 🔗 Navigation vers les Entités

### Après Création
Chaque entité créée affiche des boutons:

#### **Bouton "Voir"** 👁️
Ouvre la page de détail de l'entité
- Fournisseur → `/suppliers/{id}`
- Facture → `/invoices/{id}`
- Bon de commande → `/purchase-orders/{id}`

#### **Bouton "Modifier"** ✏️
Ouvre la page d'édition
- URL: `{entity-url}/edit`

#### **Bouton "PDF"** 📄 (Factures uniquement)
Télécharge le PDF de la facture

---

## 💡 Astuces & Conseils

### 1. **Soyez naturel**
L'IA comprend le langage naturel. Pas besoin de syntaxe spéciale.

✅ **Bon:**
```
Je veux créer un fournisseur qui s'appelle Tech Corp
```

❌ **Pas nécessaire:**
```
CREATE SUPPLIER name="Tech Corp"
```

### 2. **Informations Minimales**
Donnez au moins le nom pour créer une entité.

**Minimum pour un fournisseur:**
```
Crée un fournisseur "ABC Corp"
```

**Avec plus de détails:**
```
Crée un fournisseur "ABC Corp", email abc@corp.com, téléphone 0612345678, ville Lyon
```

### 3. **Utilisez les Actions Rapides**
Cliquez sur les cartes au démarrage pour un prompt prérempli.

### 4. **Historique des Conversations**
- Cliquez sur **☰** pour voir vos anciennes conversations
- Reprenez où vous vous êtes arrêté

### 5. **Maj + Entrée**
Pour écrire sur plusieurs lignes, utilisez **Shift + Enter**

---

## 🐛 En Cas de Problème

### L'IA ne répond pas
1. Vérifiez que le serveur backend est lancé: `http://localhost:8000`
2. Vérifiez que le frontend est lancé: `http://localhost:5173`
3. Regardez la console du navigateur (F12)

### Erreur affichée
- L'IA affichera le message d'erreur
- Vérifiez les informations fournies
- Réessayez avec des informations différentes

### Boutons ne fonctionnent pas
- Assurez-vous que les routes existent dans votre application
- Vérifiez la console du navigateur

---

## 📱 Responsive Design

Le module s'adapte à toutes les tailles d'écran:
- 📱 **Mobile** - Interface tactile optimisée
- 💻 **Desktop** - Layout large avec sidebar
- 🖥️ **Tablet** - Vue intermédiaire

---

## 🎯 Cas d'Usage Avancés

### 1. **Workflow Complet**
```
1. Créer un fournisseur
2. Rechercher ce fournisseur
3. Créer un bon de commande pour ce fournisseur
4. Voir les statistiques
```

### 2. **Bulk Operations** (À venir)
```
Crée 5 fournisseurs à partir de cette liste...
```

### 3. **Analyse de Documents** (À venir)
- Upload d'une facture scannée
- Extraction automatique des infos
- Création automatique de l'entité

---

## 📈 Statistiques & Données

### Voir les Statistiques
```
Montre-moi les stats

Affiche les statistiques du mois

Stats des fournisseurs actifs

Revenus de cette année
```

### Informations Disponibles
- Nombre total de fournisseurs
- Fournisseurs actifs
- Total des factures
- Factures impayées
- Chiffre d'affaires

---

## 🔐 Sécurité

- ✅ Authentification requise
- ✅ Seules vos données sont accessibles
- ✅ Historique privé par utilisateur
- ✅ API sécurisée avec tokens

---

## 🆘 Besoin d'Aide?

### Commandes d'Aide
```
Aide
Que peux-tu faire?
Comment créer un fournisseur?
```

### Support
- Consultez la documentation
- Contactez l'équipe de développement
- Ouvrez un ticket sur GitHub

---

## 🎉 Profitez bien de votre Assistant IA!

L'assistant est là pour vous faire gagner du temps et rendre la gestion de votre entreprise plus simple et agréable.

**N'hésitez pas à explorer toutes les fonctionnalités!** 🚀
