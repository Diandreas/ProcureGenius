# Subscription API Documentation

Complete API documentation for managing subscriptions in ProcureGenius.

## Base URL

All endpoints are prefixed with: `/api/v1/subscriptions/`

## Authentication

Most endpoints require authentication via Token or Session. Public endpoints are marked as **[PUBLIC]**.

## Endpoints

### 1. List Subscription Plans **[PUBLIC]**

Get all available subscription plans.

```
GET /api/v1/subscriptions/plans/
```

**Authentication:** Not required

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "code": "free",
      "name": "Free",
      "description": "Plan gratuit avec publicités...",
      "price_monthly": 0.00,
      "price_yearly": 0.00,
      "currency": "EUR",
      "trial_days": 0,
      "features": {
        "has_ads": true,
        "has_ai_assistant": false,
        "has_purchase_orders": false,
        "has_suppliers": false,
        "has_e_sourcing": false,
        "has_contracts": false,
        "has_analytics": false
      },
      "quotas": {
        "invoices_per_month": 10,
        "clients": 20,
        "products": 50,
        "purchase_orders_per_month": null,
        "suppliers": null,
        "storage_mb": 100,
        "ai_requests_per_month": null
      },
      "savings_yearly": null
    },
    {
      "id": "uuid",
      "code": "standard",
      "name": "Standard",
      "description": "Plan professionnel pour PME...",
      "price_monthly": 12.00,
      "price_yearly": 120.00,
      "currency": "EUR",
      "trial_days": 3,
      "features": {
        "has_ads": false,
        "has_ai_assistant": true,
        "has_purchase_orders": true,
        "has_suppliers": true,
        "has_e_sourcing": false,
        "has_contracts": false,
        "has_analytics": false
      },
      "quotas": {
        "invoices_per_month": 100,
        "clients": 100,
        "products": 500,
        "purchase_orders_per_month": 50,
        "suppliers": 50,
        "storage_mb": 2048,
        "ai_requests_per_month": 50
      },
      "savings_yearly": {
        "amount": 24.00,
        "percentage": 16.7
      }
    }
  ]
}
```

---

### 2. Get Subscription Status

Get complete subscription status including quotas and features.

```
GET /api/v1/subscriptions/status/
```

**Authentication:** Required

**Response:**
```json
{
  "subscription": {
    "id": "uuid",
    "plan": {
      "id": "uuid",
      "code": "standard",
      "name": "Standard",
      ...
    },
    "status": "active",
    "billing_period": "monthly",
    "started_at": "2025-01-01T00:00:00Z",
    "trial_ends_at": null,
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "cancelled_at": null,
    "payment_method": "paypal",
    "paypal_subscription_id": "I-XXX...",
    "is_trial": false,
    "trial_days_remaining": 0,
    "is_active_or_trial": true,
    "invoices_this_month": 15,
    "purchase_orders_this_month": 5,
    "ai_requests_this_month": 12
  },
  "quotas": {
    "invoices": {
      "can_proceed": true,
      "used": 15,
      "limit": 100,
      "percentage": 15.0,
      "remaining": 85
    },
    "ai_requests": {
      "can_proceed": true,
      "used": 12,
      "limit": 50,
      "percentage": 24.0,
      "remaining": 38
    },
    ...
  },
  "features": {
    "has_ads": false,
    "has_ai_assistant": true,
    "has_purchase_orders": true,
    "has_suppliers": true,
    "has_e_sourcing": false,
    "has_contracts": false,
    "has_analytics": false
  },
  "warnings": []  // Empty if no quotas > 80%
}
```

---

### 3. Get Quota Status Only

Lighter endpoint that only returns quota information.

```
GET /api/v1/subscriptions/quotas/
```

**Authentication:** Required

**Response:**
```json
{
  "quotas": {
    "invoices": {
      "can_proceed": true,
      "used": 15,
      "limit": 100,
      "percentage": 15.0,
      "remaining": 85
    },
    "purchase_orders": {
      "can_proceed": true,
      "used": 5,
      "limit": 50,
      "percentage": 10.0,
      "remaining": 45
    },
    "ai_requests": {
      "can_proceed": true,
      "used": 12,
      "limit": 50,
      "percentage": 24.0,
      "remaining": 38
    },
    "clients": {
      "can_proceed": true,
      "used": 8,
      "limit": 100,
      "percentage": 8.0,
      "remaining": 92
    },
    "suppliers": {
      "can_proceed": true,
      "used": 3,
      "limit": 50,
      "percentage": 6.0,
      "remaining": 47
    },
    "products": {
      "can_proceed": true,
      "used": 42,
      "limit": 500,
      "percentage": 8.4,
      "remaining": 458
    }
  }
}
```

---

### 4. Subscribe to a Plan

Create a new subscription (for organizations without an active subscription).

```
POST /api/v1/subscriptions/subscribe/
```

**Authentication:** Required

**Request Body:**
```json
{
  "plan_code": "standard",
  "billing_period": "monthly",  // "monthly" or "yearly"
  "payment_method": "paypal",  // "paypal", "credit_card", "bank_transfer", "manual"
  "paypal_subscription_id": "I-XXX..."  // Optional, for PayPal subscriptions
}
```

**Response (201 Created):**
```json
{
  "message": "Subscription created successfully",
  "subscription": {
    "id": "uuid",
    "plan": {...},
    "status": "trial",
    "billing_period": "monthly",
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request` - If organization already has a subscription
- `400 Bad Request` - Invalid plan code
- `400 Bad Request` - Validation errors

---

### 5. Change Subscription Plan

Change to a different plan (upgrade or downgrade).

```
POST /api/v1/subscriptions/change-plan/
```

**Authentication:** Required

**Request Body:**
```json
{
  "new_plan_code": "premium",
  "billing_period": "yearly",  // Optional, change billing period
  "immediately": false  // If true, changes immediately. If false, at end of current period
}
```

**Response (200 OK):**
```json
{
  "message": "Plan changed from Standard to Premium",
  "subscription": {
    "id": "uuid",
    "plan": {...},
    "status": "active",
    ...
  }
}
```

**Error Responses:**
- `404 Not Found` - No active subscription
- `400 Bad Request` - Invalid plan code
- `400 Bad Request` - Already on this plan

---

### 6. Cancel Subscription

Cancel an active subscription.

```
POST /api/v1/subscriptions/cancel/
```

**Authentication:** Required

**Request Body:**
```json
{
  "immediately": false,  // If true, cancels immediately. If false, at end of period
  "reason": "Too expensive"  // Optional cancellation reason
}
```

**Response (200 OK):**
```json
{
  "message": "Subscription cancelled successfully",
  "cancelled_at": "2025-01-15T10:30:00Z",
  "ends_at": "2025-02-01T00:00:00Z"  // When subscription actually ends
}
```

**Error Responses:**
- `404 Not Found` - No active subscription

---

### 7. Get Payment History

Get payment history for the organization.

```
GET /api/v1/subscriptions/payments/
```

**Authentication:** Required

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "subscription_info": {
        "organization_name": "ACME Corp",
        "plan_name": "Standard"
      },
      "amount": 12.00,
      "currency": "EUR",
      "status": "success",
      "payment_method": "paypal",
      "transaction_id": "TXN-123456",
      "paypal_order_id": "ORDER-ABC123",
      "period_start": "2025-01-01T00:00:00Z",
      "period_end": "2025-02-01T00:00:00Z",
      "created_at": "2025-01-01T10:00:00Z",
      "notes": ""
    },
    ...
  ]
}
```

---

### 8. Check Feature Access

Check if organization has access to a specific feature.

```
GET /api/v1/subscriptions/features/<feature_name>/
```

**Authentication:** Required

**Available Features:**
- `ai_assistant`
- `purchase_orders`
- `suppliers`
- `e_sourcing`
- `contracts`
- `analytics`

**Example:**
```
GET /api/v1/subscriptions/features/ai_assistant/
```

**Response:**
```json
{
  "feature": "ai_assistant",
  "has_access": true
}
```

---

## Error Codes

### 400 Bad Request
Validation errors or business logic violations.

```json
{
  "error": "Organization already has an active subscription"
}
```

### 401 Unauthorized
Authentication required.

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 402 Payment Required
Quota exceeded or feature not available in plan.

```json
{
  "error": "Vous avez atteint la limite de Factures pour votre plan (10/10)...",
  "code": "quota_exceeded",
  "quota_type": "invoices"
}
```

### 404 Not Found
Subscription not found.

```json
{
  "error": "No active subscription found"
}
```

---

## Usage Examples

### JavaScript/React

```javascript
// Get subscription status
const response = await fetch('/api/v1/subscriptions/status/', {
  headers: {
    'Authorization': `Token ${authToken}`,
  }
});
const data = await response.json();

// Check if can create invoice
if (data.quotas.invoices.can_proceed) {
  // Create invoice
} else {
  // Show upgrade prompt
  alert(`You've used ${data.quotas.invoices.used}/${data.quotas.invoices.limit} invoices`);
}

// Subscribe to a plan
const subscribeResponse = await fetch('/api/v1/subscriptions/subscribe/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${authToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    plan_code: 'standard',
    billing_period: 'monthly',
    payment_method: 'paypal',
    paypal_subscription_id: paypalSubId,
  })
});

