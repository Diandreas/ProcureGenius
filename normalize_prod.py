import os
import django
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabTest, LabTestCategory, LabTestParameter, LabOrder
from django.db import transaction
from django.db.models import Count

def smart_repair(json_file):
    if not os.path.exists(json_file):
        print(f"Erreur : Le fichier {json_file} est introuvable.")
        return

    print(f"--- DEMARRAGE DE LA REPARATION INTELLIGENTE VIA {json_file} ---")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with transaction.atomic():
        # 1. Restaurer les catégories d'abord
        print("-> Restauration des categories...")
        cat_map = {} # Pour lier les tests aux bonnes categories
        for entry in data:
            if entry['model'] == 'laboratory.labtestcategory':
                fields = entry['fields']
                obj, created = LabTestCategory.objects.update_or_create(
                    name=fields['name'],
                    organization_id=fields['organization'],
                    defaults={'description': fields.get('description', '')}
                )
                cat_map[entry['pk']] = obj
                if created: print(f"   + Categorie creee : {obj.name}")

        # 2. Restaurer les Tests (Fusion par Code)
        print("-> Fusion des tests (evite les conflits de doublons)...")
        test_map = {}
        for entry in data:
            if entry['model'] == 'laboratory.labtest':
                fields = entry['fields']
                # On cherche par Code + Organisation (la contrainte qui bloquait)
                obj, created = LabTest.objects.update_or_create(
                    test_code=fields['test_code'],
                    organization_id=fields['organization'],
                    defaults={
                        'name': fields['name'],
                        'short_name': fields.get('short_name', ''),
                        'price': fields.get('price', 0),
                        'unit_of_measurement': fields.get('unit_of_measurement', ''),
                        'normal_range_general': fields.get('normal_range_general', ''),
                        'normal_range_male': fields.get('normal_range_male', ''),
                        'normal_range_female': fields.get('normal_range_female', ''),
                        'category': cat_map.get(fields['category']),
                        'use_large_layout': fields.get('use_large_layout', False),
                        'is_active': fields.get('is_active', True),
                    }
                )
                test_map[entry['pk']] = obj
                if created: print(f"   + Nouveau test ajoute : {obj.name}")

        # 3. Restaurer les Parametres (Ce qui manquait chez Boris)
        print("-> Restauration des parametres et des normes...")
        param_count = 0
        for entry in data:
            if entry['model'] == 'laboratory.labtestparameter':
                fields = entry['fields']
                test_obj = test_map.get(fields['lab_test'])
                if test_obj:
                    obj, created = LabTestParameter.objects.update_or_create(
                        lab_test=test_obj,
                        code=fields['code'],
                        defaults={
                            'name': fields['name'],
                            'unit': fields.get('unit', ''),
                            'value_type': fields.get('value_type', 'numeric'),
                            'adult_ref_min_general': fields.get('adult_ref_min_general'),
                            'adult_ref_max_general': fields.get('adult_ref_max_general'),
                            'adult_ref_min_male': fields.get('adult_ref_min_male'),
                            'adult_ref_max_male': fields.get('adult_ref_max_male'),
                            'adult_ref_min_female': fields.get('adult_ref_min_female'),
                            'adult_ref_max_female': fields.get('adult_ref_max_female'),
                        }
                    )
                    param_count += 1
        print(f"-> {param_count} parametres de tests synchronises.")

        # 4. Nettoyage final des categories vides
        empty_cats = LabTestCategory.objects.annotate(test_count=Count('tests')).filter(test_count=0)
        c_del = empty_cats.count()
        empty_cats.delete()
        print(f"-> {c_del} categories vides supprimees.")

    print("\n--- REPARATION REUSSIE : TOUTES LES DONNEES SONT RESTAUREES ---")

if __name__ == "__main__":
    smart_repair('REPARATION_FINALE_LABO.json')
