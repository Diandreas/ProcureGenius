# Quota Service - Usage Guide

This guide shows how to use the quota system to enforce subscription limits in ProcureGenius.

## Quick Start

### 1. Check Quota Before Creating an Invoice

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from apps.subscriptions.decorators import require_quota

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_quota('invoices')  # Automatically checks quota and increments on success
def create_invoice(request):
    # This code only runs if quota allows
    # Quota is automatically incremented after successful creation
    invoice = Invoice.objects.create(...)
    return Response(InvoiceSerializer(invoice).data)
```

### 2. Check Feature Access (e.g., AI Assistant)

```python
from apps.subscriptions.decorators import require_feature

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_feature('ai_assistant')  # Only users with AI in their plan can access
def ai_chat(request):
    # This code only runs if user's plan includes AI
    response = call_ai_api(...)
    return Response({'response': response})
```

### 3. Manual Quota Check

```python
from apps.subscriptions.quota_service import QuotaService, QuotaExceededException

def my_view(request):
    organization = request.user.organization

    try:
        # Check quota manually
        quota_status = QuotaService.check_quota(organization, 'purchase_orders')
        # quota_status = {
        #     'can_proceed': True,
        #     'used': 25,
        #     'limit': 50,
        #     'percentage': 50.0,
        #     'remaining': 25
        # }

        # Create purchase order
        po = PurchaseOrder.objects.create(...)

        # Manually increment usage
        QuotaService.increment_usage(organization, 'purchase_orders')

        return Response({'success': True})

    except QuotaExceededException as e:
        return Response({'error': str(e)}, status=402)
```

## Available Quota Types

- `invoices` - Factures (monthly limit)
- `purchase_orders` - Bons de commande (monthly limit)
- `ai_requests` - Requêtes IA (monthly limit)
- `clients` - Clients (total limit)
- `suppliers` - Fournisseurs (total limit)
- `products` - Produits (total limit)

## Available Features

- `ai_assistant` - Assistant IA
- `purchase_orders` - Bons de commande
- `suppliers` - Fournisseurs
- `e_sourcing` - E-Sourcing module
- `contracts` - Contrats module
- `analytics` - Analytics avancés

## Decorators

### @require_quota(quota_type)

Checks quota before executing view. Auto-increments usage on successful POST/PUT requests (2xx status).

```python
@require_quota('invoices')
def create_invoice(request):
    ...
```

**When to use**: For creating resources with monthly limits (invoices, purchase orders, AI requests)

### @require_feature(feature_name)

Checks if user's plan includes a feature. Blocks access with 402 Payment Required if not available.

```python
@require_feature('e_sourcing')
def e_sourcing_dashboard(request):
    ...
```

**When to use**: For premium features (AI, E-Sourcing, Contracts, Analytics)

### @track_usage(quota_type)

Tracks usage without blocking. Always allows action but increments counter.

```python
@track_usage('ai_requests')
def ai_generate(request):
    # Always executes, just tracks usage
    ...
```

**When to use**: For soft tracking without enforcement

### @check_quota_middleware(quota_type)

Checks quota but doesn't auto-increment. Useful when you need manual control.

```python
@check_quota_middleware('invoices')
def batch_create_invoices(request):
    invoices = request.data.get('invoices', [])
    for invoice_data in invoices:
        # Create invoice...
        # Manually increment for each
        QuotaService.increment_usage(request.user.organization, 'invoices')
    ...
```

**When to use**: Batch operations, complex workflows

## Class-Based Views

### QuotaMixin

```python
from apps.subscriptions.decorators import QuotaMixin

class InvoiceCreateView(QuotaMixin, APIView):
    quota_type = 'invoices'

    def post(self, request):
        # Quota already checked
        ...
```

### FeatureMixin

```python
from apps.subscriptions.decorators import FeatureMixin

class AIAssistantView(FeatureMixin, APIView):
    required_feature = 'ai_assistant'

    def post(self, request):
        # Feature access already checked
        ...
