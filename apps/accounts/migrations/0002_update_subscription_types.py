# Generated migration for profile system

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='organization',
            name='subscription_type',
            field=models.CharField(
                choices=[
                    ('free', 'Gratuit'),
                    ('billing', 'Facturation'),
                    ('procurement', 'Achats'),
                    ('professional', 'Professionnel'),
                    ('strategic', 'Stratégique'),
                    ('enterprise', 'Entreprise')
                ],
                default='free',
                max_length=50,
                verbose_name="Type d'abonnement"
            ),
        ),
    ]


