#!/usr/bin/env python
"""
Script de correction COMPLÈTE des migrations - Centre de Santé JULIANNA
Corrige toutes les dépendances manquantes en une seule fois
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.db.migrations.recorder import MigrationRecorder

# Liste de toutes les migrations manquantes à ajouter
MISSING_MIGRATIONS = [
    ('invoicing', '0020_warehouse_is_default_and_more'),
    ('invoicing', '0021_invoice_invoice_type_invoice_organization'),
    # Ajoutez d'autres migrations si nécessaire
]

def main():
    print("=" * 80)
    print("  CORRECTION COMPLÈTE DES MIGRATIONS")
    print("=" * 80)
    print()

    added = 0
    already_exists = 0

    for app, name in MISSING_MIGRATIONS:
        try:
            migration, created = MigrationRecorder.Migration.objects.get_or_create(
                app=app,
                name=name
            )

            if created:
                print(f"✅ Ajoutée: {app}.{name}")
                added += 1
            else:
                print(f"ℹ️  Déjà présente: {app}.{name}")
                already_exists += 1

        except Exception as e:
            print(f"❌ Erreur avec {app}.{name}: {e}")

    print()
    print("=" * 80)
    print(f"  Résultat: {added} ajoutées, {already_exists} déjà présentes")
    print("=" * 80)
    print()
    print("Exécutez maintenant: python manage.py migrate")
    print()

if __name__ == '__main__':
    main()
