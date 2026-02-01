# Generated migration for updating low stock threshold default
from django.db import migrations, models


def update_default_threshold(apps, schema_editor):
    """Update existing products with threshold=5 to threshold=10"""
    Product = apps.get_model('invoicing', 'Product')
    Product.objects.filter(
        product_type='physical',
        low_stock_threshold=5
    ).update(low_stock_threshold=10)


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0029_add_expiration_date_to_product'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='low_stock_threshold',
            field=models.IntegerField(default=10, verbose_name="Seuil de stock bas"),
        ),
        migrations.RunPython(update_default_threshold, migrations.RunPython.noop),
    ]
