# Guide de Test Complet - ProcureGenius

Guide pour tester le workflow complet avant le lancement commercial.

## Prérequis

### Backend
1. Base de données initialisée
2. Plans d'abonnement créés
3. Serveur Django lancé sur `http://localhost:8000`

```bash
# Créer les plans
python manage.py populate_subscription_plans

# Lancer le serveur
python manage.py runserver
```

### Frontend
1. Dépendances installées
2. Serveur React lancé sur `http://localhost:3000`

```bash
cd frontend
npm install
npm start
```

---

## Test 1: Inscription avec Email/Password ✅

### Objectif
Créer un nouveau compte avec email et mot de passe.

### Étapes
1. Aller sur `http://localhost:3000/register`
2. Remplir le formulaire:
   - Prénom: `Test`
   - Nom: `User`
   - Email: `test@example.com`
   - Organisation: `Test Corp`
   - Mot de passe: `TestPass123`
   - Confirmer mot de passe: `TestPass123`
   - Cocher les conditions d'utilisation
3. Cliquer sur "Créer mon compte gratuit"

### Résultat Attendu
- ✅ Écran de succès affiché
- ✅ Message de confirmation email
- ✅ Redirection vers `/login` après 2 secondes
- ✅ Backend: User + Organization + Free Subscription créés
- ✅ Token généré

### Vérification Backend
```bash
python manage.py shell

from apps.accounts.models import CustomUser, Organization
from apps.subscriptions.models import Subscription

# Vérifier l'utilisateur
user = CustomUser.objects.get(email='test@example.com')
print(f"User: {user.get_full_name()}, Org: {user.organization.name}")

# Vérifier l'abonnement
sub = Subscription.objects.get(organization=user.organization)
print(f"Plan: {sub.plan.name}, Status: {sub.status}")
print(f"Quotas - Factures: {sub.plan.max_invoices_per_month}")
```

---

## Test 2: Connexion avec Email/Password ✅

### Objectif
Se connecter avec le compte créé.

### Étapes
1. Aller sur `http://localhost:3000/login`
2. Entrer:
   - Email: `test@example.com`
   - Mot de passe: `TestPass123`
3. Cliquer sur "Se connecter"

### Résultat Attendu
- ✅ Connexion réussie
- ✅ Token stocké dans localStorage
- ✅ Redirection vers `/dashboard`
- ✅ Interface utilisateur affichée

### Vérification Console Navigateur
```javascript
// Ouvrir DevTools > Console
localStorage.getItem('authToken')
// Doit retourner un token
```

---

## Test 3: Voir la Page Pricing ✅

### Objectif
Vérifier l'affichage des 3 plans tarifaires.

### Étapes
1. Aller sur `http://localhost:3000/pricing`
2. Observer les 3 plans affichés

### Résultat Attendu
- ✅ 3 plans visibles: **Free**, **Standard**, **Premium**
- ✅ Tarification correcte:
  - Free: 0€/mois
  - Standard: 12€/mois, 120€/an (avec badge économie)
  - Premium: 199€/mois, 1900€/an (avec badge économie)
- ✅ Fonctionnalités listées pour chaque plan
- ✅ Badge "Plus populaire" sur Standard
- ✅ Badge "3 jours d'essai gratuit" sur Standard et Premium
- ✅ Toggle Mensuel/Annuel fonctionne
- ✅ Plan actuel indiqué (FREE pour nouveau utilisateur)

---

## Test 4: Vérifier le Statut d'Abonnement ✅

### Objectif
Vérifier que l'API retourne le bon statut d'abonnement.

### Étapes
1. Se connecter en tant que `test@example.com`
2. Ouvrir DevTools > Network
3. Appeler l'API:

```javascript
// Dans la console du navigateur
fetch('/api/v1/subscriptions/status/', {
  headers: {
    'Authorization': 'Token ' + localStorage.getItem('authToken')
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

### Résultat Attendu
```json
{
  "subscription": {
    "plan": {
      "code": "free",
      "name": "Free",
      "price_monthly": 0.00,
      "features": {
        "has_ads": true,
        "has_ai_assistant": false,
        "has_purchase_orders": false,
        ...
      },
      "quotas": {
        "invoices_per_month": 10,
        "clients": 20,
        "products": 50,
        ...
      }
    },
    "status": "active"
  },
  "quotas": {
    "invoices": {
      "can_proceed": true,
      "used": 0,
      "limit": 10,
      "percentage": 0,
      "remaining": 10
    },
    ...
  },
  "features": {
    "has_ads": true,
    "has_ai_assistant": false,
    ...
  }
}
```

---

## Test 5: Tester les Quotas (Plan Free) ✅

### Objectif
Vérifier que les quotas du plan Free sont correctement appliqués.

### Étapes - Via Django Shell
```bash
python manage.py shell

from apps.accounts.models import CustomUser
from apps.subscriptions.quota_service import QuotaService

