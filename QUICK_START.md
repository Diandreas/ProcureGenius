# 🚀 Démarrage Rapide - Production Linux

## ⚡ TL;DR - Démarrer immédiatement

```bash
# Méthode 1 : PM2 (recommandé production)
pm2 start ecosystem.config.js

# Méthode 2 : npm
npm run pm2:start

# Méthode 3 : Script shell
./start_production.sh
```

---

## 📍 URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8090
- **Admin**: http://localhost:8090/admin

---

## 👤 Comptes de Test

```
admin@csj.cm / julianna2025
reception@csj.cm / julianna2025
docteur@csj.cm / julianna2025
labo@csj.cm / julianna2025
pharma@csj.cm / julianna2025
```

---

## 🛠️ Commandes PM2

```bash
pm2 status              # État des services
pm2 logs                # Logs en temps réel
pm2 monit               # Monitoring
pm2 restart all         # Redémarrer
pm2 stop all            # Arrêter
pm2 delete all          # Supprimer
```

---

## 📦 Première Installation

```bash
# 1. Dépendances
npm install
cd frontend && npm install && cd ..

# 2. Python venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_production.txt

# 3. Base de données
python manage.py migrate
python manage.py collectstatic --noinput

# 4. PM2 global
sudo npm install -g pm2

# 5. Démarrer
pm2 start ecosystem.config.js
pm2 save
```

---

## 🔄 Mise à Jour

```bash
git pull
source venv/bin/activate
pip install -r requirements_production.txt
cd frontend && npm install && cd ..
python manage.py migrate
python manage.py collectstatic --noinput
pm2 restart all
```

---

## 📖 Documentation

- **PRODUCTION.md** - Guide minimal production
- **PM2_LINUX_GUIDE.md** - Guide complet (Nginx, SSL, monitoring)
- **README.md** - Documentation générale du projet

---

**Prêt pour la production !** 🎉
