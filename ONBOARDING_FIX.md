# 🔧 Correction du problème d'Onboarding

## Problème identifié

Les nouveaux utilisateurs ne voyaient pas l'écran d'onboarding lors de leur première connexion car les `UserPreferences` n'étaient pas créées correctement avec `onboarding_completed=False`.

## Solutions apportées

### 1. ✅ Backend - Signal corrigé

**Fichier modifié :** `apps/accounts/models.py`

Le signal `create_user_preferences_and_permissions` a été modifié pour explicitement définir `onboarding_completed=False` lors de la création d'un nouveau utilisateur.

```python
UserPreferences.objects.get_or_create(
    user=instance,
    defaults={
        'enabled_modules': default_modules,
        'onboarding_completed': False,  # ✨ Ajouté
        'onboarding_data': {},
        'dashboard_layout': {},
        'notification_settings': {},
    }
)
```

### 2. ✅ Commande de migration pour utilisateurs existants

**Nouveau fichier :** `apps/accounts/management/commands/create_missing_preferences.py`

Une commande Django a été créée pour corriger les utilisateurs existants.

#### Utilisation

```bash
# Créer les UserPreferences manquantes pour les utilisateurs existants
python manage.py create_missing_preferences

# Forcer la réinitialisation de onboarding_completed pour TOUS les utilisateurs
python manage.py create_missing_preferences --force
```

### 3. ✅ Vérification au niveau des vues

Les vues API utilisent déjà `get_or_create` pour les `UserPreferences`, ce qui garantit qu'elles seront créées à la volée si nécessaire :

- `apps/accounts/api_views.py` ligne 27
- `apps/accounts/api_views.py` ligne 77  
- `apps/accounts/views.py` ligne 84

### 4. ✅ Logique frontend

Le système d'onboarding fonctionne ainsi :

1. **À l'inscription** (`Register.jsx`) :
   - Si `response.data.requires_onboarding === true` → redirection vers `/onboarding`

2. **À la connexion** (`LoginEnhanced.jsx`) :
   - Si `user.preferences.onboarding_completed === false` → redirection vers `/onboarding`

3. **Au chargement de l'app** (`App.jsx`) :
   - Vérifie `onboarding_completed` via `/api/v1/accounts/profile/`
   - Si `false` et pas déjà sur `/onboarding` → redirection

## Comment tester

### Pour un nouvel utilisateur

1. Créer un nouveau compte via `/register`
2. Après inscription, vérifier la redirection automatique vers `/onboarding`
3. Compléter l'onboarding
4. Vérifier que `onboarding_completed` passe à `true`

### Pour les utilisateurs existants

1. Exécuter la commande :
   ```bash
   python manage.py create_missing_preferences
   ```

2. Vérifier les logs pour voir combien d'utilisateurs ont été mis à jour

3. Se connecter avec un compte existant
4. L'onboarding devrait s'afficher automatiquement

## Vérification en base de données

```python
# Dans le shell Django
python manage.py shell

from apps.accounts.models import CustomUser, UserPreferences

# Vérifier tous les utilisateurs
for user in CustomUser.objects.all():
    prefs = getattr(user, 'preferences', None)
    if prefs:
        print(f"{user.email}: onboarding_completed = {prefs.onboarding_completed}")
    else:
        print(f"{user.email}: ❌ AUCUNE UserPreferences!")
```

## Fichiers modifiés

- ✅ `apps/accounts/models.py` - Signal corrigé
- ✅ `apps/accounts/signals.py` - Documentation ajoutée
- ✅ `apps/accounts/__init__.py` - Configuration app
- ✅ `apps/accounts/management/commands/create_missing_preferences.py` - Nouvelle commande
- ✅ `apps/accounts/management/__init__.py` - Nouveau fichier
- ✅ `apps/accounts/management/commands/__init__.py` - Nouveau fichier

## Notes importantes

- ⚠️ **Pour les utilisateurs existants** : Vous DEVEZ exécuter la commande `create_missing_preferences` pour qu'ils voient l'onboarding
- ✅ **Pour les nouveaux utilisateurs** : Tout fonctionnera automatiquement grâce au signal corrigé
- 🔄 **Option --force** : Utilisez cette option si vous voulez FORCER tous les utilisateurs à refaire l'onboarding (réinitialise `onboarding_completed` à `False`)

## Prochaines étapes recommandées

1. ✅ Exécuter `python manage.py create_missing_preferences` sur le serveur de production
2. ✅ Tester avec quelques comptes utilisateurs existants
3. ✅ Créer un nouveau compte de test pour vérifier le flux complet
4. ✅ Surveiller les logs pour s'assurer qu'il n'y a pas d'erreurs

---

**Date de correction :** 14 décembre 2025  
**Auteur :** Assistant AI

