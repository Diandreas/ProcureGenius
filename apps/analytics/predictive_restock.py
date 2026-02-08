"""
Predictive Restock Service
Predicts stockout dates and recommends restock actions based on consumption patterns and supplier lead times.
"""
from datetime import date, timedelta
from apps.invoicing.models import Product, StockMovement
from apps.analytics.wilson_service import (
    calculate_annual_demand, calculate_eoq, _get_lead_time
)


def predict_stockout_date(product):
    """Predict when the product will run out of stock"""
    annual_demand = calculate_annual_demand(product)
    daily_demand = annual_demand / 365

    if daily_demand <= 0:
        return {
            'predicted_date': None,
            'days_remaining': None,
            'daily_demand': 0,
            'message': 'Pas de consommation detectee'
        }

    days_remaining = product.stock_quantity / daily_demand
    predicted_date = date.today() + timedelta(days=int(days_remaining))

    return {
        'predicted_date': predicted_date.isoformat(),
        'days_remaining': round(days_remaining),
        'daily_demand': round(daily_demand, 2),
    }


def get_restock_urgency(product):
    """
    Determine restock urgency based on days remaining vs lead time.
    - critical: stockout before delivery possible (days_remaining <= lead_time)
    - high: order now (days_remaining <= lead_time * 1.5)
    - medium: watch (days_remaining <= lead_time * 2)
    - low: OK
    """
    annual_demand = calculate_annual_demand(product)
    daily_demand = annual_demand / 365
    lead_time = _get_lead_time(product)

    if daily_demand <= 0:
        return {
            'urgency': 'low',
            'lead_time_days': lead_time,
            'days_remaining': None,
            'message': 'Pas de consommation - pas de risque',
        }

    days_remaining = product.stock_quantity / daily_demand

    if days_remaining <= lead_time:
        urgency = 'critical'
        message = f'RUPTURE avant reception possible ! Commander immediatement. Rupture dans ~{round(days_remaining)}j, delai livraison: {lead_time}j'
    elif days_remaining <= lead_time * 1.5:
        urgency = 'high'
        order_before = date.today() + timedelta(days=int(days_remaining - lead_time))
        message = f'Commander avant le {order_before.strftime("%d/%m/%Y")} ou rupture dans {round(days_remaining)} jours'
    elif days_remaining <= lead_time * 2:
        urgency = 'medium'
        message = f'A surveiller - {round(days_remaining)} jours de stock restant'
    else:
        urgency = 'low'
        message = f'Stock suffisant pour {round(days_remaining)} jours'

    return {
        'urgency': urgency,
        'lead_time_days': lead_time,
        'days_remaining': round(days_remaining),
        'message': message,
    }


def get_all_predictions(organization):
    """Get predictions for all physical products, sorted by urgency"""
    products = Product.objects.filter(
        organization=organization,
        product_type='physical',
        is_active=True,
        stock_quantity__gt=0
    )

    predictions = []
    for product in products:
        try:
            stockout = predict_stockout_date(product)
            urgency_info = get_restock_urgency(product)
            eoq_data = calculate_eoq(product)

            predictions.append({
                'product_id': str(product.id),
                'product_name': product.name,
                'product_reference': product.reference or '',
                'current_stock': product.stock_quantity,
                'low_stock_threshold': product.low_stock_threshold,
                'cost_price': float(product.cost_price or 0),
                'predicted_stockout_date': stockout['predicted_date'],
                'days_remaining': stockout['days_remaining'],
                'daily_demand': stockout['daily_demand'],
                'supplier_lead_time': urgency_info['lead_time_days'],
                'urgency': urgency_info['urgency'],
                'message': urgency_info['message'],
                'recommended_order_qty': eoq_data['eoq'],
                'recommended_order_value': round(eoq_data['eoq'] * float(product.cost_price or 0)),
            })
        except Exception:
            continue

    # Sort by urgency then days remaining
    urgency_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    predictions.sort(key=lambda x: (
        urgency_order.get(x['urgency'], 4),
        x['days_remaining'] if x['days_remaining'] is not None else 9999
    ))

    return predictions