# Récupérer l'utilisateur
user = CustomUser.objects.get(email='test@example.com')
org = user.organization

# Vérifier les quotas
print("=== QUOTAS FREE PLAN ===")
quotas = QuotaService.get_quota_status(org)
for quota_type, status in quotas.items():
    print(f"{quota_type}: {status['used']}/{status['limit']} ({status['percentage']:.0f}%)")

# Tester l'incrémentation
print("\n=== TEST INCREMENT ===")
QuotaService.increment_usage(org, 'invoices')
invoice_quota = QuotaService.check_quota(org, 'invoices', raise_exception=False)
print(f"Invoices après increment: {invoice_quota['used']}/{invoice_quota['limit']}")

# Vérifier les features
print("\n=== FEATURES ===")
features = QuotaService.get_plan_features(org)
for feature, enabled in features.items():
    print(f"{feature}: {'✓' if enabled else '✗'}")
```

### Résultat Attendu
```
=== QUOTAS FREE PLAN ===
invoices: 0/10 (0%)
clients: 0/20 (0%)
products: 0/50 (0%)
ai_requests: 0/None (N/A)
...

=== TEST INCREMENT ===
Invoices après increment: 1/10

=== FEATURES ===
has_ads: ✓
has_ai_assistant: ✗
has_purchase_orders: ✗
has_suppliers: ✗
has_e_sourcing: ✗
has_contracts: ✗
has_analytics: ✗
```

---

## Test 6: Tester les Devises ✅

### Objectif
Vérifier que le système multi-devises fonctionne.

### Étapes - API
```javascript
// Console navigateur

// 1. Lister toutes les devises
fetch('/api/v1/core/currencies/')
  .then(r => r.json())
  .then(data => {
    console.log(`${data.count} devises disponibles`);
    console.log('FCFA:', data.currencies.find(c => c.code === 'XOF'));
    console.log('EUR:', data.currencies.find(c => c.code === 'EUR'));
    console.log('USD:', data.currencies.find(c => c.code === 'USD'));
  });

// 2. Formater un montant
fetch('/api/v1/core/currencies/format/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1234.56,
    currency: 'XOF'
  })
})
  .then(r => r.json())
  .then(data => console.log('Formaté:', data.formatted));
  // Résultat attendu: "1 235 FCFA"

// 3. Changer devise préférée (authentifié)
fetch('/api/v1/core/user/currency/', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Token ' + localStorage.getItem('authToken')
  },
  body: JSON.stringify({ currency: 'XOF' })
})
  .then(r => r.json())
  .then(data => console.log('Devise mise à jour:', data));
```

### Résultat Attendu
- ✅ 40+ devises listées
- ✅ FCFA (XOF et XAF) présents
- ✅ Formatage correct: `1 235 FCFA` (sans décimales, espace comme séparateur)
- ✅ Devise préférée sauvegardée

---

## Test 7: Changer de Plan (Free → Standard) ✅

### Objectif
Passer du plan Free au plan Standard.

### Étapes - Via API
```javascript
// Console navigateur (authentifié)

fetch('/api/v1/subscriptions/change-plan/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Token ' + localStorage.getItem('authToken')
  },
  body: JSON.stringify({
    new_plan_code: 'standard',
    billing_period: 'monthly',
    immediately: true
  })
})
  .then(r => r.json())
  .then(data => console.log('Plan changé:', data));
```

### Résultat Attendu
```json
{
  "message": "Plan changed from Free to Standard",
  "subscription": {
    "plan": {
      "code": "standard",
      "name": "Standard",
      "price_monthly": 12.00
    },
    "status": "trial",
    "trial_days_remaining": 3
  }
}
```

### Vérification - Nouveaux Quotas
```javascript
fetch('/api/v1/subscriptions/status/', {
  headers: {
    'Authorization': 'Token ' + localStorage.getItem('authToken')
  }
})
  .then(r => r.json())
  .then(data => {
    console.log('Nouveau plan:', data.subscription.plan.name);
    console.log('Quotas factures:', data.quotas.invoices.limit); // 100 au lieu de 10
    console.log('AI disponible:', data.features.has_ai_assistant); // true
    console.log('Publicités:', data.features.has_ads); // false
  });
```

---

## Test 8: Vérifier Période d'Essai ✅

### Objectif
Confirmer que la période d'essai de 3 jours est active.

### Étapes - Django Shell
```bash
python manage.py shell

from apps.accounts.models import CustomUser
from apps.subscriptions.models import Subscription

user = CustomUser.objects.get(email='test@example.com')
sub = Subscription.objects.get(organization=user.organization)

print(f"Status: {sub.status}")
print(f"En essai: {sub.is_trial}")
print(f"Jours restants: {sub.trial_days_remaining}")
print(f"Fin essai: {sub.trial_ends_at}")
```

### Résultat Attendu
```
Status: trial
En essai: True
Jours restants: 3
Fin essai: 2025-11-04 XX:XX:XX (3 jours dans le futur)
```

---

## Test 9: Tester Blocage de Quota ✅

### Objectif
Vérifier que l'utilisateur est bloqué quand il atteint la limite.

### Étapes - Django Shell
```bash
python manage.py shell

