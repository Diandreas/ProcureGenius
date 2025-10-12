# Profils Utilisateurs et Personas - ProcureGenius

## Vue d'ensemble

ProcureGenius est une plateforme SaaS de gestion des achats et de la facturation qui s'adresse à différents types d'organisations avec des besoins variés. Le système utilise une approche à deux dimensions :

1. **Profils d'abonnement** (6 types) : Détermine quels modules sont accessibles
2. **Rôles utilisateurs** (5 types) : Détermine les permissions au sein des modules

---

## 1. Profils d'Abonnement

### 📦 Profil FREE (Gratuit)
**Modules inclus** : Tableau de bord, Produits, Clients

**Public cible** :
- Micro-entrepreneurs et freelances
- Personnes testant la plateforme
- Très petites entreprises (< 5 personnes)
- Activité commerciale simple

**Cas d'usage typiques** :
- Gestion basique de catalogue produits
- Liste de contacts clients
- Visualisation des statistiques simples

**Limitations** :
- Pas de gestion des fournisseurs
- Pas de commandes d'achat
- Pas de facturation automatisée

---

### 💳 Profil BILLING (Facturation)
**Modules inclus** : Tableau de bord, Factures, Clients, Produits

**Public cible** :
- Petites entreprises orientées service
- Freelances professionnels
- Consultants et agences
- Entreprises B2C sans gestion d'achats complexe

**Cas d'usage typiques** :
- Création et envoi de factures clients
- Suivi des paiements
- Gestion du catalogue de services/produits
- Génération de rapports de ventes

**Besoins métier** :
- Rapidité de facturation
- Suivi de trésorerie
- Conformité fiscale
- Communication client

---

### 🛒 Profil PROCUREMENT (Achats)
**Modules inclus** : Tableau de bord, Fournisseurs, Commandes d'achat, Produits

**Public cible** :
- PME avec activité d'achat importante
- Distributeurs et revendeurs
- Entreprises de production
- Services achats dédiés

**Cas d'usage typiques** :
- Gestion du panel fournisseurs
- Création et suivi des bons de commande
- Réception de marchandises
- Analyse des coûts d'approvisionnement

**Besoins métier** :
- Optimisation des coûts
- Traçabilité des achats
- Relations fournisseurs
- Gestion des stocks

---

### 💼 Profil PROFESSIONAL (Professionnel)
**Modules inclus** : Tableau de bord, Fournisseurs, Commandes d'achat, Factures, Produits, Clients

**Public cible** :
- PME matures (10-50 employés)
- Entreprises avec cycle complet achat-vente
- Distributeurs B2B
- Entreprises de négoce

**Cas d'usage typiques** :
- Gestion complète du cycle procurement-to-pay
- Gestion complète du cycle order-to-cash
- Suivi de marge produit par produit
- Gestion multi-utilisateurs

**Besoins métier** :
- Vision 360° de l'activité
- Collaboration entre services (achats, ventes, compta)
- Automatisation des processus
- Rentabilité et performance

---

### 🎯 Profil STRATEGIC (Stratégique)
**Modules inclus** : Tableau de bord, Fournisseurs, Commandes d'achat, Produits, E-Sourcing, Contrats, Analytique

**Public cible** :
- Moyennes entreprises (50-200 employés)
- Directions achats structurées
- Entreprises avec appels d'offres réguliers
- Organisations nécessitant conformité contractuelle

**Cas d'usage typiques** :
- Gestion d'appels d'offres et consultations
- Négociation et gestion de contrats cadres
- Analyse stratégique des achats
- Sourcing et évaluation fournisseurs

**Besoins métier** :
- Réduction des coûts par mise en concurrence
- Conformité et traçabilité juridique
- Intelligence achats (spend analysis)
- Stratégie d'approvisionnement

---

### 🏢 Profil ENTERPRISE (Entreprise)
**Modules inclus** : TOUS les modules (Dashboard, Suppliers, Purchase Orders, Invoices, Products, Clients, E-Sourcing, Contracts, Analytics, AI Assistant, Integrations, Data Migration)

**Public cible** :
- Grandes entreprises (200+ employés)
- Groupes multi-sites
- Organisations complexes
- Entreprises avec processus achats avancés

**Cas d'usage typiques** :
- Gestion centralisée multi-entités
- Intégration avec ERP existants
- Workflows d'approbation complexes
- Migration de données historiques
- Utilisation intensive de l'IA pour automatisation

**Besoins métier** :
- Gouvernance et conformité stricte
- Intégration système (API, connecteurs)
- Support et personnalisation avancés
- Évolutivité et performance

---

## 2. Rôles Utilisateurs

