import django_filters
from django.db.models import Q, F
from django.utils import timezone
import datetime

from apps.invoicing.models import Product

class ProductFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        method='filter_status',
        choices=(('available', 'Available'), ('unavailable', 'Unavailable'))
    )
    stock_status = django_filters.ChoiceFilter(
        method='filter_stock_status',
        choices=(('out_of_stock', 'Out of stock'), ('low_stock', 'Low stock'), ('ok', 'OK'))
    )
    expiration_status = django_filters.ChoiceFilter(
        method='filter_expiration_status',
        choices=(('expired', 'Expired'), ('expiring_soon', 'Expiring soon'), ('ok', 'OK'))
    )
    registered_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    registered_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    expiration_after = django_filters.DateFilter(field_name='expiration_date', lookup_expr='gte')
    expiration_before = django_filters.DateFilter(field_name='expiration_date', lookup_expr='lte')

    class Meta:
        model = Product
        fields = ['category', 'warehouse', 'product_type']

    def filter_status(self, queryset, name, value):
        if value == 'available':
            return queryset.filter(is_active=True)
        elif value == 'unavailable':
            return queryset.filter(is_active=False)
        return queryset

    def filter_stock_status(self, queryset, name, value):
        if value == 'out_of_stock':
            return queryset.filter(product_type='physical', stock_quantity__lte=0)
        elif value == 'low_stock':
            return queryset.filter(product_type='physical', stock_quantity__gt=0, stock_quantity__lte=F('low_stock_threshold'))
        elif value == 'ok':
            return queryset.filter(product_type='physical', stock_quantity__gt=F('low_stock_threshold'))
        return queryset

    def filter_expiration_status(self, queryset, name, value):
        today = timezone.now().date()
        thirty_days = today + datetime.timedelta(days=30)
        
        # Here we only filter on product.expiration_date for simplicity as the 
        # frontend did not strictly use only batches for the list view filters, 
        # but combined logic. For backend performance, we filter on the product field 
        # or we could do a complex Q query with batches. Let's do simple for now.
        
        if value == 'expired':
            return queryset.filter(product_type='physical', expiration_date__lt=today)
        elif value == 'expiring_soon':
            return queryset.filter(product_type='physical', expiration_date__gte=today, expiration_date__lte=thirty_days)
        elif value == 'ok':
            # OK means not expired and not expiring soon, or has no expiration date
            return queryset.filter(
                Q(product_type='physical') &
                (Q(expiration_date__gt=thirty_days) | Q(expiration_date__isnull=True))
            )
        return queryset
