# Migration idempotente : ajoute la colonne `country` à Warehouse uniquement si elle
# est absente. Sur une base neuve, la colonne est déjà créée par la migration 0010
# (CreateModel inclut `country`), donc un ALTER TABLE aveugle échoue avec
# "duplicate column name". Cette migration inspecte le schéma avant d'agir afin de
# rester compatible à la fois avec les bases neuves et les bases de production legacy
# où la colonne aurait pu manquer.

from django.db import migrations


def add_country_if_missing(apps, schema_editor):
    connection = schema_editor.connection
    table = 'invoicing_warehouse'
    with connection.cursor() as cursor:
        existing_columns = [
            col.name for col in connection.introspection.get_table_description(cursor, table)
        ]
    if 'country' not in existing_columns:
        schema_editor.execute(
            "ALTER TABLE invoicing_warehouse "
            "ADD COLUMN country varchar(100) NOT NULL DEFAULT 'Canada'"
        )


def noop_reverse(apps, schema_editor):
    # La colonne `country` appartient logiquement à la migration 0010 ; on ne la
    # supprime pas ici pour éviter de casser le rollback de 0010.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('invoicing', '0011_invoiceitem_product_product_organization_and_more'),
    ]

    operations = [
        migrations.RunPython(add_country_if_missing, noop_reverse),
    ]
