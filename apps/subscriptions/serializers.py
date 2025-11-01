"""
Serializers for Subscription API
"""
from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, SubscriptionPayment


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Serializer for public display of subscription plans
    """
    features = serializers.SerializerMethodField()
    quotas = serializers.SerializerMethodField()
    savings_yearly = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'code', 'name', 'description',
            'price_monthly', 'price_yearly', 'currency',
            'trial_days', 'features', 'quotas', 'savings_yearly'
        ]

    def get_features(self, obj):
        """Return feature flags"""
        return {
            'has_ads': obj.has_ads,
            'has_ai_assistant': obj.has_ai_assistant,
            'has_purchase_orders': obj.has_purchase_orders,
            'has_suppliers': obj.has_suppliers,
            'has_e_sourcing': obj.has_e_sourcing,
            'has_contracts': obj.has_contracts,
            'has_analytics': obj.has_analytics,
        }

    def get_quotas(self, obj):
        """Return quota limits"""
        return {
            'invoices_per_month': obj.max_invoices_per_month,
            'clients': obj.max_clients,
            'products': obj.max_products,
            'purchase_orders_per_month': obj.max_purchase_orders_per_month,
            'suppliers': obj.max_suppliers,
            'storage_mb': obj.max_storage_mb,
            'ai_requests_per_month': obj.max_ai_requests_per_month,
        }

    def get_savings_yearly(self, obj):
        """Calculate yearly savings"""
        if obj.price_monthly > 0 and obj.price_yearly > 0:
            monthly_total = obj.price_monthly * 12
            savings = monthly_total - obj.price_yearly
            savings_percent = (savings / monthly_total) * 100
            return {
                'amount': float(savings),
                'percentage': round(savings_percent, 1)
            }
        return None


class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for user's current subscription
    """
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_code = serializers.CharField(write_only=True, required=False)
    is_trial = serializers.BooleanField(read_only=True)
    trial_days_remaining = serializers.IntegerField(read_only=True)
    is_active_or_trial = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_code', 'status', 'billing_period',
            'started_at', 'trial_ends_at', 'current_period_start',
            'current_period_end', 'cancelled_at',
            'payment_method', 'paypal_subscription_id',
            'is_trial', 'trial_days_remaining', 'is_active_or_trial',
            'invoices_this_month', 'purchase_orders_this_month',
            'ai_requests_this_month',
        ]
        read_only_fields = [
            'id', 'started_at', 'trial_ends_at', 'current_period_start',
            'current_period_end', 'cancelled_at', 'invoices_this_month',
            'purchase_orders_this_month', 'ai_requests_this_month',
        ]


class QuotaStatusSerializer(serializers.Serializer):
    """
    Serializer for quota status information
    """
    quota_type = serializers.CharField()
    can_proceed = serializers.BooleanField()
    used = serializers.IntegerField()
    limit = serializers.IntegerField(allow_null=True)
    percentage = serializers.FloatField()
    remaining = serializers.IntegerField()
    name = serializers.CharField()
    unit = serializers.CharField()


class SubscriptionStatusSerializer(serializers.Serializer):
    """
    Complete subscription status including quotas and features
    """
    subscription = SubscriptionSerializer()
    quotas = serializers.DictField()
    features = serializers.DictField()
    warnings = serializers.ListField(child=serializers.CharField(), required=False)


class SubscribeRequestSerializer(serializers.Serializer):
    """
    Request to subscribe to a plan
    """
    plan_code = serializers.ChoiceField(choices=['free', 'standard', 'premium'])
    billing_period = serializers.ChoiceField(choices=['monthly', 'yearly'], default='monthly')
    payment_method = serializers.ChoiceField(
        choices=['paypal', 'credit_card', 'bank_transfer', 'manual'],
        default='paypal'
    )
    paypal_subscription_id = serializers.CharField(required=False, allow_blank=True)


class ChangePlanSerializer(serializers.Serializer):
    """
    Request to change subscription plan
    """
    new_plan_code = serializers.ChoiceField(choices=['free', 'standard', 'premium'])
    billing_period = serializers.ChoiceField(choices=['monthly', 'yearly'], required=False)
    immediately = serializers.BooleanField(default=False)


class CancelSubscriptionSerializer(serializers.Serializer):
    """
    Request to cancel subscription
    """
    immediately = serializers.BooleanField(default=False)
    reason = serializers.CharField(required=False, allow_blank=True)


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for payment history
    """
    subscription_info = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPayment
        fields = [
            'id', 'subscription_info', 'amount', 'currency',
            'status', 'payment_method', 'transaction_id',
            'paypal_order_id', 'period_start', 'period_end',
            'created_at', 'notes'
        ]
        read_only_fields = fields

    def get_subscription_info(self, obj):
        """Return basic subscription info"""
        return {
            'organization_name': obj.subscription.organization.name,
            'plan_name': obj.subscription.plan.name,
        }