```

## QuotaService Methods

### QuotaService.check_quota(organization, quota_type, raise_exception=True)

Returns quota status dict:
```python
{
    'can_proceed': True/False,
    'used': 25,
    'limit': 100,  # or -1 for unlimited, None for not available
    'percentage': 25.0,
    'remaining': 75
}
```

### QuotaService.increment_usage(organization, quota_type)

Increments usage counter for monthly quotas (invoices, purchase_orders, ai_requests).

### QuotaService.get_quota_status(organization)

Returns status of ALL quotas at once:
```python
{
    'invoices': {'can_proceed': True, 'used': 5, 'limit': 10, ...},
    'ai_requests': {'can_proceed': True, 'used': 12, 'limit': 50, ...},
    ...
}
```

### QuotaService.check_feature_access(organization, feature_name)

Returns True/False if organization has access to feature.

### QuotaService.get_plan_features(organization)

Returns all feature flags:
```python
{
    'has_ads': False,
    'has_ai_assistant': True,
    'has_purchase_orders': True,
    'has_suppliers': True,
    'has_e_sourcing': False,
    'has_contracts': False,
    'has_analytics': False,
}
```

## Error Handling

When quota is exceeded or feature not available, decorators return:

```json
{
    "error": "Vous avez atteint la limite de Factures pour votre plan (10/10). Passez à un plan supérieur pour continuer.",
    "code": "quota_exceeded",
    "quota_type": "invoices"
}
```

Status code: `402 Payment Required`

## Examples by Use Case

### Creating an Invoice (with quota check)

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_quota('invoices')
def api_create_invoice(request):
    serializer = InvoiceSerializer(data=request.data)
    if serializer.is_valid():
        invoice = serializer.save(organization=request.user.organization)
        return Response(InvoiceSerializer(invoice).data, status=201)
    return Response(serializer.errors, status=400)
```

### AI Assistant Endpoint (feature + quota)

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_feature('ai_assistant')  # Check plan has AI
@require_quota('ai_requests')      # Check AI quota
def ai_chat(request):
    message = request.data.get('message')
    response = mistral_api_call(message)
    return Response({'response': response})
```

### Getting Quota Status for Dashboard

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_status(request):
    organization = request.user.organization

    # Get all quota statuses
    quotas = QuotaService.get_quota_status(organization)

    # Get plan features
    features = QuotaService.get_plan_features(organization)

    return Response({
        'quotas': quotas,
        'features': features,
    })
```

### Conditional Feature Display (Frontend)

```javascript
// In React component
const { data: subscription } = useQuery(['subscription'],
    () => api.get('/api/v1/subscriptions/status/')
);

// Show AI button only if plan includes it
{subscription?.features?.has_ai_assistant && (
    <Button onClick={openAIChat}>
        Ask AI Assistant
    </Button>
)}

// Show quota warning
{subscription?.quotas?.invoices?.percentage > 80 && (
    <Alert severity="warning">
        You've used {subscription.quotas.invoices.used} of {subscription.quotas.invoices.limit} invoices this month.
        <Button>Upgrade Plan</Button>
    </Alert>
)}
```

## Testing

```python
from apps.subscriptions.models import SubscriptionPlan, Subscription
from apps.subscriptions.quota_service import QuotaService

# Create test organization with Standard plan
standard_plan = SubscriptionPlan.objects.get(code='standard')
subscription = Subscription.objects.create(
    organization=org,
    plan=standard_plan,
)

# Check quota
status = QuotaService.check_quota(org, 'invoices', raise_exception=False)
assert status['limit'] == 100  # Standard plan has 100 invoices/month

# Increment usage
for i in range(10):
    QuotaService.increment_usage(org, 'invoices')

# Check again
status = QuotaService.check_quota(org, 'invoices', raise_exception=False)
assert status['used'] == 10
assert status['remaining'] == 90
```

## Monthly Quota Reset

Monthly quotas are automatically reset by a cron job (to be implemented):

```python
# management/commands/reset_monthly_quotas.py
from apps.subscriptions.models import Subscription

def reset_all_quotas():
    for subscription in Subscription.objects.filter(status__in=['trial', 'active']):
        subscription.reset_monthly_quotas()
```

Run with: `python manage.py reset_monthly_quotas`

Schedule with cron: `0 0 1 * * python manage.py reset_monthly_quotas` (every 1st of month at midnight)
