from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0010_add_operating_cost_to_product'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='invoice_date',
            field=models.DateField(blank=True, null=True, verbose_name='Date de facturation'),
        ),
        # Remplir invoice_date depuis created_at pour toutes les factures existantes
        migrations.RunSQL(
            sql="UPDATE invoicing_invoice SET invoice_date = DATE(created_at) WHERE invoice_date IS NULL;",
            reverse_sql="UPDATE invoicing_invoice SET invoice_date = NULL;",
        ),
    ]