### 👑 Administrateur (Admin)
**Permissions** :
- Accès total à tous les modules disponibles dans l'abonnement
- Gestion des utilisateurs et des permissions
- Configuration de l'organisation
- Paramètres système et intégrations
- Accès aux données sensibles

**Responsabilités** :
- Configuration initiale de la plateforme
- Gestion des droits d'accès
- Support utilisateurs internes
- Maintenance et évolutions

**Profil typique** :
- Direction informatique
- Responsable système
- Chef de projet implémentation

---

### 📊 Gestionnaire (Manager)
**Permissions** :
- Lecture/écriture sur la plupart des modules
- Validation de workflows
- Rapports et analytics
- Ne peut pas gérer les utilisateurs ni les paramètres critiques

**Responsabilités** :
- Supervision des opérations
- Validation des commandes/factures importantes
- Analyse des performances
- Prise de décision opérationnelle

**Profil typique** :
- Responsable achats
- Directeur administratif et financier
- Chef de service

---

### 🛍️ Acheteur (Buyer)
**Permissions** :
- Création et modification de commandes d'achat
- Gestion des fournisseurs
- Création de produits
- Consultation des rapports

**Responsabilités** :
- Saisie des commandes fournisseurs
- Suivi des livraisons
- Négociation prix et conditions
- Relances fournisseurs

**Profil typique** :
- Acheteur opérationnel
- Assistant achats
- Approvisionneur

---

### 💰 Comptable (Accountant)
**Permissions** :
- Accès complet aux factures (clients et fournisseurs)
- Consultation des commandes
- Rapports financiers
- Suivi des paiements

**Responsabilités** :
- Saisie et validation des factures
- Rapprochement comptable
- Suivi de trésorerie
- Clôtures périodiques

**Profil typique** :
- Comptable
- Assistant comptable
- Contrôleur de gestion

---

### 👁️ Consultation (Viewer)
**Permissions** :
- Lecture seule sur les modules autorisés
- Consultation des rapports
- Export de données limité
- Aucune modification possible

**Responsabilités** :
- Consultation d'informations
- Extraction de données pour analyses externes
- Suivi de KPIs

**Profil typique** :
- Direction générale
- Auditeurs
- Consultants externes
- Stagiaires

---

## 3. Personas Détaillées

### Persona 1 : Sophie, Comptable en Cabinet
**Profil d'abonnement** : BILLING
**Rôle** : Accountant

**Démographie** :
- 32 ans, comptable en cabinet
- Gère 15 clients TPE/PME
- Utilise l'application 3-4h par jour

**Objectifs** :
- Facturer rapidement et sans erreur
- Suivre les paiements clients
- Générer les rapports de TVA
- Gagner du temps sur les tâches répétitives

**Points de douleur** :
- Saisies manuelles chronophages
- Relances clients impayés
- Erreurs de numérotation
- Gestion multi-clients

**Utilisation de l'app** :
- Module Factures (90% du temps)
- Module Clients (pour mettre à jour coordonnées)
- Module Produits (catalogue de services)
- Fonction d'export Excel pour comptabilité

**Citation** : *"J'ai besoin d'une solution simple qui me fait gagner du temps sur la facturation pour me concentrer sur le conseil à mes clients."*

---

### Persona 2 : Marc, Responsable Achats PME
**Profil d'abonnement** : PROFESSIONAL
**Rôle** : Manager

**Démographie** :
- 45 ans, 15 ans d'expérience achats
- PME de 30 personnes (distribution matériel industriel)
- Manage 2 acheteurs juniors

**Objectifs** :
- Centraliser toutes les commandes
- Négocier de meilleurs prix
- Avoir une visibilité sur les dépenses
- Former son équipe sur les bonnes pratiques

**Points de douleur** :
- Données éparpillées (Excel, emails, papier)
- Pas de vision consolidée des achats
- Difficulté à comparer les fournisseurs
- Perte de temps en recherche d'informations

**Utilisation de l'app** :
- Module Fournisseurs (évaluation et sélection)
- Module Commandes (validation et suivi)
- Module Tableau de bord (KPIs achats)
- Module Produits (gestion catalogue)
- Assistant IA pour analyses rapides

**Citation** : *"J'ai besoin d'avoir une vue d'ensemble en temps réel pour prendre les bonnes décisions et piloter mon équipe efficacement."*

---

### Persona 3 : Léa, Acheteuse Opérationnelle
**Profil d'abonnement** : PROCUREMENT
**Rôle** : Buyer

**Démographie** :
- 28 ans, 3 ans d'expérience
- PME industrielle (fabrication de composants)
- Gère 40 fournisseurs réguliers

**Objectifs** :
- Passer les commandes rapidement
- Suivre les livraisons
- Éviter les ruptures de stock
- Respecter les budgets

