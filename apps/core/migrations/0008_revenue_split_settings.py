from decimal import Decimal

from django.db import migrations, models


def reprendre_valeurs_actuelles(apps, schema_editor):
    """Les organisations déjà en service gardent les règles qui étaient codées
    en dur dans le frontend — rien ne change à l'écran pour elles.

    Les nouvelles organisations partent à zéro : les notes explicatives
    n'apparaissent que lorsque le centre a saisi ses propres règles.
    """
    Settings = apps.get_model('core', 'OrganizationSettings')
    Settings.objects.all().update(
        consultation_net_per_unit=Decimal('2150.00'),
        imaging_center_share_percent=Decimal('30.00'),
        imaging_doctor_share_percent=Decimal('15.00'),
        subcontract_center_share_percent=Decimal('90.00'),
        subcontract_partner_share_percent=Decimal('10.00'),
        subcontract_partner_label='Emmanuel et Christian',
    )


def revenir(apps, schema_editor):
    """Rien à défaire : les colonnes disparaissent avec le schéma."""


class Migration(migrations.Migration):
    """Partage du revenu net : paramétrable par organisation.

    Ces valeurs vivaient en dur dans frontend/src/pages/Dashboard.jsx et dans
    RevenueAnalyticsDashboard.jsx, prénoms du personnel compris. Tout centre
    installant le logiciel aurait vu les règles d'un autre.
    """

    dependencies = [
        ('core', '0007_organizationsettings_privilege_card_other_discount_percent'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizationsettings',
            name='consultation_net_per_unit',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=10,
                help_text='Montant que le centre garde sur chaque consultation ; '
                          'le reste part en primes au médecin. 0 = ne pas afficher.',
                verbose_name='Net conservé par consultation'),
        ),
        migrations.AddField(
            model_name='organizationsettings',
            name='imaging_center_share_percent',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=5,
                help_text='0 = ne pas afficher.',
                verbose_name="Part du centre sur l'imagerie (%)"),
        ),
        migrations.AddField(
            model_name='organizationsettings',
            name='imaging_doctor_share_percent',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=5,
                help_text='0 = ne pas afficher.',
                verbose_name="Part reversée au médecin prescripteur sur l'imagerie (%)"),
        ),
        migrations.AddField(
            model_name='organizationsettings',
            name='subcontract_center_share_percent',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=5,
                help_text='0 = ne pas afficher.',
                verbose_name='Part du centre sur la sous-traitance (%)'),
        ),
        migrations.AddField(
            model_name='organizationsettings',
            name='subcontract_partner_share_percent',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=5,
                help_text='0 = ne pas afficher.',
                verbose_name='Part reversée aux partenaires sur la sous-traitance (%)'),
        ),
        migrations.AddField(
            model_name='organizationsettings',
            name='subcontract_partner_label',
            field=models.CharField(
                blank=True, default='', max_length=120,
                help_text='Affiché dans la note explicative du tableau de bord. '
                          'Vide : « aux partenaires ».',
                verbose_name='Nom des partenaires de sous-traitance'),
        ),
        migrations.RunPython(reprendre_valeurs_actuelles, revenir),
    ]
