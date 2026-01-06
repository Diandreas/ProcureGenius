# Generated migration for price_editable field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0018_alter_invoice_client_cascade_delete'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='price_editable',
            field=models.BooleanField(default=False, help_text='Si activé, le prix peut être modifié lors de la création de facture', verbose_name='Prix modifiable'),
        ),
    ]

