# Guide de Migration - Nettoyage ProcureGenius

Ce guide aide les développeurs à comprendre les changements apportés lors du nettoyage et comment adapter leur code.

---

## 🔄 Pour les Développeurs Actuels

### 1. Mise à Jour de Votre Branche Locale

```bash
# Sauvegarder votre travail actuel
git stash

# Récupérer la branche de nettoyage
git checkout cleanup/normalize-migrations-and-code
git pull origin cleanup/normalize-migrations-and-code

# Restaurer votre travail
git stash pop
```

### 2. Base de Données

⚠️ **IMPORTANT** : Les migrations ont été complètement réinitialisées.

**Option A - Nouvelle DB (Recommandé pour développement)** :
```bash
# Supprimer l'ancienne DB
rm db.sqlite3

# Appliquer les nouvelles migrations
python manage.py migrate

# Créer un superuser
python manage.py createsuperuser
```

**Option B - Conserver les données** :
```bash
# Sauvegarder les données
python manage.py dumpdata --natural-foreign --natural-primary > backup.json

# Supprimer et recréer
rm db.sqlite3
python manage.py migrate

# Recharger les données
python manage.py loaddata backup.json
```

### 3. Imports Modifiés

#### ❌ Ancienne Méthode
```python
# Dans consultations/models.py
def _generate_consultation_number(self):
    today = timezone.now().strftime('%Y%m%d')
    prefix = f"CONS-{today}"
    last_consultation = Consultation.objects.filter(
        organization=self.organization,
        consultation_number__startswith=prefix
    ).order_by('-consultation_number').first()
    # ... code dupliqué ...
```

#### ✅ Nouvelle Méthode
```python
from apps.core.services.number_generator import NumberGeneratorService

def _generate_consultation_number(self):
    return NumberGeneratorService.generate_number(
        prefix='CONS',
        organization=self.organization,
        model_class=Consultation,
        field_name='consultation_number'
    )
```

### 4. Signaux

#### ❌ Ancien Emplacement
```python
# Dans apps/accounts/models.py
@receiver(post_save, sender=CustomUser)
def create_user_preferences_and_permissions(...):
    ...
```

#### ✅ Nouvel Emplacement
```python
# Dans apps/accounts/signals.py
@receiver(post_save, sender=User)
def create_user_preferences_and_permissions(...):
    ...
```

**Action Requise** : Aucune si vous utilisez les signaux existants.

### 5. Fichiers Supprimés

Si vous aviez des imports vers des fichiers variant :

#### ❌ Ancien Import
```python
from .models_original import SomeModel
from .views_simple import some_view
```

#### ✅ Nouvel Import
```python
from .models import SomeModel
from .views import some_view
```

---

## 📁 Structure des Fichiers

### Avant
```
apps/consultations/
  ├── models.py
  ├── models_original.py  ❌ Supprimé
  ├── models_simple.py    ❌ Supprimé
  ├── views.py
  ├── views_original.py   ❌ Supprimé
  ├── views_simple.py     ❌ Supprimé
  └── migrations/
      ├── 0001_initial.py
      ├── 0002_...py
      ├── ...
      └── 0010_...py      (10 fichiers)
```

### Après
```
apps/consultations/
  ├── models.py           ✅ Fichier actif unique
  ├── views.py            ✅ Fichier actif unique
  └── migrations/
      ├── 0001_initial.py
      ├── 0002_initial.py
      ├── 0003_initial.py
      └── 0004_initial.py (4 fichiers)
```

---

## 🆕 Nouvelles Fonctionnalités

### 1. NumberGeneratorService

**Emplacement** : `apps/core/services/number_generator.py`

**Usage** :
```python
from apps.core.services.number_generator import NumberGeneratorService

# Pour générer un numéro avec date (PREFIX-YYYYMMDD-XXXX)
number = NumberGeneratorService.generate_number(
    prefix='CONS',           # Préfixe (CONS, RX, LAB, DISP, etc.)
    organization=org,        # Instance Organisation
    model_class=Consultation,# Classe du modèle
    field_name='consultation_number'  # Nom du champ
)
# Résultat: "CONS-20260208-0001"

# Pour générer un numéro patient (PAT-YYYYMM-XXXX)
patient_number = NumberGeneratorService.generate_patient_number(
    organization=org,
    model_class=Client
)
# Résultat: "PAT-202602-0001"
```

**Modèles supportés** :
- `Consultation` : CONS-YYYYMMDD-XXXX
- `Prescription` : RX-YYYYMMDD-XXXX
- `LabOrder` : LAB-YYYYMMDD-XXXX
- `PharmacyDispensing` : DISP-YYYYMMDD-XXXX
- `Client` (patient) : PAT-YYYYMM-XXXX

**Extension** :
```python
# Ajouter votre propre modèle
class MyModel(models.Model):
    my_number = models.CharField(max_length=50, unique=True)
    organization = models.ForeignKey(Organization, ...)

    def save(self, *args, **kwargs):
        if not self.my_number:
            self.my_number = NumberGeneratorService.generate_number(
                prefix='MY',
                organization=self.organization,
                model_class=MyModel,
                field_name='my_number'
            )
        super().save(*args, **kwargs)
```

### 2. Logging Amélioré

