# 🔧 Résoudre l'Erreur "Unexpected token '<'" en Production

## 🔴 Problème

Le frontend reçoit du HTML au lieu de JSON depuis le backend:
```
Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Cause:** Le backend Django à `https://appback.centrejulianna.com` renvoie des pages HTML (pages d'erreur ou redirections) au lieu de réponses JSON.

---

## 📋 Diagnostic Rapide

### 1️⃣ Tester le Backend depuis un Navigateur

Ouvrir dans Chrome/Firefox:
- `https://appback.centrejulianna.com/api/v1/`
- `https://appback.centrejulianna.com/api/v1/auth/token/`

**Si vous voyez du HTML/une page web** → Problème confirmé ✅
**Si vous voyez du JSON** → Problème ailleurs

### 2️⃣ Utiliser le Script de Test

```bash
cd /path/to/ProcureGenius
bash test_production_backend.sh
```

Ce script va tester:
- ✅ Connectivité serveur
- ✅ Réponse des endpoints API
- ✅ Headers CORS
- ✅ Content-Type
- ❌ Identifier le problème exact

---

## 🔍 Causes Possibles et Solutions

### **Cause 1: Django Non Démarré** ⭐ (Plus Fréquent)

Le serveur web (nginx) est actif mais Gunicorn/Django est arrêté.

#### Vérification:
```bash
# Sur le serveur de production
ps aux | grep gunicorn
ps aux | grep django
```

Si aucun processus n'apparaît → Django n'est pas démarré!

#### Solution:
```bash
# Démarrer Gunicorn/Django
sudo systemctl start gunicorn
sudo systemctl status gunicorn

# Ou si vous utilisez supervisord
sudo supervisorctl start procuregenius

# Vérifier les logs
sudo journalctl -u gunicorn -n 50 -f
```

---

### **Cause 2: Configuration Nginx Incorrecte**

Nginx ne proxi pas correctement vers Django.

#### Vérification:
```bash
# Voir la config nginx
sudo cat /etc/nginx/sites-enabled/appback.centrejulianna.com

# Chercher les lignes proxy_pass
```

#### Configuration Correcte Attendue:
```nginx
server {
    listen 443 ssl;
    server_name appback.centrejulianna.com;

    # SSL config...

    location /api/ {
        proxy_pass http://localhost:8000;  # Port où tourne Django
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass http://localhost:8000;
        # Mêmes headers...
    }

    location /media/ {
        alias /path/to/ProcureGenius/media/;
    }

    location /static/ {
        alias /path/to/ProcureGenius/staticfiles/;
    }
}
```

#### Solution:
```bash
# Corriger la config
sudo nano /etc/nginx/sites-enabled/appback.centrejulianna.com

# Tester la config
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

---

### **Cause 3: Django en Mode DEBUG avec Erreurs**

Django renvoie des pages d'erreur HTML.

#### Vérification:
```bash
# Voir les logs Django
tail -100 /path/to/ProcureGenius/logs/error.log
# Ou
sudo journalctl -u gunicorn -n 100
```

Chercher des erreurs Python (ImportError, OperationalError, etc.)

#### Solution:
Corriger les erreurs dans le code, puis:
```bash
sudo systemctl restart gunicorn
```

---

### **Cause 4: Mauvaise URL API**

Le backend tourne sur un port différent.

#### Vérification:
```bash
# Voir sur quel port Django écoute
sudo netstat -tlnp | grep python
sudo netstat -tlnp | grep gunicorn
```

Exemple de sortie:
```
tcp  0  0.0.0.0:8000  0.0.0.0:*  LISTEN  12345/gunicorn
```

Si le port n'est PAS 8000, mettre à jour la config nginx.

---

### **Cause 5: CORS Mal Configuré**

Django rejette les requêtes cross-origin.

#### Vérification:
```bash
cd /path/to/ProcureGenius
grep -r "CORS_ALLOWED_ORIGINS" .
```

#### Configuration Correcte dans `settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "https://centrejulianna.com",
    "https://www.centrejulianna.com",
    "http://localhost:3000",  # Dev local
]

CORS_ALLOW_CREDENTIALS = True
```

#### Solution:
```bash
# Éditer settings.py
nano /path/to/ProcureGenius/config/settings.py

# Redémarrer Django
sudo systemctl restart gunicorn
```

---

### **Cause 6: ALLOWED_HOSTS Incorrect**

Django rejette les requêtes avec un mauvais host.

#### Vérification:
```python
# Dans settings.py
ALLOWED_HOSTS = ['appback.centrejulianna.com', 'localhost']
```

#### Solution:
```bash
nano /path/to/ProcureGenius/config/settings.py

# Ajouter:
ALLOWED_HOSTS = ['appback.centrejulianna.com']

# Redémarrer
sudo systemctl restart gunicorn
```

---

## ✅ Vérifications Post-Fix

### Test 1: API Répond
```bash
curl https://appback.centrejulianna.com/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"username":"test","password":"test"}'
```

**Attendu:** JSON (même si erreur 400/401)
**Pas attendu:** HTML

### Test 2: Frontend Se Connecte
1. Aller sur `https://centrejulianna.com`
2. Ouvrir DevTools (F12) → Console
3. Vérifier qu'il n'y a plus d'erreur "Unexpected token"

---

## 🆘 Checklist Complète

Sur le serveur de production:

- [ ] **Django tourne:** `ps aux | grep gunicorn`
- [ ] **Logs OK:** `tail -50 /path/to/logs/error.log`
- [ ] **Port correct:** `netstat -tlnp | grep 8000`
- [ ] **Nginx config OK:** `sudo nginx -t`
- [ ] **Nginx proxi vers Django:** Config contient `proxy_pass http://localhost:8000`
- [ ] **ALLOWED_HOSTS correct:** `settings.py` contient `appback.centrejulianna.com`
- [ ] **CORS configuré:** `settings.py` contient `CORS_ALLOWED_ORIGINS`
- [ ] **Firewall OK:** Port 8000 accessible depuis nginx

---

## 🔑 Commandes Essentielles

```bash
# Redémarrer tout
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# Voir les logs en temps réel
sudo journalctl -u gunicorn -f

# Tester la config nginx
sudo nginx -t

# Voir les processus Django
ps aux | grep gunicorn

# Tester l'API
curl -I https://appback.centrejulianna.com/api/v1/
```

---

## 📞 Si Problème Persiste

1. **Copier les logs:**
```bash
sudo journalctl -u gunicorn -n 200 > /tmp/gunicorn.log
sudo nginx -T > /tmp/nginx.conf
```

2. **Partager:**
   - Le contenu des logs
   - La sortie de `ps aux | grep gunicorn`
   - La config nginx

---

## 🎯 Résumé

Le problème vient **toujours** du backend qui:
- ❌ N'est pas démarré
- ❌ Retourne des erreurs HTML
- ❌ N'est pas accessible via nginx

**Le frontend est OK** - il fait juste ce qu'on lui dit (appeler `https://appback.centrejulianna.com`).

La solution est **toujours côté serveur** (backend/nginx/gunicorn).