from apps.accounts.models import CustomUser
from apps.subscriptions.models import Subscription
from apps.subscriptions.quota_service import QuotaService, QuotaExceededException

user = CustomUser.objects.get(email='test@example.com')
org = user.organization

# Simuler utilisation maximale
sub = Subscription.objects.get(organization=org)
sub.invoices_this_month = sub.plan.max_invoices_per_month
sub.save()

# Tester quota
try:
    QuotaService.check_quota(org, 'invoices', raise_exception=True)
    print("❌ ERREUR: Devrait être bloqué!")
except QuotaExceededException as e:
    print(f"✓ Bloqué correctement: {e.detail}")

# Réinitialiser
sub.invoices_this_month = 0
sub.save()
print("✓ Quota réinitialisé")
```

### Résultat Attendu
```
✓ Bloqué correctement: Vous avez atteint la limite de Factures pour votre plan (100/100)...
✓ Quota réinitialisé
```

---

## Test 10: Google OAuth (Optionnel) 🔄

### Prérequis
- Configurer Google OAuth credentials dans `.env`
- Ajouter callback URL dans Google Console

### Étapes
1. Aller sur `http://localhost:3000/register`
2. Cliquer sur "S'inscrire avec Google"
3. Se connecter avec un compte Google
4. Vérifier création automatique du compte

### Résultat Attendu
- ✅ Redirection vers Google OAuth
- ✅ Authentification Google
- ✅ Compte créé automatiquement
- ✅ Email vérifié automatiquement
- ✅ Connexion automatique
- ✅ Redirection vers dashboard

---

## Test 11: Composant SubscriptionStatus ✅

### Objectif
Vérifier l'affichage du statut d'abonnement dans le dashboard.

### Étapes
1. Ajouter le composant dans une page (temporairement)
2. Observer l'affichage

```jsx
// Dans CustomizableDashboard.jsx
import SubscriptionStatus from '../components/SubscriptionStatus';

// Dans le render
<SubscriptionStatus compact={false} />
```

### Résultat Attendu
- ✅ Plan actuel affiché
- ✅ Badge de statut (trial/active)
- ✅ Jours d'essai restants (si trial)
- ✅ Quotas affichés avec barres de progression
- ✅ Couleurs selon utilisation (vert/orange/rouge)
- ✅ Bouton "Passer au plan supérieur" (sauf Premium)

---

## Checklist Finale

### Backend ✅
- [x] Modèles Subscription créés
- [x] 3 plans créés (Free, Standard, Premium)
- [x] QuotaService fonctionne
- [x] Décorateurs disponibles
- [x] API endpoints subscription fonctionnels
- [x] API endpoints devises fonctionnels
- [x] API endpoints auth fonctionnels
- [x] Django-allauth configuré
- [x] 40+ devises configurées

### Frontend ✅
- [x] Page Pricing affiche 3 plans
- [x] Composant Login avec Google
- [x] Composant Register avec Google
- [x] Hook useSubscription
- [x] Service currencyService
- [x] Service subscriptionAPI
- [x] Composants AdSense créés
- [x] Routes configurées

### Tests ✅
- [ ] Test 1: Inscription email/password
- [ ] Test 2: Connexion email/password
- [ ] Test 3: Affichage pricing
- [ ] Test 4: API subscription status
- [ ] Test 5: Quotas Free plan
- [ ] Test 6: Multi-devises
- [ ] Test 7: Changement de plan
- [ ] Test 8: Période d'essai
- [ ] Test 9: Blocage quota
- [ ] Test 10: Google OAuth (optionnel)
- [ ] Test 11: SubscriptionStatus component

---

## Problèmes Courants

### Erreur: No module named 'jwt'
```bash
pip install PyJWT==2.8.0
pip install cryptography==42.0.5
```

### Erreur: Plans not found
```bash
python manage.py populate_subscription_plans
```

### Erreur: CORS
Vérifier que `CORS_ALLOWED_ORIGINS` inclut `http://localhost:3000`

### Token non trouvé
Vérifier dans DevTools > Application > Local Storage

---

## Prochaines Étapes

1. **Intégration PayPal** (pour vrais paiements)
2. **Email verification** (confirmation email)
3. **Password reset** (récupération mot de passe)
4. **Webhooks PayPal** (automatiser renouvellement)
5. **Tâches cron** (réinitialiser quotas mensuels)
6. **Google AdSense** (obtenir slots IDs et intégrer)
7. **Tests E2E** (Cypress/Playwright)
8. **Déploiement** (production)

---

## Support

En cas de problème, vérifier:
1. Console navigateur (F12)
2. Logs Django (`logs/django.log`)
3. Network tab (requêtes API)
4. Django shell (vérifier données)