#### ❌ Ancien
```python
except Exception as e:
    print(f"Error: {e}")
```

#### ✅ Nouveau
```python
import logging
logger = logging.getLogger(__name__)

try:
    # votre code
except Exception as e:
    logger.error(f"Error: {e}", exc_info=True)
```

**Bénéfices** :
- Stack traces complètes avec `exc_info=True`
- Logs structurés dans les fichiers
- Possibilité de filtrage par niveau (DEBUG, INFO, WARNING, ERROR)

---

## 🚨 Points d'Attention

### 1. Migrations

⚠️ **NE PAS** créer de nouvelles migrations sans vérifier l'état actuel :

```bash
# Toujours vérifier d'abord
python manage.py showmigrations

# Puis créer si nécessaire
python manage.py makemigrations
```

### 2. Conflits de Merge

Si vous avez des branches en cours :

```bash
# Mettre à jour votre branche
git checkout your-feature-branch
git rebase cleanup/normalize-migrations-and-code

# Résoudre les conflits (surtout dans migrations/)
# Supprimer les anciennes migrations si conflit
# Garder les nouvelles migrations (0001_initial.py, etc.)
```

### 3. Tests

Après mise à jour, exécuter :

```bash
# Check Django
python manage.py check

# Vérifier migrations
python manage.py showmigrations

# Tester le serveur
python manage.py runserver
```

---

## 📊 Checklist de Migration

- [ ] Sauvegarder données existantes (`dumpdata`)
- [ ] Récupérer branche `cleanup/normalize-migrations-and-code`
- [ ] Supprimer ancienne DB
- [ ] Appliquer nouvelles migrations (`migrate`)
- [ ] Créer superuser
- [ ] Vérifier imports dans votre code
- [ ] Mettre à jour références vers fichiers variant
- [ ] Exécuter `python manage.py check`
- [ ] Tester le serveur
- [ ] Recharger données si nécessaire (`loaddata`)

---

## 🆘 Aide et Support

### Problèmes Courants

**1. "No such table" lors du runserver**
```bash
# Solution : Recréer la DB
rm db.sqlite3
python manage.py migrate
```

**2. "Module not found" pour imports**
```bash
# Vérifier que vous utilisez les bons imports
# Remplacer *_original ou *_simple par le fichier de base
```

**3. Conflits de migrations**
```bash
# Supprimer vos migrations locales conflictuelles
rm apps/myapp/migrations/00*.py  # Garder __init__.py
git checkout cleanup/normalize-migrations-and-code -- apps/myapp/migrations/
```

**4. Signaux ne fonctionnent pas**
```bash
# Vérifier que apps.py importe les signaux
# Dans apps/accounts/apps.py :
def ready(self):
    import apps.accounts.signals
```

---

## 📝 Changements à Connaître

### Fichiers Créés
- `apps/core/services/__init__.py`
- `apps/core/services/number_generator.py`
- `CLEANUP_SUMMARY.md`
- `MIGRATION_GUIDE.md`

### Fichiers Modifiés
- `apps/consultations/models.py` - Utilise NumberGeneratorService
- `apps/pharmacy/models.py` - Utilise NumberGeneratorService
- `apps/laboratory/models.py` - Utilise NumberGeneratorService
- `apps/accounts/models.py` - Signaux déplacés, patient_number amélioré
- `apps/accounts/signals.py` - Tous les signaux consolidés ici
- `apps/consultations/api.py` - Logging amélioré
- `apps/accounts/views.py` - Imports nettoyés
- `apps/core/urls.py` - Import mis à jour
- `apps/invoicing/views.py` - Import mis à jour
- `.gitignore` - Patterns mis à jour

### Fichiers Supprimés (exemples)
- Tous les `*_original.py` (69 fichiers)
- Tous les `*_simple.py` (69 fichiers)
- Fichiers temporaires : `test_*.py`, `diagnostic_*.sh`, etc.
- Archives : `*.zip` dans frontend
- Documentation dupliquée
- 92 anciennes migrations

---

## 💡 Bonnes Pratiques

### 1. Génération de Numéros
```python
# ✅ FAIRE
number = NumberGeneratorService.generate_number(...)

# ❌ NE PAS FAIRE
today = timezone.now().strftime('%Y%m%d')
prefix = f"CONS-{today}"
# ... code dupliqué ...
```

### 2. Gestion d'Erreurs
```python
# ✅ FAIRE
import logging
logger = logging.getLogger(__name__)

try:
    dangerous_operation()
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)

# ❌ NE PAS FAIRE
try:
    dangerous_operation()
except Exception as e:
    print(f"Error: {e}")
```

### 3. Signaux
```python
# ✅ FAIRE
# Placer dans signals.py
@receiver(post_save, sender=MyModel)
def my_signal(sender, instance, created, **kwargs):
    ...

# Dans apps.py
def ready(self):
    import myapp.signals

# ❌ NE PAS FAIRE
# Placer dans models.py (sauf si très simple)
```

### 4. Imports
```python
# ✅ FAIRE
from .models import MyModel
from .views import my_view

# ❌ NE PAS FAIRE
from .models_original import MyModel
from .views_simple import my_view
```

---

**Questions ?** Consultez `CLEANUP_SUMMARY.md` pour plus de détails sur les changements effectués.
