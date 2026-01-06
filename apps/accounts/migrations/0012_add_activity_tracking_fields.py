# Generated migration for activity tracking fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_emailconfiguration'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='last_activity_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Dernière activité'),
        ),
        migrations.AddField(
            model_name='client',
            name='auto_inactive_since',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Inactif automatiquement depuis'),
        ),
        migrations.AddField(
            model_name='client',
            name='is_manually_active',
            field=models.BooleanField(default=False, help_text='Si True, le statut actif/inactif est géré manuellement et ne sera pas modifié automatiquement', verbose_name='Statut manuel'),
        ),
    ]

