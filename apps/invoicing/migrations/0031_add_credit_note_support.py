# Generated migration for adding credit note support to invoices
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0030_update_default_low_stock_threshold'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoice',
            name='invoice_type',
            field=models.CharField(
                choices=[
                    ('standard', 'Standard'),
                    ('healthcare_consultation', 'Consultation médicale'),
                    ('healthcare_laboratory', 'Laboratoire'),
                    ('healthcare_pharmacy', 'Pharmacie'),
                    ('credit_note', 'Avoir - Note de crédit'),
                ],
                default='standard',
                max_length=30,
                verbose_name='Type de facture'
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='original_invoice',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='credit_notes',
                to='invoicing.invoice',
                verbose_name='Facture originale',
                help_text='Facture annulée par cette note de crédit'
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='cancellation_reason',
            field=models.TextField(
                blank=True,
                verbose_name="Raison d'annulation",
                help_text="Raison de l'annulation de la facture"
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='cancelled_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="Date d'annulation"
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='cancelled_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cancelled_invoices',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Annulé par'
            ),
        ),
    ]
