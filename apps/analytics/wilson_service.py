"""
Wilson EOQ (Economic Order Quantity) Service
Calculates optimal order quantities, reorder points, and product scoring
"""
import math
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Avg, StdDev, Count, Q
from apps.invoicing.models import Product, StockMovement
from apps.suppliers.models import SupplierProduct


def calculate_annual_demand(product):
    """
    Calculate annual demand (D) from stock movements (sales).
    Uses last 12 months of data, annualized.
    """
    one_year_ago = date.today() - timedelta(days=365)

    usage = StockMovement.objects.filter(
        product=product,
        movement_type='sale',
        created_at__gte=one_year_ago
    ).aggregate(total=Sum('quantity'))['total'] or 0

    # Sales quantities are negative, use absolute value
    annual_demand = abs(usage)

    # If less than a year of data, annualize from available period
    if annual_demand == 0:
        # Try last 90 days
        ninety_days_ago = date.today() - timedelta(days=90)
        usage_90 = StockMovement.objects.filter(
            product=product,
            movement_type='sale',
            created_at__gte=ninety_days_ago
        ).aggregate(total=Sum('quantity'))['total'] or 0
        annual_demand = abs(usage_90) * 4  # Annualize from 90 days

    return annual_demand


def _get_lead_time(product):
    """Get supplier lead time in days"""
    # Try from SupplierProduct
    supplier_product = SupplierProduct.objects.filter(
        product=product,
        is_preferred=True,
        is_active=True
    ).first()

    if supplier_product:
        return supplier_product.lead_time_days or 7

    # Try from product metadata
    return product.supply_lead_time_days


def _calculate_demand_stddev(product):
    """Calculate standard deviation of daily demand"""
    ninety_days_ago = date.today() - timedelta(days=90)

    # Get daily usage data
    from django.db.models.functions import TruncDate
    daily_usage = StockMovement.objects.filter(
        product=product,
        movement_type='sale',
        created_at__gte=ninety_days_ago
    ).annotate(
        day=TruncDate('created_at')
    ).values('day').annotate(
        daily_qty=Sum('quantity')
    ).values_list('daily_qty', flat=True)

    values = [abs(v) for v in daily_usage]

    if len(values) < 2:
        return 0

    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
    return math.sqrt(variance)


def calculate_eoq(product):
    """
    Wilson EOQ formula: Q* = sqrt(2 * D * S / H)
    D = Annual demand
    S = Ordering cost (cost per order)
    H = Holding cost per unit per year (cost_price * holding_cost_percent / 100)
    """
    D = calculate_annual_demand(product)
    S = float(product.ordering_cost)
    cost_price = float(product.cost_price) if product.cost_price else 0
    H = cost_price * float(product.holding_cost_percent) / 100

    if D <= 0 or S <= 0 or H <= 0:
        return {
            'eoq': 0,
            'annual_demand': D,
            'ordering_cost': S,
            'holding_cost': H,
            'orders_per_year': 0,
            'total_annual_cost': 0,
            'message': 'Donnees insuffisantes pour le calcul QEC'
        }

    eoq = math.sqrt(2 * D * S / H)
    orders_per_year = D / eoq if eoq > 0 else 0
    total_cost = (D / eoq * S) + (eoq / 2 * H) if eoq > 0 else 0

    return {
        'eoq': round(eoq),
        'annual_demand': D,
        'ordering_cost': S,
        'holding_cost': round(H, 2),
        'orders_per_year': round(orders_per_year, 1),
        'total_annual_cost': round(total_cost, 0),
    }


def calculate_reorder_point(product):
    """
    ROP = (daily_demand x lead_time) + safety_stock
    safety_stock = 1.65 x sigma x sqrt(lead_time) (95% service level)
    """
    annual_demand = calculate_annual_demand(product)
    daily_demand = annual_demand / 365
    lead_time = _get_lead_time(product)
    sigma = _calculate_demand_stddev(product)

    safety_stock = 1.65 * sigma * math.sqrt(lead_time)
    reorder_point = (daily_demand * lead_time) + safety_stock

    return {
        'reorder_point': round(reorder_point),
        'safety_stock': round(safety_stock),
        'daily_demand': round(daily_demand, 2),
        'lead_time_days': lead_time,
        'demand_stddev': round(sigma, 2),
        'service_level': '95%',
    }


def calculate_product_score(product):
    """
    Score 0-100 based on:
    - Usage frequency (40%): How often is the product sold
    - Demand reliability (30%): How consistent is the demand (low CV = high score)
    - Stock criticality (30%): Low stock vs threshold
    """
    annual_demand = calculate_annual_demand(product)

    # Usage frequency score (0-40)
    # Products used daily score highest
    daily_demand = annual_demand / 365
    if daily_demand >= 5:
        freq_score = 40
    elif daily_demand >= 1:
        freq_score = 30
    elif daily_demand >= 0.5:
        freq_score = 20
    elif daily_demand > 0:
        freq_score = 10
    else:
        freq_score = 0

    # Demand reliability (0-30)
    sigma = _calculate_demand_stddev(product)
    if daily_demand > 0:
        cv = sigma / daily_demand  # Coefficient of variation
        if cv < 0.3:
            reliability_score = 30
        elif cv < 0.6:
            reliability_score = 20
        elif cv < 1.0:
            reliability_score = 10
        else:
            reliability_score = 5
    else:
        reliability_score = 0

    # Stock criticality (0-30)
    if product.stock_quantity <= 0:
        critical_score = 30
    elif product.low_stock_threshold > 0:
        ratio = product.stock_quantity / product.low_stock_threshold
        if ratio <= 0.5:
            critical_score = 30
        elif ratio <= 1.0:
            critical_score = 20
        elif ratio <= 2.0:
            critical_score = 10
        else:
            critical_score = 0
    else:
        critical_score = 0

    total_score = freq_score + reliability_score + critical_score

    return {
        'total_score': total_score,
        'frequency_score': freq_score,
        'reliability_score': reliability_score,
        'criticality_score': critical_score,
        'daily_demand': round(daily_demand, 2),
    }


def get_wilson_analysis(product):
    """Complete Wilson analysis for a product"""
    eoq = calculate_eoq(product)
    rop = calculate_reorder_point(product)
    score = calculate_product_score(product)

    return {
        'product_id': str(product.id),
        'product_name': product.name,
        'product_reference': product.reference or '',
        'current_stock': product.stock_quantity,
        'low_stock_threshold': product.low_stock_threshold,
        'cost_price': float(product.cost_price or 0),
        'eoq': eoq,
        'reorder_point': rop,
        'score': score,
        'should_order': product.stock_quantity <= rop['reorder_point'],
        'recommended_order_qty': eoq['eoq'],
    }
