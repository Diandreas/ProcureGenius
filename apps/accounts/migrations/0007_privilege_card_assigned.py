from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Carte privilège : date d'attribution et agent qui l'a remise.

    Permet de compter les nouvelles cartes de la semaine dans le rapport du
    lundi, et de suivre leur distribution par l'équipe. L'utilisation, elle,
    était déjà tracée par PrivilegeCardUsage.

    Non destructif : deux champs facultatifs, les fiches existantes restent
    valides avec une date vide (carte attribuée avant la mise en place).
    """

    dependencies = [
        ('accounts', '0006_userpermissions_module_permissions'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='privilege_card_assigned_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="Renseignée automatiquement à l'activation de la carte ; "
                          "modifiable si la carte a été remise un autre jour.",
                verbose_name='Carte attribuée le',
            ),
        ),
        migrations.AddField(
            model_name='client',
            name='privilege_card_assigned_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='privilege_cards_assigned',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Carte attribuée par',
            ),
        ),
    ]
