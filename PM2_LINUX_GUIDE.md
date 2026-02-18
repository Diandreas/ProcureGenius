# 🐧 Guide PM2 pour Serveur Linux

Guide complet pour déployer ProcureGenius avec PM2 sur un serveur Linux.

---

## 📋 Prérequis

Assurez-vous d'avoir :
- ✅ Node.js et npm installés
- ✅ Python 3.8+ installé
- ✅ Git installé

---

## 🚀 Installation Initiale

### 1. Cloner le projet
```bash
cd /var/www  # ou votre répertoire préféré
git clone <votre-repo> ProcureGenius
cd ProcureGenius
```

### 2. Créer l'environnement virtuel Python
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Installer les dépendances Node.js
```bash
# Dépendances racine (PM2, concurrently)
npm install

# Dépendances frontend
cd frontend
npm install
cd ..
```

### 4. Configuration de la base de données
```bash
# Appliquer les migrations
python manage.py migrate

# Créer un superuser (optionnel)
python manage.py createsuperuser

# Collecter les fichiers statiques pour la production
python manage.py collectstatic --noinput
```

---

## 🎯 Démarrage avec PM2

### Installation de PM2 (global)
```bash
sudo npm install -g pm2
```

### Démarrer les services
```bash
# Depuis le répertoire racine du projet
pm2 start ecosystem.config.js

# OU avec npm
npm run pm2:start
```

**Le fichier `ecosystem.config.js` détecte automatiquement Linux** et utilise :
- Backend Django : `./venv/bin/python` sur port **8090**
- Frontend React : `npm start` sur port **3000**

---

## 📊 Commandes PM2 Essentielles

### Gestion des processus
```bash
# Voir le statut des services
pm2 status
# ou
npm run pm2:status

# Voir les logs en temps réel
pm2 logs
# ou
npm run pm2:logs

# Voir les logs d'un service spécifique
pm2 logs backend-django
pm2 logs frontend-react

# Monitoring interactif (CPU, RAM)
pm2 monit
# ou
npm run pm2:monit

# Redémarrer les services
pm2 restart ecosystem.config.js
# ou
npm run pm2:restart

# Arrêter les services
pm2 stop ecosystem.config.js
# ou
npm run pm2:stop

# Supprimer les processus
pm2 delete ecosystem.config.js
# ou
npm run pm2:delete
```

### Gestion avancée
```bash
# Voir les informations détaillées
pm2 show backend-django
pm2 show frontend-react

# Redémarrer un seul service
pm2 restart backend-django
pm2 restart frontend-react

# Recharger la configuration
pm2 reload ecosystem.config.js

# Flush les logs
pm2 flush
```

---

## 🔄 Démarrage Automatique au Boot du Serveur

PM2 peut redémarrer automatiquement vos services au démarrage du serveur :

```bash
# 1. Générer le script de démarrage (exécuter en tant que root ou avec sudo)
pm2 startup systemd

# 2. Copier et exécuter la commande affichée par PM2
# Elle ressemblera à :
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u votre-user --hp /home/votre-user

# 3. Sauvegarder la liste des processus actuels
pm2 save

# 4. Vérifier que ça fonctionne
sudo systemctl status pm2-votre-user
```

**Maintenant vos services redémarrent automatiquement après un reboot !**

### Désactiver le démarrage automatique
```bash
pm2 unstartup systemd
```

---

## 🌐 Configuration Nginx (Reverse Proxy)

Pour exposer votre application sur un nom de domaine :

### Configuration Nginx
```bash
sudo nano /etc/nginx/sites-available/procuregenius
```

Contenu du fichier :
```nginx
# Frontend React
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend Django
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/ProcureGenius/staticfiles/;
    }

    location /media/ {
        alias /var/www/ProcureGenius/media/;
    }
}
```

### Activer la configuration
```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/procuregenius /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### SSL avec Certbot (HTTPS)
```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat SSL
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com

# Renouvellement automatique (déjà configuré)
sudo certbot renew --dry-run
```

---

## 📁 Structure des Logs

Les logs sont disponibles dans `./logs/` :

```
logs/
├── backend-error.log      # Erreurs du backend
├── backend-out.log        # Sorties du backend
├── backend-combined.log   # Tout (erreurs + sorties)
├── frontend-error.log     # Erreurs du frontend
├── frontend-out.log       # Sorties du frontend
└── frontend-combined.log  # Tout (erreurs + sorties)
```

### Rotation des logs PM2
```bash
# Installer le module de rotation
pm2 install pm2-logrotate

