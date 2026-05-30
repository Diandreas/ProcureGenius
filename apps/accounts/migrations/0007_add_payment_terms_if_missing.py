# Migration idempotente : ajoute la colonne `payment_terms` à Client uniquement si
# elle est absente. Sur une base neuve la colonne est déjà créée par la migration 0006
# (AddField), donc un ALTER TABLE aveugle échoue avec "duplicate column name". Cette
# migration inspecte le schéma avant d'agir afin de rester compatible à la fois avec
# les bases neuves et les bases de production legacy où la colonne aurait pu manquer.

from django.db import migrations


def add_payment_terms_if_missing(apps, schema_editor):
    connection = schema_editor.connection
    table = 'accounts_client'
    with connection.cursor() as cursor:
        existing_columns = [
            col.name for col in connection.introspection.get_table_description(cursor, table)
        ]
    if 'payment_terms' not in existing_columns:
        schema_editor.execute(
            "ALTER TABLE accounts_client "
            "ADD COLUMN payment_terms varchar(100) NOT NULL DEFAULT 'Net 30'"
        )


def noop_reverse(apps, schema_editor):
    # La colonne `payment_terms` appartient logiquement à la migration 0006 ; on ne la
    # supprime pas ici pour éviter de casser le rollback de 0006.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_client_organization_client_payment_terms'),
    ]

    operations = [
        migrations.RunPython(add_payment_terms_if_missing, noop_reverse),
    ]
