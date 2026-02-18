# 📂 Fichiers de Production - Linux

Récapitulatif des fichiers essentiels pour la production.

---

## ✅ Fichiers Conservés

### 🚀 Démarrage
- `ecosystem.config.js` - Configuration PM2 (auto-détection Linux/Windows)
- `START.sh` - Script de démarrage rapide
- `start_production.sh` - Script de production avec vérifications
- `package.json` - Scripts npm + dépendances (concurrently, pm2)

### 📖 Documentation
- `PRODUCTION.md` - Guide minimal production
- `QUICK_START.md` - Démarrage rapide
- `PM2_LINUX_GUIDE.md` - Guide complet Linux (Nginx, SSL, monitoring)
- `README.md` - Documentation générale

### ⚙️ Configuration
- `.env` - Variables d'environnement (ne pas commit !)
- `.env.example` - Template .env
- `requirements.txt` - Dépendances Python
- `requirements_production.txt` - Dépendances Python production
- `celery_config.py` - Configuration Celery

### 🐍 Django
- `manage.py` - Commande Django
- `apps/` - Applications Django
- `saas_procurement/` - Settings Django
- `templates/` - Templates HTML
- `static/` - Fichiers statiques
- `staticfiles/` - Fichiers statiques collectés
- `media/` - Uploads utilisateurs
- `locale/` - Traductions

### ⚛️ Frontend
- `frontend/` - Application React
  - `package.json`
  - `vite.config.js` (configuré pour port 3000)
  - `src/` - Code source React
  - `.env.example` - Template config frontend

### 🗄️ Base de données
- `db.sqlite3` - Base SQLite (développement)
  - ⚠️ En production, utilisez PostgreSQL/MySQL

### 🐳 Docker (optionnel)
- `Dockerfile` - Conservé si vous utilisez Docker
- `docker-compose.yml` - Conservé si vous utilisez Docker

### 📝 Logs
- `logs/` - Dossier créé automatiquement
  - `backend-error.log`
  - `backend-out.log`
  - `frontend-error.log`
  - `frontend-out.log`

### 🔒 Git
- `.gitignore` - Fichiers à ne pas commiter
- `.gitattributes` - Attributs Git

---

## 🗑️ Fichiers Supprimés

Les fichiers suivants ont été supprimés car inutiles en production :

### Scripts Windows
- ❌ START.bat
- ❌ PM2_START.bat
- ❌ PM2_STOP.bat
- ❌ start_production.bat
- ❌ start_dev.bat
- ❌ DEPLOYMENT_WINDOWS.bat

### Scripts de développement
- ❌ setup_profiles_quickstart.sh
- ❌ start_dev.sh
- ❌ fix_*.py
- ❌ fix_*.sh

### Tests et données de dev
- ❌ generate_sample_data.py
- ❌ test_notification_system.py
- ❌ update_production_data.py
- ❌ pytest.ini
- ❌ requirements-test.txt
- ❌ requirements_dev.txt
- ❌ test-reports/

### Backups et anciens fichiers
- ❌ backup_data_before_cleanup.json
- ❌ migration_0015.sql
- ❌ screenshot_homepage.png

### Documentation redondante
- ❌ FICHIERS_DEMARRAGE.md
- ❌ GUIDE_DEMARRAGE_PRODUCTION.md
- ❌ DEMARRAGE_RAPIDE.txt
- ❌ COMMANDES_RAPIDES.txt
- ❌ DEPLOYMENT_COMMANDS.sh
- ❌ README_DEPLOYMENT.md
- ❌ README_IMPLEMENTATION.md
- ❌ CLEANUP_SUMMARY.md
- ❌ FINAL_CLEANUP_REPORT.md
- ❌ MIGRATION_FIX_GUIDE.txt
- ❌ MIGRATION_GUIDE.md
- ❌ MODIFICATIONS_FOLLOW_UP_ET_TARIFS.md
- ❌ NOTIFICATION_SYSTEM.md
- ❌ STRUCTURE_PROJET.md
- ❌ TARIFS_CSJ_README.md
- ❌ medicament.md
- ❌ soins.md

### Scripts obsolètes
- ❌ deploy.sh
- ❌ init_production.sh
- ❌ nginx_frontend.conf
- ❌ cleanup_for_production.sh

### Dossiers d'éditeurs
- ❌ .cursor/
- ❌ .agent/

---

## 📊 Structure Finale Optimale

```
ProcureGenius/
├── 📁 apps/                      # Apps Django
├── 📁 frontend/                  # App React
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── 📁 saas_procurement/          # Settings Django
├── 📁 static/                    # Fichiers statiques
├── 📁 templates/                 # Templates HTML
├── 📁 logs/                      # Logs PM2 (auto-créé)
├── 📁 venv/                      # Environnement Python
│
├── 🚀 ecosystem.config.js        # Config PM2
├── 🚀 START.sh                   # Démarrage rapide
├── 🚀 start_production.sh        # Production
├── 📦 package.json               # Scripts npm
├── 🐍 manage.py                  # Django CLI
├── 📋 requirements.txt           # Deps Python
├── 📋 requirements_production.txt
│
├── 📖 PRODUCTION.md              # Guide minimal
├── 📖 QUICK_START.md             # Démarrage rapide
├── 📖 PM2_LINUX_GUIDE.md         # Guide complet
└── 📖 README.md                  # Doc générale
```

---

## ✅ Checklist Pré-Production

- [ ] Tous les fichiers inutiles supprimés
- [ ] Documentation concentrée sur Linux/PM2
- [ ] Variables d'environnement configurées (.env)
- [ ] Base de données migrée
- [ ] Fichiers statiques collectés
- [ ] PM2 testé et fonctionnel
- [ ] Logs vérifiés
- [ ] Démarrage automatique configuré (pm2 startup)
- [ ] Nginx configuré (optionnel)
- [ ] SSL configuré (optionnel)

---

**Projet optimisé pour la production Linux !** 🚀
