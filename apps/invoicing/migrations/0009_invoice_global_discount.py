# Generated for invoice global discount feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0008_add_subcontractor_fields_to_invoice'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='global_discount_type',
            field=models.CharField(
                choices=[('fixed', 'Montant fixe'), ('percent', 'Pourcentage')],
                default='fixed',
                help_text='Type de remise appliquée sur la facture entière',
                max_length=10,
                verbose_name='Type de remise globale',
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='global_discount_value',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Pour 'fixed' = montant en devise locale ; pour 'percent' = pourcentage de 0 à 100",
                max_digits=14,
                verbose_name='Valeur de la remise globale',
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='global_discount_label',
            field=models.CharField(
                blank=True,
                default='',
                help_text="Optionnel — ex: 'Remise commerciale', 'Geste fidélité'",
                max_length=100,
                verbose_name='Libellé de la remise',
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='global_discount_amount',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Calculé automatiquement depuis type et value lors du recalcul',
                max_digits=14,
                verbose_name='Montant calculé de la remise globale',
            ),
        ),
    ]
