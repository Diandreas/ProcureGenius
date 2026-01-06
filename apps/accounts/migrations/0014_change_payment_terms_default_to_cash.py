# Generated migration to change payment_terms default to CASH

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_alter_emailconfiguration_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='client',
            name='payment_terms',
            field=models.CharField(blank=True, default='CASH', max_length=100, verbose_name='Conditions de paiement'),
        ),
    ]
