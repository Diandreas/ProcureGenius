# 🚀 Guide Déploiement ProcureGenius sur CloudPanel

## 📋 Configuration Complète du VHost

### **1. Préparation du projet**

```bash
# Sur votre serveur CloudPanel
cd /home/mirhosty-procura/htdocs/procura.mirhosty.com

# Exécuter le déploiement automatique
./deploy_cloudpanel.sh
```

### **2. Configuration du VHost dans CloudPanel**

**Allez dans :** `CloudPanel > Domaines > procura.mirhosty.com > onglet "Nginx"`

**Remplacez TOUTE la configuration existante par le contenu de `nginx_frontend.conf`**

**⚠️ Important :** Remplacez complètement votre VHost actuel, ne l'ajoutez pas aux settings existants.

### **3. Démarrage de Django**

Créez un cron job pour démarrer Django automatiquement :

```bash
# Dans CloudPanel > Cron Jobs
# Ajoutez cette ligne :
@reboot cd /home/mirhosty-procura/htdocs/procura.mirhosty.com && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &
```

Ou démarrez manuellement pour les tests :
```bash
cd /home/mirhosty-procura/htdocs/procura.mirhosty.com
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
```

### **4. Redémarrage des services**

Dans CloudPanel :
1. **Domaines > procura.mirhosty.com** : Bouton "Restart"
2. **Services > Nginx** : Restart

---

## 🔍 Vérifications Post-déploiement

### **Test du frontend :**
```bash
curl -I https://procura.mirhosty.com
# Doit retourner HTTP 200
```

### **Test de l'API :**
```bash
curl https://procura.mirhosty.com/api/
# Doit retourner une réponse JSON de Django
```

### **Test de l'admin :**
```bash
curl -I https://procura.mirhosty.com/admin/
# Doit retourner HTTP 200
```

### **Vérification des processus :**
```bash
ps aux | grep python
# Doit montrer Django en cours d'exécution
```

---

## 📁 Structure Finale Attendue

```
/home/mirhosty-procura/htdocs/procura.mirhosty.com/
├── venv/                    ✅ Environnement virtuel Python
├── frontend/
│   └── build/              ✅ Application React compilée
├── staticfiles/            ✅ Fichiers statiques Django
├── media/                  ✅ Fichiers uploadés
├── db.sqlite3             ✅ Base de données
├── .env                   ✅ Configuration
├── manage.py             ✅ Point d'entrée Django
└── nginx_frontend.conf   ✅ Configuration VHost complète
```

---

## 🎯 Résultat Final

Après configuration, votre application sera accessible sur :

- **🌐 Frontend :** `https://procura.mirhosty.com`
- **🔌 API :** `https://procura.mirhosty.com/api/`
- **👨‍💼 Admin :** `https://procura.mirhosty.com/admin/`

### **Identifiants par défaut :**
- **Utilisateur :** `admin`
- **Mot de passe :** `admin123`

---

## 🚨 Dépannage

### **Si le frontend ne charge pas :**
```bash
# Vérifier que le build existe
ls -la frontend/build/

# Vérifier les permissions
ls -la /home/mirhosty-procura/htdocs/procura.mirhosty.com/frontend/build/
```

### **Si l'API ne répond pas :**
```bash
# Vérifier que Django tourne
ps aux | grep "python.*manage.py.*runserver"

# Vérifier les logs Django
tail -f logs/django.log
```

### **Si erreurs 404/500 :**
```bash
# Vérifier la configuration Nginx
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

---

## ✅ Checklist de Validation

- [ ] Déploiement exécuté avec `./deploy_cloudpanel.sh`
- [ ] VHost remplacé dans CloudPanel
- [ ] Services redémarrés (Domaine + Nginx)
- [ ] Django démarré (cron job ou manuel)
- [ ] Frontend accessible : `https://procura.mirhosty.com`
- [ ] API fonctionnelle : `https://procura.mirhosty.com/api/`
- [ ] Admin accessible : `https://procura.mirhosty.com/admin/`
- [ ] Pas d'erreurs JavaScript dans la console
- [ ] Pas d'erreurs 404 pour manifest.json

---

## 🎉 Félicitations !

Votre application **ProcureGenius** est maintenant déployée en production sur CloudPanel avec :

- ✅ **Frontend React** optimisé
- ✅ **API Django** complète
- ✅ **Interface d'administration**
- ✅ **Configuration de production**
- ✅ **Sécurité renforcée**
- ✅ **Performance optimisée**

**🚀 Prêt pour l'utilisation en production !**

