from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0007_laborder_results_verified_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='labtestparameter',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Actif'),
        ),
    ]
