from apps.invoicing.models import StockMovement, Product
from apps.accounts.models import Organization

org = Organization.objects.first()
movements = StockMovement.objects.filter(product__organization=org)
print(f'Total StockMovements: {movements.count()}')
print(f'By type:')
for mt in ['in', 'out', 'adjustment', 'wastage']:
    count = movements.filter(movement_type=mt).count()
    print(f'  {mt}: {count}')

# Check products with movements
products_with_movements = Product.objects.filter(
    organization=org,
    id__in=movements.values_list('product_id', flat=True)
).count()
print(f'\nProducts with movements: {products_with_movements}')
print(f'Total products: {Product.objects.filter(organization=org).count()}')

# Show recent movements
print('\nRecent movements (last 5):')
for m in movements.order_by('-created_at')[:5]:
    print(f'  {m.created_at.strftime("%Y-%m-%d")} - {m.product.name} - {m.movement_type} - Qty: {m.quantity}')
