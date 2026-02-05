#!/usr/bin/env python
"""
Script de correction des migrations pour Centre de Santé JULIANNA

Ce script corrige le problème d'incohérence de migration:
Migration patients.0001_initial appliquée avant sa dépendance invoicing.0020

Usage:
    python fix_migration_order.py
"""

import os
import sys
import django
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder


def check_migration_exists(app, name):
    """Vérifier si une migration existe dans la base de données"""
    return MigrationRecorder.Migration.objects.filter(
        app=app,
        name=name
    ).exists()


def add_migration_record(app, name):
    """Ajouter un enregistrement de migration"""
    try:
        migration, created = MigrationRecorder.Migration.objects.get_or_create(
            app=app,
            name=name
        )
        return created
    except Exception as e:
        print(f"❌ Erreur lors de l'ajout de la migration: {e}")
        return False


def remove_migration_record(app, name):
    """Supprimer un enregistrement de migration"""
    try:
        deleted = MigrationRecorder.Migration.objects.filter(
            app=app,
            name=name
        ).delete()
        return deleted[0] > 0
    except Exception as e:
        print(f"❌ Erreur lors de la suppression de la migration: {e}")
        return False


def verify_table_exists(table_name):
    """Vérifier si une table existe dans la base de données"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]


def verify_column_exists(table_name, column_name):
    """Vérifier si une colonne existe dans une table"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
            );
        """, [table_name, column_name])
        return cursor.fetchone()[0]


def fix_migrations():
    """Fonction principale de correction"""
    print("="*80)
    print("  CORRECTION DES MIGRATIONS - CENTRE DE SANTÉ JULIANNA")
    print("="*80)
    print()

    # Vérifier l'état actuel
    print("[1/5] Vérification de l'état actuel...")

    invoicing_0020_exists = check_migration_exists('invoicing', '0020_warehouse_is_default_and_more')
    patients_0001_exists = check_migration_exists('patients', '0001_initial')

    print(f"  ✓ invoicing.0020: {'✅ Appliquée' if invoicing_0020_exists else '❌ Non appliquée'}")
    print(f"  ✓ patients.0001: {'✅ Appliquée' if patients_0001_exists else '❌ Non appliquée'}")
    print()

    # Cas 1: Les deux migrations existent -> Pas de problème
    if invoicing_0020_exists and patients_0001_exists:
        print("✅ Les migrations sont déjà dans le bon ordre!")
        print("   Aucune correction nécessaire.")
        return True

    # Cas 2: patients.0001 existe mais pas invoicing.0020 -> Problème!
    if patients_0001_exists and not invoicing_0020_exists:
        print("[2/5] Problème détecté: patients.0001 appliquée sans sa dépendance")
        print()

        # Vérifier si les tables existent physiquement
        print("[3/5] Vérification des tables de base de données...")

        warehouse_exists = verify_table_exists('invoicing_warehouse')
        warehouse_has_is_default = False

        if warehouse_exists:
            warehouse_has_is_default = verify_column_exists('invoicing_warehouse', 'is_default')
            print(f"  ✓ Table invoicing_warehouse: {'✅ Existe' if warehouse_exists else '❌ Manquante'}")
            print(f"  ✓ Colonne is_default: {'✅ Existe' if warehouse_has_is_default else '❌ Manquante'}")
        else:
            print(f"  ✓ Table invoicing_warehouse: ❌ Manquante")

        patients_visit_exists = verify_table_exists('patients_patientvisit')
        print(f"  ✓ Table patients_patientvisit: {'✅ Existe' if patients_visit_exists else '❌ Manquante'}")
        print()

        # Déterminer la stratégie de correction
        print("[4/5] Stratégie de correction...")

        if warehouse_has_is_default:
            # La colonne existe déjà -> Juste ajouter l'enregistrement
            print("  → Les changements de la migration 0020 sont déjà appliqués")
            print("  → Ajout de l'enregistrement de migration manquant")

            if add_migration_record('invoicing', '0020_warehouse_is_default_and_more'):
                print("  ✅ Migration invoicing.0020 marquée comme appliquée")
            else:
                print("  ❌ Échec de l'ajout de la migration")
                return False
        else:
            # La colonne n'existe pas -> Il faut l'appliquer
            print("  → Les changements de la migration 0020 ne sont PAS appliqués")
            print("  → Ajout de l'enregistrement pour permettre l'application")

            if add_migration_record('invoicing', '0020_warehouse_is_default_and_more'):
                print("  ✅ Migration invoicing.0020 marquée comme appliquée")
                print("  ⚠️  IMPORTANT: Exécutez maintenant 'python manage.py migrate invoicing --fake-initial'")
            else:
                print("  ❌ Échec de l'ajout de la migration")
                return False

        print()
        print("[5/5] Vérification finale...")

        invoicing_0020_exists = check_migration_exists('invoicing', '0020_warehouse_is_default_and_more')
        patients_0001_exists = check_migration_exists('patients', '0001_initial')

        print(f"  ✓ invoicing.0020: {'✅ Appliquée' if invoicing_0020_exists else '❌ Non appliquée'}")
        print(f"  ✓ patients.0001: {'✅ Appliquée' if patients_0001_exists else '❌ Non appliquée'}")
        print()

        if invoicing_0020_exists and patients_0001_exists:
            print("="*80)
            print("  ✅ CORRECTION RÉUSSIE!")
            print("="*80)
            print()
            print("Prochaines étapes:")
            print("  1. Exécutez: python manage.py migrate")
            print("  2. Vérifiez: python manage.py showmigrations")
            print()
            return True
        else:
            print("❌ La correction n'a pas fonctionné complètement")
            return False

    # Cas 3: Aucune des migrations n'existe
    if not invoicing_0020_exists and not patients_0001_exists:
        print("ℹ️  Aucune des migrations n'est appliquée")
        print("   Exécutez simplement: python manage.py migrate")
        return True

    # Cas 4: invoicing.0020 existe mais pas patients.0001
    if invoicing_0020_exists and not patients_0001_exists:
        print("✅ L'ordre est correct!")
        print("   Exécutez: python manage.py migrate")
        return True


def main():
    """Point d'entrée principal"""
    try:
        success = fix_migrations()

        if success:
            print("="*80)
            print("  SCRIPT TERMINÉ AVEC SUCCÈS")
            print("="*80)
            sys.exit(0)
        else:
            print("="*80)
            print("  ÉCHEC DU SCRIPT")
            print("="*80)
            sys.exit(1)

    except Exception as e:
        print()
        print("="*80)
        print(f"  ❌ ERREUR: {str(e)}")
        print("="*80)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
