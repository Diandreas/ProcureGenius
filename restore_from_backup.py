"""
Script de restauration des paramètres et résultats depuis la backup SQLite.

Usage:
    python manage.py shell < restore_from_backup.py
    # ou
    python restore_from_backup.py (si DJANGO_SETTINGS_MODULE est défini)
"""
import sqlite3
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabTestParameter, LabResultValue, LabOrderItem, LabTest
from django.db import transaction
import uuid

BACKUP_PATH = 'db_backup_before_merge.sqlite3'

conn = sqlite3.connect(BACKUP_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ─────────────────────────────────────────────────────────────────
# 1. Restaurer les paramètres de TOUS les tests structurés
# ─────────────────────────────────────────────────────────────────
print("\n=== RESTAURATION DES PARAMÈTRES ===")

cur.execute("SELECT id, test_code, name FROM laboratory_labtest ORDER BY test_code")
backup_tests = cur.fetchall()

restored_params = 0
skipped_params = 0

with transaction.atomic():
    for bt in backup_tests:
        backup_test_id = bt['id']
        test_code = bt['test_code']

        # Trouver le test correspondant dans la prod
        try:
            prod_test = LabTest.objects.get(test_code=test_code)
        except LabTest.DoesNotExist:
            continue

        # Lire les paramètres depuis la backup
        cur.execute(
            "SELECT * FROM laboratory_labtestparameter WHERE test_id=? ORDER BY display_order",
            (backup_test_id,)
        )
        backup_params = cur.fetchall()
        if not backup_params:
            continue

        print(f"\n[{test_code}] {prod_test.name}")
        print(f"  Paramètres dans backup: {len(backup_params)}")

        for bp in backup_params:
            code = bp['code']

            # Vérifier si ce paramètre existe déjà en prod (par code)
            existing = LabTestParameter.objects.filter(test=prod_test, code=code).first()

            if existing:
                # Mettre à jour avec les valeurs de la backup
                existing.name = bp['name'] or existing.name
                existing.group_name = bp['group_name'] or ''
                existing.display_order = bp['display_order'] or 0
                existing.unit = bp['unit'] or ''
                existing.base_unit = bp['base_unit'] or ''
                existing.conversion_factor = bp['conversion_factor'] or 1.0
                existing.value_type = bp['value_type'] or 'numeric'
                existing.decimal_places = bp['decimal_places'] or 2
                existing.is_required = bool(bp['is_required'])
                existing.adult_ref_min_male = bp['adult_ref_min_male']
                existing.adult_ref_max_male = bp['adult_ref_max_male']
                existing.adult_ref_min_female = bp['adult_ref_min_female']
                existing.adult_ref_max_female = bp['adult_ref_max_female']
                existing.adult_ref_min_general = bp['adult_ref_min_general']
                existing.adult_ref_max_general = bp['adult_ref_max_general']
                existing.child_ref_min = bp['child_ref_min']
                existing.child_ref_max = bp['child_ref_max']
                existing.child_age_max_years = bp['child_age_max_years'] or 17
                existing.critical_low = bp['critical_low']
                existing.critical_high = bp['critical_high']
                existing.is_active = True
                existing.save()
                print(f"  [=] MAJ: {code} - {bp['name']}")
                skipped_params += 1
            else:
                # Créer le paramètre avec le même UUID que la backup
                try:
                    param_id = str(bp['id'])
                    # Formater l'UUID si nécessaire (sans tirets → avec tirets)
                    if len(param_id) == 32:
                        param_id = f"{param_id[0:8]}-{param_id[8:12]}-{param_id[12:16]}-{param_id[16:20]}-{param_id[20:32]}"

                    LabTestParameter.objects.create(
                        id=param_id,
                        test=prod_test,
                        code=code,
                        name=bp['name'] or '',
                        group_name=bp['group_name'] or '',
                        display_order=bp['display_order'] or 0,
                        unit=bp['unit'] or '',
                        base_unit=bp['base_unit'] or '',
                        conversion_factor=bp['conversion_factor'] or 1.0,
                        value_type=bp['value_type'] or 'numeric',
                        decimal_places=bp['decimal_places'] or 2,
                        is_required=bool(bp['is_required']),
                        adult_ref_min_male=bp['adult_ref_min_male'],
                        adult_ref_max_male=bp['adult_ref_max_male'],
                        adult_ref_min_female=bp['adult_ref_min_female'],
                        adult_ref_max_female=bp['adult_ref_max_female'],
                        adult_ref_min_general=bp['adult_ref_min_general'],
                        adult_ref_max_general=bp['adult_ref_max_general'],
                        child_ref_min=bp['child_ref_min'],
                        child_ref_max=bp['child_ref_max'],
                        child_age_max_years=bp['child_age_max_years'] or 17,
                        critical_low=bp['critical_low'],
                        critical_high=bp['critical_high'],
                        is_active=True,
                    )
                    print(f"  [+] Créé: {code} - {bp['name']}")
                    restored_params += 1
                except Exception as e:
                    print(f"  [!] Erreur {code}: {e}")

print(f"\nParamètres: {restored_params} créés, {skipped_params} mis à jour")

# ─────────────────────────────────────────────────────────────────
# 2. Restaurer les résultats (LabResultValue)
# ─────────────────────────────────────────────────────────────────
print("\n=== RESTAURATION DES RÉSULTATS ===")

cur.execute("SELECT * FROM laboratory_labresultvalue")
backup_results = cur.fetchall()
print(f"Résultats dans backup: {len(backup_results)}")

restored_results = 0
skipped_results = 0
errors_results = 0

with transaction.atomic():
    for br in backup_results:
        # Formater les UUIDs
        def fmt_uuid(raw):
            if not raw:
                return None
            raw = str(raw).replace('-', '')
            if len(raw) == 32:
                return f"{raw[0:8]}-{raw[8:12]}-{raw[12:16]}-{raw[16:20]}-{raw[20:32]}"
            return raw

        result_id = fmt_uuid(br['id'])
        order_item_id = fmt_uuid(br['order_item_id'])
        parameter_id = fmt_uuid(br['parameter_id'])

        # Vérifier que l'order_item existe en prod
        try:
            order_item = LabOrderItem.objects.get(id=order_item_id)
        except LabOrderItem.DoesNotExist:
            skipped_results += 1
            continue

        # Vérifier que le paramètre existe en prod
        try:
            parameter = LabTestParameter.objects.get(id=parameter_id)
        except LabTestParameter.DoesNotExist:
            # Chercher par code dans le même test
            skipped_results += 1
            continue

        # Vérifier si ce résultat existe déjà
        if LabResultValue.objects.filter(order_item=order_item, parameter=parameter).exists():
            skipped_results += 1
            continue

        try:
            LabResultValue.objects.create(
                id=result_id,
                order_item=order_item,
                parameter=parameter,
                result_numeric=br['result_numeric'],
                result_text=br['result_text'] or '',
                flag=br['flag'] or 'N',
                entered_at=br['entered_at'],
                entered_by_id=None,
            )
            restored_results += 1
        except Exception as e:
            print(f"  [!] Erreur résultat {result_id}: {e}")
            errors_results += 1

print(f"Résultats: {restored_results} restaurés, {skipped_results} ignorés (item/param introuvable ou déjà existant), {errors_results} erreurs")

conn.close()
print("\n=== TERMINÉ ===")
