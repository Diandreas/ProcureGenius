from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0008_labtestparameter_is_active'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LabTestPanel',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=50, verbose_name='Code')),
                ('name', models.CharField(max_length=200, verbose_name='Nom')),
                ('description', models.TextField(blank=True, verbose_name='Description')),
                ('price', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Prix forfaitaire')),
                ('discount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10, verbose_name='Réduction')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lab_panels',
                    to='accounts.organization',
                    verbose_name='Organisation',
                )),
                ('tests', models.ManyToManyField(
                    blank=True,
                    related_name='panels',
                    to='laboratory.labtest',
                    verbose_name='Examens inclus',
                )),
            ],
            options={
                'verbose_name': 'Bilan',
                'verbose_name_plural': 'Bilans',
                'ordering': ['name'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='labtestpanel',
            unique_together={('organization', 'code')},
        ),
        migrations.AddField(
            model_name='laborderitem',
            name='panel',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='order_items',
                to='laboratory.labtestpanel',
                verbose_name='Bilan',
            ),
        ),
        migrations.AddField(
            model_name='laborderitem',
            name='panel_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                verbose_name='Prix du bilan',
            ),
        ),
    ]
