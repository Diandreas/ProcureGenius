"""
Migration pour ajouter des indexes de recherche optimisés (trigram) pour les clients
"""
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0009_auto_20231215_1234'),  # Ajuster selon dernière migration
    ]

    operations = [
        # Activer l'extension trigram (si pas déjà fait par suppliers)
        TrigramExtension(),

        # Index trigram sur Client.name
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS clients_client_name_trgm_idx ON clients_client USING gin (name gin_trgm_ops);",
            reverse_sql="DROP INDEX IF EXISTS clients_client_name_trgm_idx;"
        ),

        # Index composite organization_id + name
        migrations.AddIndex(
            model_name='client',
            index=models.Index(
                fields=['organization', 'name'],
                name='clients_org_name_idx'
            ),
        ),

        # Index sur email
        migrations.AddIndex(
            model_name='client',
            index=models.Index(
                fields=['email'],
                name='clients_email_idx'
            ),
        ),
    ]
