# 📋 Résumé des Corrections - 14 décembre 2025

## 🎯 Deux problèmes corrigés

### 1️⃣ Problème d'impression : Mauvais nom d'entreprise (header_company_name vs company_name)

**Symptôme :** 
Les impressions (factures, bons de commande) affichaient "ProcureGenius" au lieu de "Herve tomi kouanga" (le vrai nom de l'entreprise).

**Cause racine :**
Le système utilisait `PrintTemplate.header_company_name` en priorité au lieu de `OrganizationSettings.company_name`.

**Solution :**
Inversé la priorité dans tous les générateurs PDF pour utiliser `OrganizationSettings` en premier.

#### Fichiers modifiés :
- ✅ `apps/invoicing/views_pdf.py`
- ✅ `apps/api/services/pdf_generator_weasy.py`
- ✅ `apps/api/services/pdf_generator.py`
- ✅ `apps/core/views_admin.py`
- ✅ `templates/admin/settings.html`

**Résultat :**
Tous les PDF (factures, bons de commande, tous les templates) affichent maintenant le bon nom d'entreprise depuis `OrganizationSettings`.

---

### 2️⃣ Problème d'onboarding : Pas d'affichage pour nouveaux utilisateurs

**Symptôme :**
Quand un nouvel utilisateur s'inscrit, l'écran d'onboarding ne s'affiche pas pour les premières configurations.

**Cause racine :**
Le signal qui crée automatiquement `UserPreferences` ne définissait pas explicitement `onboarding_completed=False`.

**Solution :**
1. Modifié le signal dans `models.py` pour créer explicitement `onboarding_completed=False`
2. Créé une commande Django pour corriger les utilisateurs existants

#### Fichiers modifiés :
- ✅ `apps/accounts/models.py` - Signal corrigé
- ✅ `apps/accounts/signals.py` - Documentation améliorée
- ✅ `apps/accounts/__init__.py` - Configuration app
- ✅ `apps/accounts/management/commands/create_missing_preferences.py` - Nouvelle commande
- ✅ `apps/accounts/management/__init__.py` - Nouveau fichier
- ✅ `apps/accounts/management/commands/__init__.py` - Nouveau fichier

**Résultat :**
- Les **nouveaux utilisateurs** verront automatiquement l'onboarding
- Les **utilisateurs existants** peuvent être corrigés avec la commande Django

---

## 🚀 Actions à effectuer IMMÉDIATEMENT

### 1. Pour corriger les utilisateurs existants

```bash
# Depuis le répertoire du projet
python manage.py create_missing_preferences
```

Cette commande va :
- ✅ Créer les `UserPreferences` manquantes
- ✅ Définir `onboarding_completed = False` pour tous
- ✅ Afficher un résumé des utilisateurs corrigés

### 2. Tester avec un nouvel utilisateur

1. Créer un nouveau compte via `/register`
2. Vérifier que l'onboarding s'affiche automatiquement
3. Compléter les 3 étapes :
   - Informations entreprise
   - Paramètres fiscaux
   - Sélection des modules
4. Vérifier la redirection vers le dashboard

### 3. Tester l'impression

1. Se connecter avec votre compte
2. Créer/ouvrir une facture ou un bon de commande
3. Générer le PDF
4. Vérifier que le nom "Herve tomi kouanga" s'affiche (pas "ProcureGenius")

---

## 📊 Vérifications recommandées

### Vérifier les UserPreferences en base de données

```bash
python manage.py shell
```

```python
from apps.accounts.models import CustomUser

# Afficher le statut onboarding de tous les utilisateurs
for user in CustomUser.objects.all():
    prefs = getattr(user, 'preferences', None)
    if prefs:
        status = "✅" if prefs.onboarding_completed else "🔄 À faire"
        print(f"{status} {user.email}: onboarding_completed = {prefs.onboarding_completed}")
    else:
        print(f"❌ {user.email}: AUCUNE UserPreferences!")
```

### Vérifier les paramètres d'organisation

```python
from apps.core.models import OrganizationSettings

# Afficher toutes les organisations et leurs noms
for org_settings in OrganizationSettings.objects.all():
    print(f"Organisation: {org_settings.organization.name}")
    print(f"  company_name: '{org_settings.company_name}'")
    print(f"  company_address: '{org_settings.company_address}'")
    print(f"  company_phone: '{org_settings.company_phone}'")
    print()
```

---

## 🔍 Tests de régression recommandés

### Tests d'impression
- [ ] Facture - Template Classic
- [ ] Facture - Template Modern
- [ ] Facture - Template Minimal
- [ ] Facture - Template Professional
- [ ] Facture - Template Thermal
- [ ] Bon de commande - Template Classic
- [ ] Bon de commande - Template Modern
- [ ] Bon de commande - Template Minimal
- [ ] Bon de commande - Template Professional

### Tests d'onboarding
- [ ] Inscription nouvel utilisateur via email/password
- [ ] Inscription nouvel utilisateur via Google OAuth
- [ ] Onboarding - Étape 1 : Informations entreprise
- [ ] Onboarding - Étape 2 : Paramètres fiscaux
- [ ] Onboarding - Étape 3 : Sélection des modules
- [ ] Onboarding - Étape 4 : Terminé et redirection

### Tests paramètres
- [ ] Modifier le nom d'entreprise dans Settings
- [ ] Vérifier que le changement apparaît dans les PDFs
- [ ] Vérifier que le logo s'affiche correctement
- [ ] Vérifier les identifiants fiscaux (NIU, RC, etc.)

---

## 📦 Déploiement en production

### Étapes à suivre

1. **Backup de la base de données**
   ```bash
   python manage.py dumpdata > backup_avant_correction.json
   ```

2. **Déployer les changements**
   ```bash
   git pull origin main
   # ou selon votre workflow de déploiement
   ```

3. **Redémarrer le serveur Django**
   ```bash
   # Selon votre configuration (gunicorn, uwsgi, etc.)
   systemctl restart gunicorn
   # ou
   systemctl restart uwsgi
   ```

4. **Exécuter la commande de migration**
   ```bash
   python manage.py create_missing_preferences
   ```

5. **Vérifier les logs**
   ```bash
   tail -f /var/log/procuregenius/django.log
   # ou selon votre configuration
   ```

---

## 🐛 Dépannage

### Si l'onboarding ne s'affiche toujours pas

1. Vérifier que les signaux sont bien chargés :
   ```python
   # Dans manage.py shell
   from django.apps import apps
   print(apps.get_app_config('accounts').ready)
   ```

2. Forcer la réinitialisation pour un utilisateur spécifique :
   ```python
   from apps.accounts.models import CustomUser, UserPreferences
   
   user = CustomUser.objects.get(email='user@example.com')
   prefs = UserPreferences.objects.get(user=user)
   prefs.onboarding_completed = False
   prefs.save()
   ```

3. Exécuter la commande avec --force :
   ```bash
   python manage.py create_missing_preferences --force
   ```

### Si le mauvais nom s'affiche toujours dans les PDFs

1. Vérifier les valeurs en base de données :
   ```python
   from apps.core.models import OrganizationSettings
   from apps.invoicing.models import PrintTemplate
   
   org_settings = OrganizationSettings.objects.first()
   print(f"OrganizationSettings.company_name: {org_settings.company_name}")
   
   template = PrintTemplate.objects.filter(is_default=True).first()
   if template:
       print(f"PrintTemplate.header_company_name: {template.header_company_name}")
   ```

2. Vider le cache (si activé) :
   ```python
   from django.core.cache import cache
   cache.clear()
   ```

---

## 📚 Documentation détaillée

- **Problème d'impression :** Voir changements dans les fichiers PDF
- **Problème d'onboarding :** Lire `ONBOARDING_FIX.md` pour plus de détails

---

## ✅ Checklist finale

- [ ] Commande `create_missing_preferences` exécutée
- [ ] Tests d'impression validés
- [ ] Tests d'onboarding validés
- [ ] Logs vérifiés (pas d'erreurs)
- [ ] Backup créé avant déploiement
- [ ] Déploiement en production effectué
- [ ] Utilisateurs informés des changements

---

**Date :** 14 décembre 2025  
**Statut :** ✅ Corrections complètes  
**À faire :** Exécuter la commande de migration et tester

