# Migration manuelle pour ajouter payment_terms si manquant

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_client_organization_client_payment_terms'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                """
                ALTER TABLE accounts_client ADD COLUMN payment_terms varchar(100) NOT NULL DEFAULT 'Net 30';
                """,
            ],
            reverse_sql=[
                """
                ALTER TABLE accounts_client DROP COLUMN payment_terms;
                """,
            ],
        ),
    ]

