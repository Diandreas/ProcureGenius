from django.db import migrations, models


class Migration(migrations.Migration):
    """Prescripteur sous-traitant : nouveau mode de tarification (tarif négocié,
    aucun reversement) et option pour masquer le nom sur le rapport.

    Non destructif : le nouveau champ a une valeur par défaut, et le nouveau
    mode est un choix supplémentaire — les prescripteurs existants gardent
    leur mode et voient leur nom affiché comme avant.
    """

    dependencies = [
        ('laboratory', '0029_reagentusage_reagentqualitycontrol'),
    ]

    operations = [
        migrations.AddField(
            model_name='prescriber',
            name='show_on_report',
            field=models.BooleanField(
                default=True,
                help_text="Si décoché, le nom du prescripteur n'apparaît pas sur le rapport de laboratoire.",
                verbose_name='Afficher le nom sur le rapport',
            ),
        ),
        migrations.AlterField(
            model_name='prescriber',
            name='pricing_mode',
            field=models.CharField(
                choices=[
                    ('commission', 'Commission (% sur le prix normal)'),
                    ('custom_price', 'Prix libre (le prescripteur fixe son propre prix)'),
                    ('subcontract', 'Prescripteur sous-traitant (tarif négocié, aucun reversement)'),
                ],
                default='commission',
                help_text=(
                    "Commission : le patient paie le prix normal, le prescripteur touche un %. "
                    "Prix libre : le patient paie le prix fixé par le prescripteur, la clinique "
                    "garde son prix normal et reverse la différence au prescripteur. "
                    "Prescripteur sous-traitant : tarif négocié comme pour la sous-traitance, "
                    "mais le rapport reste à l'en-tête de la clinique et rien n'est reversé."
                ),
                max_length=20,
                verbose_name='Mode de tarification',
            ),
        ),
    ]
