# 🚀 **ProcureGenius - SAAS Facturation & Bons de Commande avec IA**

![ProcureGenius Logo](https://via.placeholder.com/600x200/007bff/ffffff?text=ProcureGenius)

## 📋 **DESCRIPTION**

**ProcureGenius** est une application SAAS complète de gestion des achats et de la facturation, intégrant l'intelligence artificielle **Mistral AI** pour automatiser et optimiser vos processus d'approvisionnement.

### 🎯 **CARACTÉRISTIQUES PRINCIPALES**

- **🤖 IA Conversationnelle** avec Mistral AI
- **💰 Facturation complète** avec intégration PayPal
- **🛒 Gestion des bons de commande** avec workflow d'approbation
- **🏪 Catalogue fournisseurs** intelligent
- **📊 Analytics avancés** avec rapports personnalisés
- **🌍 Multilingue** (Français/Anglais)
- **🏢 Multi-tenant** pour plusieurs entreprises
- **🔗 Intégrations** API et webhooks

---

## 🏗️ **ARCHITECTURE**

### **📁 Structure du Projet**

```
ProcureGenius/
├── apps/
│   ├── accounts/           # 🔐 Gestion utilisateurs/tenants
│   ├── core/              # 🏠 Dashboard et navigation
│   ├── suppliers/         # 🏪 Fournisseurs et catalogue
│   ├── purchase_orders/   # 🛒 Bons de commande
│   ├── invoicing/         # 💰 Facturation et paiements
│   ├── ai_assistant/      # 🤖 Assistant IA Mistral
│   ├── analytics/         # 📊 Rapports et analytics
│   ├── integrations/      # 🔗 APIs et intégrations
│   └── api/              # 🌐 API REST
├── templates/             # 📄 Templates HTML
├── static/               # 🎨 CSS, JS, Images
├── locale/               # 🌍 Traductions FR/EN
├── media/                # 📁 Fichiers uploadés
└── requirements.txt      # 📦 Dépendances Python
```

### **🔧 Technologies Utilisées**

- **Backend**: Django 5.0.3 + Django REST Framework
- **Base de données**: PostgreSQL avec django-tenants
- **Cache**: Redis + Celery pour tâches asynchrones
- **IA**: Mistral AI API
- **Paiements**: PayPal SDK
- **Frontend**: Bootstrap 5 + JavaScript
- **WebSockets**: Django Channels pour chat IA temps réel
- **Internationalisation**: Django i18n (FR/EN)

---

## 🚀 **INSTALLATION RAPIDE**

### **Option 1: Déploiement avec Docker (Recommandé)**

```bash
# 1. Cloner le projet
git clone <votre-repo>
cd ProcureGenius

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos clés API

# 3. Démarrer avec Docker
./deploy.sh
```

### **Option 2: Installation manuelle**

```bash
# 1. Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer la base de données
createdb saas_procurement

# 4. Configurer les variables
cp .env.example .env
# Éditez .env avec vos paramètres

# 5. Appliquer les migrations
python manage.py migrate

# 6. Créer un superutilisateur
python manage.py createsuperuser

# 7. Démarrer l'application
python manage.py runserver
```

---

## ⚙️ **CONFIGURATION**

### **🔑 Variables d'Environnement Requises**

```bash
# Django
SECRET_KEY=votre-clé-secrète-django
DEBUG=True

# Base de données
DB_NAME=saas_procurement
DB_USER=postgres
DB_PASSWORD=votre-mot-de-passe
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Mistral AI
MISTRAL_API_KEY=votre-clé-mistral-ai

# PayPal
PAYPAL_CLIENT_ID=votre-client-id-paypal
PAYPAL_CLIENT_SECRET=votre-secret-paypal
PAYPAL_MODE=sandbox  # ou 'live' pour production

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-app
```

### **🔗 Obtenir les Clés API**

1. **Mistral AI**: [https://console.mistral.ai/](https://console.mistral.ai/)
2. **PayPal Developer**: [https://developer.paypal.com/](https://developer.paypal.com/)

---

## 🎮 **UTILISATION**

### **🤖 Mode IA (Recommandé)**

L'assistant IA peut gérer la plupart des tâches via conversation naturelle :

```
👤 "Créer un BC pour 100 chaises de bureau"
🤖 "Je trouve 3 fournisseurs appropriés. Voulez-vous que je crée le BC avec FurniturePro (meilleur prix) ?"

👤 "Montrer les factures en retard"
🤖 "Vous avez 5 factures en retard pour un total de 15,450$. Voulez-vous que j'envoie des relances ?"

👤 "Analyser les dépenses du trimestre"
🤖 "Vos dépenses ont augmenté de 12% ce trimestre. Voici les principales catégories..."
```

### **👤 Mode Manuel**

Interface traditionnelle avec pages dédiées :

- **📋 Bons de commande**: Création, modification, approbation, suivi
- **💰 Factures**: Génération, envoi, paiements PayPal, relances
- **🏪 Fournisseurs**: Catalogue, évaluation, contacts, documents
- **📊 Analytics**: Tableaux de bord, rapports, KPIs personnalisés

---

## 🔧 **FONCTIONNALITÉS DÉTAILLÉES**

### **💼 Gestion des Bons de Commande**

- ✅ Création manuelle ou via IA
- ✅ Workflow d'approbation multi-niveaux
- ✅ Calcul automatique des taxes canadiennes (TPS/TVH/TVQ)
- ✅ Suivi des livraisons et réceptions
- ✅ Templates réutilisables
- ✅ Export PDF et envoi email automatique

### **💰 Facturation Avancée**

- ✅ Génération depuis bons de commande
- ✅ **Paiements PayPal intégrés**
- ✅ Facturation récurrente
- ✅ Relances automatiques intelligentes
- ✅ Gestion des taxes canadiennes
- ✅ Rapports de vieillissement des créances

### **🏪 Catalogue Fournisseurs**

- ✅ Base de données complète fournisseurs/produits
- ✅ Évaluation de performance automatique
- ✅ Recherche intelligente avec IA
- ✅ Gestion des contacts multiples
- ✅ Documents et certifications
- ✅ Critères de diversité (local, minorité, autochtone, femme)

### **🤖 Assistant IA Mistral**

- ✅ Chat conversationnel en temps réel
- ✅ Création automatique de BC et factures
- ✅ Analyse prédictive des dépenses
- ✅ Suggestions de fournisseurs optimales
- ✅ Détection d'anomalies
- ✅ Apprentissage personnalisé par tenant

### **📊 Analytics et Rapports**

- ✅ Tableaux de bord personnalisables
- ✅ Analyses de dépenses par période/catégorie
- ✅ Performance des fournisseurs
- ✅ Prévisions de flux de trésorerie
- ✅ KPIs personnalisés
- ✅ Export Excel/PDF

### **🌍 Internationalisation**

- ✅ Interface complète en **Français** et **Anglais**
- ✅ Changement de langue en temps réel
- ✅ Formats de dates et devises localisés
- ✅ Taxes canadiennes par province

---

## 🧪 **TESTS ET VALIDATION**

### **Exécuter les Tests**

```bash
# Tests automatiques
python test_application.py

# Tests Django
python manage.py test

# Vérifier les liens
python manage.py check --deploy
```

### **✅ Tests de Validation Effectués**

- ✅ **Modèles de données** - Toutes les relations fonctionnent
- ✅ **Vues et URLs** - Tous les liens sont accessibles
- ✅ **Authentification** - Multi-tenant + permissions
- ✅ **IA Mistral** - Intégration complète et fonctionnelle
- ✅ **PayPal** - Paiements et webhooks configurés
- ✅ **Traductions** - FR/EN sur toute l'interface
- ✅ **Responsive Design** - Compatible mobile/desktop
- ✅ **Performance** - Optimisé avec index et cache

---

## 🔒 **SÉCURITÉ**

### **Mesures de Sécurité Implémentées**

- ✅ **Multi-tenancy** avec isolation complète des données
- ✅ **Authentification robuste** avec django-allauth
- ✅ **Permissions basées sur les rôles** (Admin, Manager, Buyer, etc.)
- ✅ **Chiffrement des données sensibles**
- ✅ **Validation des webhooks PayPal**
- ✅ **Audit trail complet** de toutes les actions
- ✅ **Protection CSRF et XSS**
- ✅ **Rate limiting** sur les APIs

---

## 📊 **TABLEAU DE BORD**

### **🤖 Interface IA**
```
┌─ ASSISTANT IA ─────────┬─ SUGGESTIONS ─────────┐
│ 💬 "Comment puis-je    │ 🔔 3 factures en     │
│     vous aider ?"      │    retard détectées   │
│                        │ 💡 Opportunité       │
│ 🎤 Commande vocale     │    d'économies        │
│ 📝 Historique          │ ⏰ Commande récurrente│
└────────────────────────┴───────────────────────┘
```

### **👤 Interface Manuelle**
```
┌─ ACTIONS RAPIDES ──────┬─ STATISTIQUES ────────┐
│ ➕ Nouveau BC          │ 📊 125 Bons commande  │
│ 💰 Nouvelle facture    │ 💰 $45,230 Ce mois   │
│ 🏪 Nouveau fournisseur │ ⏰ 8 En attente      │
│ 📊 Rapports            │ 🎯 95% Ponctualité   │
└────────────────────────┴───────────────────────┘
```

---

## 🌟 **FONCTIONNALITÉS UNIQUES**

### **🎯 Architecture Hybride IA + Contrôle Manuel**

- **L'IA propose** → **L'humain valide** → **Le système exécute**
- Niveaux d'automatisation configurables par utilisateur
- Contrôle total maintenu sur toutes les opérations

### **🇨🇦 Spécificités Canadiennes**

- ✅ **Taxes provinciales** automatiques (TPS/TVH/TVQ)
- ✅ **Codes postaux** canadiens validés
- ✅ **Numéros d'entreprise** 15 chiffres
- ✅ **Fournisseurs locaux** et critères de diversité
- ✅ **Formats de date** canadiens (dd/mm/yyyy)

### **💡 IA Contextuelle**

- Apprentissage spécifique à chaque tenant
- Suggestions basées sur l'historique
- Détection proactive d'anomalies
- Optimisation continue des processus

---

## 📱 **COMPATIBILITÉ**

- ✅ **Desktop**: Chrome, Firefox, Safari, Edge
- ✅ **Mobile**: iOS Safari, Android Chrome
- ✅ **Tablettes**: iPad, Android tablets
- ✅ **Responsive Design** Bootstrap 5

---

## 🔧 **ADMINISTRATION**

### **Interface Admin Django**

Accédez à `/admin` pour :

- Gérer les tenants et utilisateurs
- Configurer les intégrations
- Monitorer les performances IA
- Consulter les logs de synchronisation
- Gérer les templates et paramètres

### **Rôles et Permissions**

- **👑 Admin**: Accès complet, gestion tenants
- **👨‍💼 Manager**: Approbations, rapports, configuration
- **🛒 Buyer**: Création BC, gestion fournisseurs
- **💰 Accountant**: Facturation, paiements, relances
- **👁️ Viewer**: Consultation uniquement

---

## 🚀 **DÉPLOIEMENT EN PRODUCTION**

### **Prérequis Production**

- Python 3.11+
- PostgreSQL 13+
- Redis 6+
- Nginx (reverse proxy)
- SSL/TLS Certificate

### **Variables d'Environnement Production**

```bash
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com
SECRET_KEY=clé-secrète-forte-production

# Base de données
DB_HOST=votre-db-host
DB_PASSWORD=mot-de-passe-fort

# Mistral AI Production
MISTRAL_API_KEY=votre-clé-production

# PayPal Live
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=client-id-live
PAYPAL_CLIENT_SECRET=secret-live

# Email Production
EMAIL_HOST=votre-smtp-host
EMAIL_HOST_USER=noreply@votre-domaine.com
```

### **Commandes de Déploiement**

```bash
# 1. Collecte des fichiers statiques
python manage.py collectstatic --noinput

# 2. Migrations
python manage.py migrate

# 3. Compilation des traductions
python manage.py compilemessages

# 4. Démarrage avec Gunicorn
gunicorn --bind 0.0.0.0:8000 saas_procurement.wsgi:application

# 5. Démarrage Celery (dans un autre terminal)
celery -A saas_procurement worker -l info
celery -A saas_procurement beat -l info
```

---

## 📈 **MONITORING ET MAINTENANCE**

### **Logs Importants**

- `/logs/django.log` - Logs applicatifs
- `/logs/celery.log` - Tâches asynchrones
- `/logs/mistral.log` - Interactions IA
- `/logs/paypal.log` - Transactions PayPal

### **Métriques à Surveiller**

- Temps de réponse IA
- Taux de succès des paiements PayPal
- Utilisation des tokens Mistral
- Performance des requêtes DB
- Taux d'erreur des intégrations

---

## 🎯 **EXEMPLES D'UTILISATION**

### **🤖 Création de BC via IA**

```
👤 "J'ai besoin de 50 ordinateurs portables pour le bureau"

🤖 "J'ai trouvé 3 fournisseurs appropriés:
    1. TechPro - 1,299$ chacun (livraison 5 jours)
    2. CompuMax - 1,350$ chacun (livraison 3 jours) 
    3. DigitalSupply - 1,275$ chacun (livraison 7 jours)
    
    Recommandation: TechPro (meilleur rapport qualité/prix)
    
    Voulez-vous que je crée le bon de commande ?"

👤 "Oui, avec TechPro"

🤖 "✅ Bon de commande PO2024-00123 créé pour 64,950$ (taxes incluses)
    📧 Envoyé pour approbation à votre manager
    🔗 Voir le détail: [lien]"
```

### **💰 Facturation Automatique**

```
👤 "Facturer toutes les livraisons de cette semaine"

🤖 "J'ai identifié 8 bons de commande livrés:
    - BC-001: ClientA - 5,230$
    - BC-002: ClientB - 12,450$
    - BC-003: ClientC - 3,890$
    [...]
    
    Total: 67,890$
    
    Voulez-vous que je génère les factures ?"

👤 "Oui, génère et envoie"

🤖 "✅ 8 factures générées et envoyées
    💳 Liens PayPal inclus pour paiement rapide
    📊 Suivi automatique activé"
```

---

## 🔧 **PERSONNALISATION**

### **Templates IA Personnalisés**

Créez vos propres templates de prompts dans l'admin :

```python
# Exemple: Template pour commande urgente
prompt_template = """
Tu dois créer un bon de commande URGENT.
Priorité: URGENT
Délai max: {{ max_delivery_days }} jours
Budget max: {{ max_budget }}$
Exigences: {{ requirements }}
"""
```

### **Webhooks Personnalisés**

Configurez des webhooks pour intégrer vos systèmes :

```python
# Exemple: Webhook pour ERP externe
class ERPWebhookProcessor:
    def process_purchase_order(self, po_data):
        # Votre logique d'intégration ERP
        pass
```

---

## 📞 **SUPPORT ET CONTRIBUTION**

### **🐛 Signaler un Bug**

1. Vérifiez les logs dans `/logs/`
2. Reproduisez le problème
3. Créez une issue avec:
   - Description détaillée
   - Étapes de reproduction
   - Logs d'erreur
   - Environnement (OS, navigateur, etc.)

### **💡 Demander une Fonctionnalité**

1. Décrivez le besoin métier
2. Proposez la solution
3. Estimez l'impact utilisateur

### **🤝 Contribuer**

1. Fork le projet
2. Créez une branche feature
3. Développez avec tests
4. Soumettez une Pull Request

---

## 📚 **DOCUMENTATION TECHNIQUE**

### **API REST**

Documentation Swagger disponible sur `/api/docs/`

### **Modèles de Données**

- [Schéma de base de données](docs/database_schema.md)
- [Relations entre modèles](docs/model_relationships.md)

### **Intégrations**

- [Guide PayPal](docs/paypal_integration.md)
- [Guide Mistral AI](docs/mistral_integration.md)
- [APIs externes](docs/external_apis.md)

---

## 🏆 **ROADMAP**

### **Version 1.1 (Prochaine)**
- [ ] Application mobile React Native
- [ ] Intégration QuickBooks
- [ ] OCR avancé pour factures
- [ ] Prévisions IA plus poussées

### **Version 1.2 (Future)**
- [ ] Marketplace fournisseurs
- [ ] Négociation automatique des prix
- [ ] Blockchain pour traçabilité
- [ ] IA vocale intégrée

---

## 📄 **LICENCE**

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 **REMERCIEMENTS**

- **Mistral AI** pour l'intelligence artificielle
- **PayPal** pour l'intégration des paiements
- **Django Community** pour le framework
- **Bootstrap** pour l'interface utilisateur

---

**🚀 ProcureGenius - Révolutionnez votre gestion des achats avec l'IA !**

*Développé avec ❤️ pour les entreprises canadiennes*