# Configurer (optionnel)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 🔧 Variables d'Environnement

### Backend (.env)
Créez un fichier `.env` à la racine :
```bash
nano .env
```

```env
DEBUG=False
SECRET_KEY=votre-clé-secrète-super-longue-et-complexe
ALLOWED_HOSTS=votre-domaine.com,api.votre-domaine.com
DATABASE_URL=postgresql://user:password@localhost/dbname
```

### Frontend (.env)
Créez un fichier `.env` dans `frontend/` :
```bash
cd frontend
nano .env
```

```env
VITE_BACKEND_URL=https://api.votre-domaine.com
```

---

## 🔒 Sécurité

### Pare-feu (UFW)
```bash
# Autoriser SSH
sudo ufw allow 22

# Autoriser HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

### Permissions
```bash
# Définir les bonnes permissions
sudo chown -R www-data:www-data /var/www/ProcureGenius
sudo chmod -R 755 /var/www/ProcureGenius
```

---

## 📊 Monitoring et Alertes

### PM2 Plus (Optionnel - Monitoring Cloud)
```bash
# Créer un compte sur https://app.pm2.io
# Puis connecter votre serveur
pm2 link <secret> <public>
```

### Vérification de santé
```bash
# Script de vérification (à ajouter au crontab)
cat > /usr/local/bin/check-procuregenius.sh << 'EOF'
#!/bin/bash
if ! pm2 list | grep -q "online"; then
    pm2 restart ecosystem.config.js
    echo "Services redémarrés à $(date)" >> /var/log/procuregenius-check.log
fi
EOF

chmod +x /usr/local/bin/check-procuregenius.sh

# Ajouter au crontab (vérification toutes les 5 minutes)
crontab -e
# Ajouter la ligne :
# */5 * * * * /usr/local/bin/check-procuregenius.sh
```

---

## 🚀 Mise à Jour du Code (Déploiement)

Script de déploiement automatique :

```bash
cat > /var/www/ProcureGenius/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Début du déploiement..."

# 1. Pull les dernières modifications
git pull origin main

# 2. Activer le venv et mettre à jour les dépendances
source venv/bin/activate
pip install -r requirements.txt

# 3. Mettre à jour les dépendances frontend
cd frontend
npm install
cd ..

# 4. Migrations
python manage.py migrate

# 5. Collecter les fichiers statiques
python manage.py collectstatic --noinput

# 6. Redémarrer PM2
pm2 restart ecosystem.config.js

echo "✅ Déploiement terminé avec succès !"
EOF

chmod +x /var/www/ProcureGenius/deploy.sh
```

**Utilisation :**
```bash
cd /var/www/ProcureGenius
./deploy.sh
```

---

## 🐛 Dépannage

### Les services ne démarrent pas
```bash
# Vérifier les logs
pm2 logs --lines 50

# Vérifier que le venv existe
ls -la venv/bin/python

# Tester le backend manuellement
source venv/bin/activate
python manage.py runserver 0.0.0.0:8090
```

### Port déjà utilisé
```bash
# Trouver le processus
sudo lsof -i :3000
sudo lsof -i :8090

# Tuer le processus
sudo kill -9 <PID>
```

### Permissions
```bash
# Changer le propriétaire
sudo chown -R $USER:$USER /var/www/ProcureGenius

# OU exécuter PM2 en tant que www-data
sudo -u www-data pm2 start ecosystem.config.js
```

---

## ✅ Checklist de Production

- [ ] Environnement virtuel Python créé et activé
- [ ] Toutes les dépendances installées (Python + Node.js)
- [ ] Migrations appliquées
- [ ] Fichiers statiques collectés
- [ ] PM2 installé globalement
- [ ] Services démarrés avec PM2
- [ ] Démarrage automatique configuré (`pm2 startup`)
- [ ] Nginx configuré avec reverse proxy
- [ ] SSL configuré avec Certbot
- [ ] Pare-feu configuré (UFW)
- [ ] Logs de rotation configurés
- [ ] Script de déploiement créé
- [ ] Variables d'environnement (.env) configurées
- [ ] Backup de la base de données configuré

---

## 📞 Support

- **Logs Backend** : `pm2 logs backend-django`
- **Logs Frontend** : `pm2 logs frontend-react`
- **Status** : `pm2 status`
- **Monitoring** : `pm2 monit`

---

**Votre application est maintenant en production avec PM2 sur Linux !** 🎉
