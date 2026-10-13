# Generated manually on 2025-12-10

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0017_printconfiguration_organization_and_more'),
        ('accounts', '0014_change_payment_terms_default_to_cash'),  # était __latest__ : cassait l'historique à chaque nouvelle migration accounts
    ]

    operations = [
        migrations.AlterField(
            model_name='invoice',
            name='client',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='invoices',
                to='accounts.client',
                verbose_name='Client'
            ),
        ),
    ]
