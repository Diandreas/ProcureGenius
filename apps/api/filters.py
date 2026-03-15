import django_filters
from django.db.models import Q, F, Sum, Value
from django.db.models.functions import Coalesce, Greatest
from django.utils import timezone
import datetime

from apps.invoicing.models import Product

ACTIVE_BATCH_STATUSES = ['available', 'opened']


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
        """Filtre par stock effectif (lots inclus) — cohérent avec l'affichage."""
        if value not in ('out_of_stock', 'low_stock', 'ok'):
            return queryset

        # Si le queryset a déjà _effective_stock annoté (depuis get_queryset), on l'utilise.
        # Sinon on l'annote ici pour éviter de dupliquer le travail.
        if not hasattr(queryset.query, 'annotations') or '_effective_stock' not in queryset.query.annotations:
            queryset = queryset.filter(product_type='physical').annotate(
                _batch_stock=Coalesce(
                    Sum(
                        'batches__quantity_remaining',
                        filter=Q(batches__status__in=ACTIVE_BATCH_STATUSES)
                    ),
                    Value(0)
                ),
                _effective_stock=Greatest(F('stock_quantity'), F('_batch_stock'))
            )
        else:
            queryset = queryset.filter(product_type='physical')

        if value == 'out_of_stock':
            return queryset.filter(_effective_stock=0)
        elif value == 'low_stock':
            return queryset.filter(_effective_stock__gt=0, _effective_stock__lte=F('low_stock_threshold'))
        elif value == 'ok':
            return queryset.filter(_effective_stock__gt=F('low_stock_threshold'))
        return queryset

    def filter_expiration_status(self, queryset, name, value):
        """
        Filtre par péremption en tenant compte des lots (batches) ET de la date
        directe du produit. Un produit est considéré comme "expirant bientôt" si :
        - son expiration_date directe est dans la fenêtre, OU
        - il a au moins un lot actif dont l'expiry_date est dans la fenêtre
        """
        today = timezone.now().date()
        thirty_days = today + datetime.timedelta(days=30)

        active_batches_filter = Q(batches__status__in=ACTIVE_BATCH_STATUSES, batches__quantity_remaining__gt=0)

        if value == 'expired':
            return queryset.filter(
                product_type='physical'
            ).filter(
                Q(expiration_date__lt=today) |
                Q(active_batches_filter, batches__expiry_date__lt=today)
            ).distinct()

        elif value == 'expiring_soon':
            return queryset.filter(
                product_type='physical'
            ).filter(
                Q(expiration_date__gte=today, expiration_date__lte=thirty_days) |
                Q(
                    active_batches_filter,
                    batches__expiry_date__gte=today,
                    batches__expiry_date__lte=thirty_days
                )
            ).distinct()

        elif value == 'ok':
            # Produits physiques dont ni le produit ni aucun lot n'est périmé/expirant
            expired_or_soon_ids = Product.objects.filter(
                product_type='physical'
            ).filter(
                Q(expiration_date__lte=thirty_days) |
                Q(
                    active_batches_filter,
                    batches__expiry_date__lte=thirty_days
                )
            ).values_list('id', flat=True)
            return queryset.filter(product_type='physical').exclude(id__in=expired_or_soon_ids)

        return queryset
