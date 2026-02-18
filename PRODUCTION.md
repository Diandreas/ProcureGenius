# 🚀 Production - Centre de Santé Julianna

Guide minimal pour déployer en production sur Linux avec PM2.

---

## ⚡ Démarrage Rapide

### Installation initiale (première fois)
```bash
# 1. Installer les dépendances
npm install
cd frontend && npm install && cd ..

# 2. Python venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_production.txt

# 3. Base de données
python manage.py migrate
python manage.py collectstatic --noinput

# 4. Installer PM2 (global)
sudo npm install -g pm2
```

### Démarrer l'application
```bash
# Avec PM2 (recommandé production)
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd  # Suivre les instructions

# OU avec npm
npm run pm2:start

# OU avec le script
./start_production.sh
```

---

## 📍 Ports et URLs

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8090 | http://localhost:8090 |
| Admin | 8090 | http://localhost:8090/admin |

---

## 🎯 Commandes PM2

```bash
pm2 status          # État des services
pm2 logs            # Logs en temps réel
pm2 monit           # Monitoring CPU/RAM
pm2 restart all     # Redémarrer
pm2 stop all        # Arrêter
```

---

## 📖 Documentation Complète

Voir **PM2_LINUX_GUIDE.md** pour :
- Configuration Nginx
- SSL avec Certbot
- Démarrage automatique
- Scripts de déploiement
- Monitoring avancé
- Dépannage

---

## 🔄 Mise à Jour (Git Pull + Redémarrage)

```bash
git pull
source venv/bin/activate
pip install -r requirements_production.txt
cd frontend && npm install && cd ..
python manage.py migrate
python manage.py collectstatic --noinput
pm2 restart ecosystem.config.js
```

---

**C'est tout !** Votre application tourne maintenant en production. 🎉
