# Generated manually, following the style of 0003, for privilege_card_manual_toggle_enabled

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_organizationsettings_stock_barcode_enabled_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizationsettings',
            name='privilege_card_manual_toggle_enabled',
            field=models.BooleanField(
                default=False,
                verbose_name='Activation/désactivation manuelle de la carte privilège',
                help_text=(
                    "Autorise le personnel à activer ou annuler manuellement la réduction "
                    "carte privilège sur une facture ou une commande labo déjà créée "
                    "(ex: le patient se rappelle de sa carte après coup)."
                ),
            ),
        ),
    ]
