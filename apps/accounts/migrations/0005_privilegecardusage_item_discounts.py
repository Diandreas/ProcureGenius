# Generated manually, following the style of 0004, for PrivilegeCardUsage.item_discounts

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_client_has_privilege_card_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='privilegecardusage',
            name='item_discounts',
            field=models.JSONField(
                blank=True,
                default=dict,
                verbose_name='Détail par ligne',
                help_text=(
                    "Correspondance {id de la ligne de facture: montant remisé} — "
                    "permet d'annuler précisément la réduction sans toucher aux autres "
                    "remises éventuellement présentes sur les mêmes lignes."
                ),
            ),
        ),
    ]