**Points de douleur** :
- Relances fournisseurs chronophages
- Erreurs de saisie dans les commandes
- Difficulté à retrouver l'historique
- Stress lié aux retards de livraison

**Utilisation de l'app** :
- Module Commandes d'achat (création quotidienne)
- Module Fournisseurs (coordonnées et tarifs)
- Module Produits (références et prix)
- Fonction de duplication de commandes
- Fonction vocale IA pour commandes urgentes en déplacement

**Citation** : *"Je passe mes journées à créer des bons de commande. J'ai besoin que ce soit rapide et sans erreur, surtout pour les commandes urgentes."*

---

### Persona 4 : Thomas, Directeur Administratif et Financier
**Profil d'abonnement** : PROFESSIONAL
**Rôle** : Admin

**Démographie** :
- 52 ans, direction financière
- PME de 45 personnes (services B2B)
- Vision stratégique et contrôle

**Objectifs** :
- Maîtriser les coûts
- Avoir une vision consolidée achat/vente
- Optimiser la trésorerie
- Accompagner la croissance avec les bons outils

**Points de douleur** :
- Reporting manuel long et fastidieux
- Manque de visibilité prévisionnelle
- Difficulté à analyser la rentabilité par client/produit
- Processus de validation trop lents

**Utilisation de l'app** :
- Module Tableau de bord (vision globale)
- Module Factures (suivi cash)
- Module Commandes (contrôle engagements)
- Configuration des workflows de validation
- Gestion des utilisateurs et permissions

**Citation** : *"J'ai besoin de chiffres fiables en temps réel pour piloter l'entreprise et anticiper les problèmes de trésorerie."*

---

### Persona 5 : Caroline, Directrice Achats Groupe
**Profil d'abonnement** : STRATEGIC
**Rôle** : Manager

**Démographie** :
- 48 ans, MBA, 20 ans en achats
- Groupe de 120 personnes (3 sites)
- Manage une équipe de 5 acheteurs

