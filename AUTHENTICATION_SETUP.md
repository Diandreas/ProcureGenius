# ✅ Configuration Django-Allauth - TERMINÉE

## Ce qui a été fait

### 1. Installation et configuration de base

✅ **django-allauth** activé dans `settings.py` :
- `allauth`
- `allauth.account`
- `allauth.socialaccount`
- `allauth.socialaccount.providers.google`
- `django.contrib.sites` ajouté

✅ **Middleware** ajouté :
- `allauth.account.middleware.AccountMiddleware`

✅ **Authentication backends** configurés :
```python
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Email/password classique
    'allauth.account.auth_backends.AuthenticationBackend',  # Google OAuth
]
```

### 2. Configuration allauth

✅ Dans `settings.py` (lignes 306-363) :
- **SITE_ID = 1**
- **ACCOUNT_AUTHENTICATION_METHOD = 'email'** (utiliser email au lieu de username)
- **ACCOUNT_EMAIL_REQUIRED = True**
- **ACCOUNT_USERNAME_REQUIRED = False**
- **ACCOUNT_EMAIL_VERIFICATION = 'mandatory'** (confirmation email obligatoire)
- **ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3**
- **LOGIN_REDIRECT_URL = '/dashboard'**
- **SOCIALACCOUNT_AUTO_SIGNUP = True** (auto-signup pour Google)

### 3. Configuration Google OAuth

✅ Provider Google configuré dans `SOCIALACCOUNT_PROVIDERS` :
```python
'google': {
    'SCOPE': ['profile', 'email'],
    'APP': {
        'client_id': os.getenv('GOOGLE_OAUTH_CLIENT_ID', ''),
        'secret': os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', ''),
    }
}
```

### 4. Adapters personnalisés

✅ Créé `apps/accounts/adapters.py` avec :
- **CustomAccountAdapter** : Gère l'inscription email/password
- **CustomSocialAccountAdapter** : Gère l'inscription via Google
  - Auto-création de UserPreferences (via signal)
  - Auto-liaison compte existant avec même email
  - Remplissage automatique prénom/nom depuis Google

### 5. Modèle CustomUser

✅ Ajouté champ `email_verified` :
```python
email_verified = models.BooleanField(
    default=False,
    verbose_name=_("Email vérifié")
)
```

### 6. URLs

✅ Configuré dans `saas_procurement/urls.py` :
```python
path('api/accounts/', include('apps.accounts.urls')),  # API custom
path('accounts/', include('allauth.urls')),  # django-allauth
```

### 7. Migrations

✅ Migrations créées et appliquées :
- Migration `0009_add_email_verified_field` pour le champ email_verified
- Migrations allauth (account, socialaccount, sites)

### 8. Variables d'environnement

✅ Ajouté dans `.env.example` :
```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-secret
GOOGLE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```

## Prochaines étapes (Frontend)

### À faire :

1. **Créer page Register.jsx** avec :
   - Formulaire email/password
   - Bouton "Sign in with Google"

2. **Créer page Login.jsx** avec :
   - Formulaire email/password
   - Bouton "Sign in with Google"

3. **Créer page VerifyEmail.jsx** :
   - Message de confirmation
   - Resend verification email

4. **Intégrer Google Sign-In SDK** dans React

## Configuration Google OAuth à faire

### Étapes pour obtenir Client ID et Secret :

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet "ProcureGenius"
3. Activer **Google+ API**
4. Aller dans **Credentials**
5. Créer **OAuth 2.0 Client ID**
6. Ajouter dans **Authorized redirect URIs** :
   - `http://localhost:8000/accounts/google/login/callback/` (dev)
   - `https://votre-domaine.com/accounts/google/login/callback/` (prod)
7. Copier **Client ID** et **Client Secret** dans `.env`

## Configuration Site Django

Dans Django Admin, aller à **Sites** et créer/modifier :
- Domain name: `localhost:8000` (dev) ou `votre-domaine.com` (prod)
- Display name: ProcureGenius

## URLs disponibles

### Authentification classique :
- **Signup** : `/accounts/signup/`
- **Login** : `/accounts/login/`
- **Logout** : `/accounts/logout/`
- **Password reset** : `/accounts/password/reset/`
- **Email confirmation** : `/accounts/confirm-email/<key>/`

### Google OAuth :
- **Login Google** : `/accounts/google/login/`
- **Callback Google** : `/accounts/google/login/callback/`

## Notes importantes

### Warnings dépréciés (à corriger plus tard) :
Les settings suivants sont dépréciés dans allauth 0.57 :
- `ACCOUNT_AUTHENTICATION_METHOD` → `ACCOUNT_LOGIN_METHODS`
- `ACCOUNT_EMAIL_REQUIRED` → `ACCOUNT_SIGNUP_FIELDS`
- `ACCOUNT_LOGIN_ATTEMPTS_LIMIT` → `ACCOUNT_RATE_LIMITS`
- `ACCOUNT_SIGNUP_EMAIL_ENTER_TWICE` → `ACCOUNT_SIGNUP_FIELDS`
- `ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE` → `ACCOUNT_SIGNUP_FIELDS`
- `ACCOUNT_USERNAME_REQUIRED` → `ACCOUNT_SIGNUP_FIELDS`

**Action** : Les corriger lors d'une mise à jour future (fonctionnel pour l'instant)

### Sécurité :
- Les emails de confirmation expirent après 3 jours
- Max 5 tentatives de login avant timeout de 5 minutes
- Vérification email obligatoire avant accès complet

## Résumé

✅ **Authentification double** : Email/Password + Google OAuth
✅ **Confirmation email** : Obligatoire
✅ **Auto-création** : UserPreferences créées automatiquement
✅ **Migrations** : Toutes appliquées
✅ **Documentation** : .env.example mis à jour

**Statut** : Backend 100% prêt ✅
**Prochain** : Frontend React (Register/Login) + Modèles Subscription
