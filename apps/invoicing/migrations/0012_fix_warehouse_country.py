# Migration manuelle pour ajouter le champ country à Warehouse s'il manque

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0011_invoiceitem_product_product_organization_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                # Vérifier et ajouter country si absent (SQLite ne supporte pas IF NOT EXISTS pour les colonnes)
                """
                ALTER TABLE invoicing_warehouse ADD COLUMN country varchar(100) NOT NULL DEFAULT 'Canada';
                """,
            ],
            reverse_sql=[
                """
                ALTER TABLE invoicing_warehouse DROP COLUMN country;
                """,
            ],
        ),
    ]

