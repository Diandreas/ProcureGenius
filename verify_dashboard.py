import os
import django
from datetime import date, timedelta
from django.db.models import Sum, F

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabOrder
from apps.invoicing.models import Product
from apps.accounts.models import Organization

def verify():
    output = []
    output.append("--- Dashboard Verification ---")
    try:
        org = Organization.objects.get(name='Centre de Santé JULIANNA')
    except Organization.DoesNotExist:
        output.append("Organization 'Centre de Santé JULIANNA' not found.")
        with open('dashboard_report.txt', 'w', encoding='utf-8') as f:
            f.write('\n'.join(output))
        return

    # 1. Healthcare Stats
    total_orders = LabOrder.objects.filter(organization=org).count()
    output.append(f"Total Lab Orders: {total_orders} (Expected > 0 for dashboard to show data)")

    # 2. Inventory Stats
    products = Product.objects.filter(organization=org, is_active=True)
    total_products = products.count()
    output.append(f"Total Active Products: {total_products}")

    inventory_value = products.aggregate(
        value=Sum(F('stock_quantity') * F('cost_price'))
    )['value'] or 0
    output.append(f"Total Inventory Value: {inventory_value} (If 0, cost_price is missing)")

    # Check a few products for cost_price
    output.append("\nSample Products Cost Price:")
    for p in products[:10]:
        output.append(f"  - {p.name}: Stock={p.stock_quantity}, Price={p.price}, Cost={p.cost_price}")

    # 3. Simulate Dashboard API Logic (Healthcare)
    today = date.today()
    exams_today = LabOrder.objects.filter(organization=org, order_date__date=today).count()
    output.append(f"\nAPI Simulation (Healthcare):")
    output.append(f"  exams_today: {exams_today}")

    # 4. Simulate Dashboard API Logic (Inventory - POST-FIX)
    # Replicates the logic I just added to inventory_analytics.py
    low_stock_physical = Product.objects.filter(
        organization=org,
        product_type='physical',
        stock_quantity__lte=F('low_stock_threshold'),
        is_active=True
    ).count()
    
    out_of_stock_physical = Product.objects.filter(
        organization=org,
        product_type='physical',
        stock_quantity=0,
        is_active=True
    ).count()

    output.append(f"\nAPI Simulation (Inventory - Post-Fix):")
    output.append(f"  low_stock_count (Physical only): {low_stock_physical}")
    output.append(f"  out_of_stock (Physical only): {out_of_stock_physical}")
    
    # Comparison with Pre-Fix (All products)
    low_stock_all = Product.objects.filter(
        organization=org,
        stock_quantity__lte=F('low_stock_threshold'),
        is_active=True
    ).count()
    output.append(f"  (Vs Pre-Fix low_stock_count: {low_stock_all} - services inflated this)")
    
    with open('dashboard_report.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    print("Report written to dashboard_report.txt")

if __name__ == "__main__":
    verify()
