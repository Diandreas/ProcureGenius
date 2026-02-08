# 🔧 Corriger les Permissions Admin en Production

## ⚠️ Problème

L'administrateur `julianna_admin` n'a pas les accès admin complets car `is_superuser = False`.

## ✅ Solution Rapide (Sans Réinitialiser la Base)

### Méthode 1: Management Command (Recommandée)

```bash
# Sur le serveur de production
cd /path/to/ProcureGenius
source venv/bin/activate
python manage.py fix_admin_permissions
```

Cette commande va :
- ✅ Trouver l'utilisateur admin
- ✅ Mettre `is_staff = True`
- ✅ Mettre `is_superuser = True`
- ✅ Mettre `role = 'admin'`
- ✅ Activer le compte

### Méthode 2: Script Python

```bash
cd /path/to/ProcureGenius
source venv/bin/activate
python manage.py shell < fix_admin.py
```

### Méthode 3: Django Shell Manuel

```bash
python manage.py shell
```

Puis dans le shell :
```python
from django.contrib.auth import get_user_model
User = get_user_model()

admin = User.objects.get(username='julianna_admin')
admin.is_staff = True
admin.is_superuser = True
admin.role = 'admin'
admin.is_active = True
admin.save()

print('✅ Admin corrigé!')
```

## 🔄 Solution Complète (Réinitialiser Tout)

Si vous voulez tout réinitialiser avec les bonnes permissions :

```bash
cd /path/to/ProcureGenius
source venv/bin/activate
python manage.py create_julianna_production_data --reset
```

**⚠️ ATTENTION:** Cela supprime TOUTES les données existantes !

## 📋 Vérification

Après correction, vérifier que tout est OK :

```bash
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); admin = User.objects.get(username='julianna_admin'); print(f'is_staff: {admin.is_staff}'); print(f'is_superuser: {admin.is_superuser}'); print(f'role: {admin.role}')"
```

Vous devriez voir :
```
is_staff: True
is_superuser: True
role: admin
```

## 🔑 Connexion

Après correction :
- **URL:** https://appback.centrejulianna.com/admin
- **Username:** julianna_admin
- **Password:** julianna2025

L'admin aura maintenant :
- ✅ Accès à l'interface d'administration Django
- ✅ Accès à tous les modules
- ✅ Permissions de superuser

## 📝 Fichiers Créés

1. **`apps/core/management/commands/fix_admin_permissions.py`** - Management command
2. **`fix_admin.py`** - Script Python standalone
3. **Ce fichier README** - Instructions

## 🆘 En Cas de Problème

Si l'admin n'existe pas du tout :
```bash
python manage.py createsuperuser
```

Puis entrer :
- Username: julianna_admin
- Email: admin@csj.cm
- Password: julianna2025 (taper 2 fois)
