"""
Helpers pour générer des données formatées pour Recharts
"""
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from decimal import Decimal


# Palette de couleurs du projet
CHART_COLORS = {
    'primary': '#2563eb',
    'success': '#10b981',
    'warning': '#f59e0b',
    'error': '#ef4444',
    'info': '#06b6d4',
    'purple': '#a855f7',
    'pink': '#ec4899',
    'gray': '#6b7280'
}


def format_for_recharts(
    chart_type: str,
    chart_title: str,
    chart_data: List[Dict],
    chart_config: Dict
) -> Dict:
    """
    Formatte les données pour Recharts

    Args:
        chart_type: Type de graphe (line, bar, pie, area)
        chart_title: Titre du graphe
        chart_data: Données du graphe (liste de dicts)
        chart_config: Configuration du graphe

    Returns:
        Dict formaté pour le frontend
    """
    return {
        'entity_type': 'visualization',
        'chart_type': chart_type,
        'chart_title': chart_title,
        'chart_data': chart_data,
        'chart_config': chart_config
    }


def get_date_range(period: str) -> Tuple[Optional[datetime], datetime]:
    """
    Retourne les dates de début et fin selon la période

    Args:
        period: today, week, month, quarter, year, all

    Returns:
        (start_date, end_date)
    """
    now = timezone.now()

    if period == 'today':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = now - timedelta(days=7)
    elif period == 'month':
        start_date = now - timedelta(days=30)
    elif period == 'quarter':
        start_date = now - timedelta(days=90)
    elif period == 'year':
        start_date = now - timedelta(days=365)
    else:  # all
        start_date = None

    return start_date, now


def group_by_time(queryset, date_field: str, group_by: str = 'month'):
    """
    Groupe un queryset par période temporelle

    Args:
        queryset: Django queryset
        date_field: Nom du champ date
        group_by: day, week, month

    Returns:
        Queryset avec annotations temporelles
    """
    if group_by == 'day':
        return queryset.annotate(period=TruncDay(date_field))
    elif group_by == 'week':
        return queryset.annotate(period=TruncWeek(date_field))
    else:  # month
        return queryset.annotate(period=TruncMonth(date_field))


def generate_revenue_evolution_chart(organization, period: str = 'month', group_by: str = 'month'):
    """
    Génère un graphe d'évolution du CA

    Args:
        organization: Organisation Django
        period: Période (today, week, month, quarter, year, all)
        group_by: Groupement (day, week, month)

    Returns:
        Dict formaté pour Recharts
    """
    from apps.invoicing.models import Invoice

    start_date, end_date = get_date_range(period)

    invoices_qs = Invoice.objects.filter(
        created_by__organization=organization
    )

    if start_date:
        invoices_qs = invoices_qs.filter(created_at__gte=start_date)

    # Grouper par période
    invoices_grouped = group_by_time(invoices_qs, 'created_at', group_by)

    # Agréger
    stats = invoices_grouped.values('period').annotate(
        revenue=Sum('total_amount'),
        count=Count('id')
    ).order_by('period')

    # Formater pour Recharts
    chart_data = []
    for stat in stats:
        chart_data.append({
            'date': stat['period'].strftime('%Y-%m-%d') if stat['period'] else 'N/A',
            'revenue': float(stat['revenue'] or 0),
            'count': stat['count']
        })

    chart_config = {
        'xAxis': 'date',
        'lines': [
            {
                'dataKey': 'revenue',
                'stroke': CHART_COLORS['success'],
                'name': 'Revenus (€)',
                'type': 'monotone'
            }
        ]
    }

    return format_for_recharts(
        chart_type='line',
        chart_title=f'Évolution du CA ({period})',
        chart_data=chart_data,
        chart_config=chart_config
    )


def generate_top_clients_chart(organization, period: str = 'month', limit: int = 10):
    """
    Génère un graphe des meilleurs clients

    Args:
        organization: Organisation Django
        period: Période
        limit: Nombre de clients

    Returns:
        Dict formaté pour Recharts (bar chart)
    """
    from apps.invoicing.models import Invoice

    start_date, end_date = get_date_range(period)

    invoices_qs = Invoice.objects.filter(
        created_by__organization=organization
    )

    if start_date:
        invoices_qs = invoices_qs.filter(created_at__gte=start_date)

    # Grouper par client
    top_clients = invoices_qs.values('client__name').annotate(
        total=Sum('total_amount'),
        count=Count('id')
    ).order_by('-total')[:limit]

    # Formater
    chart_data = []
    for client in top_clients:
        chart_data.append({
            'name': client['client__name'] or 'Client inconnu',
            'revenue': float(client['total'] or 0),
            'invoices': client['count']
        })

    chart_config = {
        'xAxis': 'name',
        'bars': [
            {
                'dataKey': 'revenue',
                'fill': CHART_COLORS['primary'],
                'name': 'CA (€)'
            }
        ]
    }

    return format_for_recharts(
        chart_type='bar',
        chart_title=f'Top {limit} Clients ({period})',
        chart_data=chart_data,
        chart_config=chart_config
    )


def generate_products_pie_chart(organization, period: str = 'month', limit: int = 5):
    """
    Génère un pie chart des produits

    Args:
        organization: Organisation Django
        period: Période
        limit: Nombre de produits

    Returns:
        Dict formaté pour Recharts (pie chart)
    """
    from apps.invoicing.models import InvoiceItem

    start_date, end_date = get_date_range(period)

    items_qs = InvoiceItem.objects.filter(
        invoice__created_by__organization=organization
    )

    if start_date:
        items_qs = items_qs.filter(invoice__created_at__gte=start_date)

    # Grouper par produit
    top_products = items_qs.values('product__name').annotate(
        total=Sum(F('quantity') * F('unit_price'))
    ).order_by('-total')[:limit]

    # Formater
    chart_data = []
    colors = [
        CHART_COLORS['primary'],
        CHART_COLORS['success'],
        CHART_COLORS['warning'],
        CHART_COLORS['info'],
        CHART_COLORS['purple']
    ]

    for idx, product in enumerate(top_products):
        chart_data.append({
            'name': product['product__name'] or 'Produit inconnu',
            'value': float(product['total'] or 0),
            'fill': colors[idx % len(colors)]
        })

    chart_config = {
        'dataKey': 'value',
        'nameKey': 'name'
    }

    return format_for_recharts(
        chart_type='pie',
        chart_title=f'Top {limit} Produits ({period})',
        chart_data=chart_data,
        chart_config=chart_config
    )


def generate_stock_alerts_chart(organization):
    """
    Génère un graphe des alertes stock

    Returns:
        Dict formaté pour Recharts (bar chart)
    """
    from apps.invoicing.models import Product

    # Récupérer produits avec stock faible
    low_stock = Product.objects.filter(
        organization=organization,
        stock__lte=F('low_stock_threshold')
    ).values('name', 'stock', 'low_stock_threshold').order_by('stock')[:10]

    chart_data = []
    for product in low_stock:
        chart_data.append({
            'name': product['name'][:20],  # Tronquer si trop long
            'stock': product['stock'],
            'threshold': product['low_stock_threshold']
        })

    chart_config = {
        'xAxis': 'name',
        'bars': [
            {
                'dataKey': 'stock',
                'fill': CHART_COLORS['error'],
                'name': 'Stock actuel'
            },
            {
                'dataKey': 'threshold',
                'fill': CHART_COLORS['warning'],
                'name': 'Seuil minimum'
            }
        ]
    }

    return format_for_recharts(
        chart_type='bar',
        chart_title='Alertes Stock',
        chart_data=chart_data,
        chart_config=chart_config
    )
