# Generated migration for consultation timing fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0005_consultation_fee'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultation',
            name='started_at',
            field=models.DateTimeField(blank=True, help_text='Heure à laquelle la consultation a commencé', null=True, verbose_name='Heure de début'),
        ),
        migrations.AddField(
            model_name='consultation',
            name='ended_at',
            field=models.DateTimeField(blank=True, help_text="Heure à laquelle la consultation s'est terminée", null=True, verbose_name='Heure de fin'),
        ),
    ]