**Objectifs** :
- Mettre en place une stratégie achats groupe
- Optimiser le panel fournisseurs
- Piloter par la data (spend analysis)
- Professionnaliser les processus (appels d'offres, contrats)

**Points de douleur** :
- Manque d'outils pour gérer les consultations fournisseurs
- Pas de centralisation des contrats
- Difficulté à avoir une vision consolidée multi-sites
- Besoin de prouver les économies réalisées

**Utilisation de l'app** :
- Module E-Sourcing (appels d'offres)
- Module Contrats (gestion des accords cadres)
- Module Analytics (analyse des dépenses)
- Module Fournisseurs (évaluation et panel management)
- Assistant IA pour analyses prédictives

**Citation** : *"Je dois passer d'achats dispersés à une stratégie d'achats structurée qui apporte de la valeur mesurable à l'entreprise."*

---

### Persona 6 : Julien, DSI Entreprise
**Profil d'abonnement** : ENTERPRISE
**Rôle** : Admin

**Démographie** :
- 42 ans, Directeur des Systèmes d'Information
- Grande entreprise 500 personnes (industrie)
- Gère l'écosystème IT complet

**Objectifs** :
- Intégrer ProcureGenius avec l'ERP existant (SAP/Dynamics)
- Assurer la sécurité et conformité des données
- Former 50+ utilisateurs
- Garantir la disponibilité et performance

**Points de douleur** :
- Complexité d'intégration avec systèmes legacy
- Résistance au changement des utilisateurs
- Besoin de personnalisations spécifiques
- Exigences de sécurité et RGPD strictes

**Utilisation de l'app** :
- Module Intégrations (API, connecteurs)
- Module Migration de données
- Configuration avancée (workflows, permissions)
- Monitoring et logs système
- Gestion multi-organisations et multi-sites

**Citation** : *"Je dois m'assurer que la solution s'intègre parfaitement dans notre écosystème IT tout en respectant nos standards de sécurité."*

---

### Persona 7 : Amina, Freelance Designer
**Profil d'abonnement** : FREE → BILLING (upgrade)
**Rôle** : Admin (seule utilisatrice)

**Démographie** :
- 29 ans, designer graphique freelance
- Travaille seule avec 20 clients récurrents
- Utilise l'app sur mobile et desktop

**Objectifs** :
- Facturer rapidement après les missions
- Avoir un catalogue de ses prestations
- Présenter des devis professionnels
- Simplifier sa gestion administrative

**Points de douleur** :
- Perte de temps en administratif
- Pas de budget pour logiciel coûteux
- Besoin de simplicité (pas une experte comptable)
- Utilisation en mobilité (chez les clients)

**Utilisation de l'app** :
- Module Factures (création et envoi)
- Module Clients (contacts)
- Module Produits (prestations types)
- Fonction vocale IA pour créer factures rapidement
- Version mobile sur tablette pour présenter devis

**Parcours** :
- Commence avec profil FREE pour tester
- Upgrade vers BILLING après 2 mois
- Utilise principalement sur iPad

**Citation** : *"Je veux une solution simple et abordable qui me permet de facturer proprement sans perdre mon temps en paperasse."*

---

### Persona 8 : David, Consultant Externe
**Profil d'abonnement** : ENTERPRISE (client final)
**Rôle** : Viewer

**Démographie** :
- 55 ans, consultant senior en optimisation achats
- Intervient en mission 3-6 mois chez ses clients
- Accès temporaire aux systèmes clients

**Objectifs** :
- Analyser les données achats existantes
- Identifier les opportunités d'économies
- Produire des rapports et recommandations
- Ne pas perturber les processus en place

**Points de douleur** :
- Besoin d'accès rapide aux données
- Manque de temps pour apprendre des outils complexes
- Doit extraire beaucoup de données pour analyses Excel
- Droits limités = frustration

**Utilisation de l'app** :
- Module Analytics (lecture seule)
- Module Fournisseurs (analyse du panel)
- Module Commandes (historique et patterns)
- Exports de données massifs
- Consultation des contrats et accords

**Citation** : *"J'ai besoin d'accéder rapidement aux données pour faire mes analyses sans avoir les clés de la maison."*

---

## 4. Matrice de Correspondance

| Persona | Abonnement | Rôle | Usage Principal | Fréquence |
|---------|------------|------|-----------------|-----------|
| Sophie | BILLING | Accountant | Facturation clients | Quotidienne |
| Marc | PROFESSIONAL | Manager | Pilotage achats | Quotidienne |
| Léa | PROCUREMENT | Buyer | Création commandes | Quotidienne |
| Thomas | PROFESSIONAL | Admin | Supervision financière | Hebdomadaire |
| Caroline | STRATEGIC | Manager | Stratégie achats | Quotidienne |
| Julien | ENTERPRISE | Admin | Administration IT | Hebdomadaire |
| Amina | BILLING | Admin | Facturation freelance | Hebdomadaire |
| David | ENTERPRISE | Viewer | Analyse consultante | Quotidienne (temporaire) |

---

## 5. Insights Clés pour le Développement

### Fonctionnalités Critiques par Segment

**Profils Facturation (BILLING)** :
- Rapidité de création de facture
- Templates personnalisables
- Envoi email automatique
- Suivi paiements

**Profils Achats (PROCUREMENT, PROFESSIONAL)** :
- Duplication de commandes
- Relances fournisseurs automatiques
- Historique d'achats par produit
- Comparaison de prix

**Profils Stratégiques (STRATEGIC, ENTERPRISE)** :
- Analytics avancés (spend analysis)
- Workflows d'approbation
- Gestion de contrats
- Intégrations API

### Utilisation Mobile vs Desktop

**Mobile prioritaire** :
- Acheteurs terrain (commandes urgentes)
- Freelances (factures en déplacement)
- Managers (validation en mobilité)

**Desktop prioritaire** :
- Comptables (saisie intensive)
- Administrateurs (configuration)
- Analystes (rapports complexes)

### Assistant IA - Cas d'Usage

- **Léa (Buyer)** : "Crée une commande de 50 unités du produit XYZ chez le fournisseur ABC" (en voiture)
- **Sophie (Accountant)** : "Génère une facture pour le client Martin avec 10h de consulting à 80€/h"
- **Marc (Manager)** : "Analyse mes achats du dernier trimestre et identifie les opportunités d'économies"
- **Caroline (Strategic)** : "Compare les prix de mes 5 principaux fournisseurs sur la catégorie électronique"

---

## 6. Recommandations Produit

### Court Terme
1. **Onboarding personnalisé** par profil d'abonnement
2. **Tutoriels contextuels** adaptés au rôle utilisateur
3. **Raccourcis mobile** pour actions fréquentes (Léa, Amina)
4. **Tableaux de bord** pré-configurés par rôle

### Moyen Terme
1. **Templates de workflows** par industrie
2. **Marketplace d'intégrations** pour profils ENTERPRISE
3. **Mode offline** pour acheteurs terrain
4. **Assistant IA** avec apprentissage des habitudes utilisateur

### Long Terme
1. **Analytics prédictifs** (prévision de ruptures, variations de prix)
2. **Recommandations automatiques** de fournisseurs alternatifs
3. **Automatisation complète** des tâches répétitives
4. **Collaboration inter-organisations** (fournisseurs-acheteurs sur plateforme)

---

**Document créé le** : 2025-10-12
**Version** : 1.0
**Auteur** : Équipe Produit ProcureGenius