// Change plan
const changeResponse = await fetch('/api/v1/subscriptions/change-plan/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${authToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    new_plan_code: 'premium',
    immediately: true,
  })
});
```

### Python

```python
import requests

# Get plans (public)
response = requests.get('http://localhost:8000/api/v1/subscriptions/plans/')
plans = response.json()['plans']

# Get subscription status
response = requests.get(
    'http://localhost:8000/api/v1/subscriptions/status/',
    headers={'Authorization': f'Token {auth_token}'}
)
subscription_data = response.json()

# Check quota
quota = subscription_data['quotas']['invoices']
if quota['can_proceed']:
    print(f"You can create {quota['remaining']} more invoices")
else:
    print(f"Quota exceeded: {quota['used']}/{quota['limit']}")

# Check feature
response = requests.get(
    'http://localhost:8000/api/v1/subscriptions/features/ai_assistant/',
    headers={'Authorization': f'Token {auth_token}'}
)
has_ai = response.json()['has_access']
```

---

## Frontend Integration Tips

### 1. Display Quota Warnings

```javascript
// Show warning when quota > 80%
{subscription?.quotas?.invoices?.percentage > 80 && (
  <Alert severity="warning">
    You've used {subscription.quotas.invoices.used} of {subscription.quotas.invoices.limit} invoices.
    <Button onClick={upgradePlan}>Upgrade Plan</Button>
  </Alert>
)}
```

### 2. Conditional Feature Display

```javascript
// Only show AI button if plan includes it
{subscription?.features?.has_ai_assistant && (
  <Button onClick={openAIChat}>
    Ask AI Assistant
  </Button>
)}
```

### 3. Show Ads for Free Plan

```javascript
// Show Google AdSense ads for free plan
{subscription?.features?.has_ads && (
  <AdSenseComponent adSlot="123456789" />
)}
```

### 4. Display Trial Information

```javascript
// Show trial countdown
{subscription?.is_trial && (
  <Alert severity="info">
    You have {subscription.trial_days_remaining} days left in your trial.
    <Button onClick={subscribe}>Subscribe Now</Button>
  </Alert>
)}
```

---

## Testing

### Using cURL

```bash
# Get plans
curl http://localhost:8000/api/v1/subscriptions/plans/

# Get subscription status (with auth)
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/v1/subscriptions/status/

# Subscribe to standard plan
curl -X POST \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_code": "standard", "billing_period": "monthly", "payment_method": "paypal"}' \
  http://localhost:8000/api/v1/subscriptions/subscribe/
```

### Using Django Shell

```python
python manage.py shell

from apps.subscriptions.models import SubscriptionPlan, Subscription
from apps.accounts.models import Organization
from apps.subscriptions.quota_service import QuotaService

# Get plan
standard_plan = SubscriptionPlan.objects.get(code='standard')

# Create subscription
org = Organization.objects.first()
subscription = Subscription.objects.create(
    organization=org,
    plan=standard_plan,
    billing_period='monthly',
)

# Check quota
QuotaService.check_quota(org, 'invoices')

# Increment usage
QuotaService.increment_usage(org, 'invoices')
```
