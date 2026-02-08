# 🚀 Solution Rapide - Problème Production

## ❌ Le Problème

Le frontend montre cette erreur:
```
Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Explication simple:** Le backend à `https://appback.centrejulianna.com` renvoie des pages HTML au lieu de JSON.

---

## ✅ La Solution (3 étapes)

### Étape 1: Se Connecter au Serveur

```bash
ssh user@serveur-production
cd /chemin/vers/ProcureGenius
```

### Étape 2: Vérifier que Django Tourne

```bash
ps aux | grep gunicorn
```

**Si rien n'apparaît** → Django n'est pas démarré! Aller à l'Étape 3.

**Si des lignes apparaissent** (comme `gunicorn: master [procuregenius]`) → Django tourne. Aller aux **Diagnostics Avancés** ci-dessous.

### Étape 3: Démarrer Django

```bash
# Option 1: systemd
sudo systemctl start gunicorn
sudo systemctl status gunicorn

# Option 2: supervisord
sudo supervisorctl start procuregenius

# Option 3: manuellement (dev)
cd /chemin/vers/ProcureGenius
source venv/bin/activate
gunicorn config.wsgi:application --bind 0.0.0.0:8000 &
```

### Étape 4: Tester

```bash
# Depuis le serveur
curl http://localhost:8000/api/v1/auth/token/

# Depuis votre machine
python test_backend_api.py
```

**Si vous voyez du JSON** → ✅ Problème résolu!

**Si vous voyez toujours du HTML** → Voir diagnostics avancés ci-dessous.

---

## 🔧 Diagnostics Avancés

### Django Tourne Mais Renvoie du HTML?

**1. Voir les logs d'erreur:**
```bash
sudo journalctl -u gunicorn -n 100
# Ou
tail -100 /chemin/vers/logs/error.log
```

Chercher des erreurs Python (ImportError, NameError, etc.)

**2. Vérifier la config nginx:**
```bash
sudo cat /etc/nginx/sites-enabled/appback.centrejulianna.com
```

S'assurer qu'il y a:
```nginx
location /api/ {
    proxy_pass http://localhost:8000;
    proxy_set_header Host $host;
    # ...
}
```

**3. Vérifier settings.py:**
```python
# Dans config/settings.py

ALLOWED_HOSTS = ['appback.centrejulianna.com']

CORS_ALLOWED_ORIGINS = [
    "https://centrejulianna.com",
    "https://www.centrejulianna.com",
]
```

**4. Redémarrer tout:**
```bash
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

---

## 🧪 Scripts de Test

### Test Rapide (Bash)
```bash
bash test_production_backend.sh
```

### Test Complet (Python)
```bash
python test_backend_api.py
```

Ces scripts vont:
- ✅ Tester la connectivité
- ✅ Vérifier si les API renvoient JSON ou HTML
- ✅ Identifier le problème exact
- ✅ Donner des recommandations

---

## 📋 Checklist Rapide

Sur le serveur de production, vérifier:

1. **Django tourne:**
   ```bash
   ps aux | grep gunicorn
   ```
   → Doit montrer des processus gunicorn

2. **Port 8000 écoute:**
   ```bash
   sudo netstat -tlnp | grep 8000
   ```
   → Doit montrer: `0.0.0.0:8000 ... gunicorn`

3. **Nginx tourne:**
   ```bash
   sudo systemctl status nginx
   ```
   → Doit être `active (running)`

4. **API accessible localement:**
   ```bash
   curl http://localhost:8000/api/v1/
   ```
   → Doit renvoyer du JSON, pas du HTML

5. **API accessible depuis l'extérieur:**
   ```bash
   curl https://appback.centrejulianna.com/api/v1/
   ```
   → Doit renvoyer du JSON, pas du HTML

---

## 🎯 Cause la Plus Fréquente

**95% du temps: Django n'est pas démarré**

Après un redémarrage serveur, un déploiement, ou une erreur, Gunicorn peut s'arrêter.

**Solution:** Le redémarrer avec `sudo systemctl start gunicorn`

---

## 🔄 Commandes de Maintenance

```bash
# Voir l'état des services
sudo systemctl status gunicorn
sudo systemctl status nginx

# Redémarrer
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# Voir les logs en temps réel
sudo journalctl -u gunicorn -f

# Tester la config nginx
sudo nginx -t
```

---

## 📞 Si Ça Ne Marche Toujours Pas

1. **Exécuter le script de diagnostic complet:**
   ```bash
   python test_backend_api.py > diagnostic.txt 2>&1
   bash test_production_backend.sh >> diagnostic.txt 2>&1
   ```

2. **Copier les logs:**
   ```bash
   sudo journalctl -u gunicorn -n 200 > gunicorn_logs.txt
   ```

3. **Envoyer:**
   - Le fichier `diagnostic.txt`
   - Le fichier `gunicorn_logs.txt`
   - La sortie de `ps aux | grep gunicorn`

---

## ✨ Une Fois Résolu

Le frontend devrait fonctionner normalement:
- ✅ Login fonctionne
- ✅ Pas d'erreur dans la console
- ✅ Les données s'affichent

**Note:** Vider le cache du navigateur (Ctrl+Shift+Delete) si nécessaire.

---

## 📚 Documentation Complète

Pour plus de détails, voir:
- `PRODUCTION_BACKEND_DEBUG.md` - Guide complet avec toutes les causes possibles
- `test_production_backend.sh` - Script bash de diagnostic
- `test_backend_api.py` - Script Python de test API
