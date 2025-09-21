# Generated migration file

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('suppliers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplier',
            name='city',
            field=models.CharField(blank=True, max_length=100, verbose_name='Ville'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='province',
            field=models.CharField(blank=True, choices=[('QC', 'Québec'), ('ON', 'Ontario'), ('BC', 'Colombie-Britannique'), ('AB', 'Alberta'), ('MB', 'Manitoba'), ('SK', 'Saskatchewan'), ('NS', 'Nouvelle-Écosse'), ('NB', 'Nouveau-Brunswick'), ('NL', 'Terre-Neuve-et-Labrador'), ('PE', 'Île-du-Prince-Édouard'), ('NT', 'Territoires du Nord-Ouest'), ('YT', 'Yukon'), ('NU', 'Nunavut')], max_length=2, verbose_name='Province'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='status',
            field=models.CharField(choices=[('active', 'Actif'), ('pending', 'En attente'), ('inactive', 'Inactif'), ('blocked', 'Bloqué')], default='pending', max_length=20, verbose_name='Statut'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='rating',
            field=models.DecimalField(decimal_places=1, default=0, max_digits=2, verbose_name='Note'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='is_local',
            field=models.BooleanField(default=False, verbose_name='Fournisseur local'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='is_minority_owned',
            field=models.BooleanField(default=False, verbose_name='Propriété minoritaire'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='is_woman_owned',
            field=models.BooleanField(default=False, verbose_name='Propriété féminine'),
        ),
        migrations.AddField(
            model_name='supplier',
            name='is_indigenous',
            field=models.BooleanField(default=False, verbose_name='Entreprise autochtone'),
        ),
    ]