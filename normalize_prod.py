import os
import django
import json
from django.utils.text import slugify

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

    print(f"--- REPARATION ULTIME V3 VIA {json_file} ---")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with transaction.atomic():
        # 1. Synchronisation des categories
        print("-> Synchronisation des categories...")
        cat_map = {} 
        for entry in data:
            if entry['model'] == 'laboratory.labtestcategory':
                fields = entry['fields']
                s_name = fields['name']
                s_slug = slugify(s_name)
                org_id = fields['organization']
                
                obj = LabTestCategory.objects.filter(organization_id=org_id, slug=s_slug).first()
                if not obj:
                    obj = LabTestCategory.objects.filter(organization_id=org_id, name=s_name).first()
                
                if obj:
                    obj.description = fields.get('description', obj.description)
                    obj.save()
                else:
                    obj = LabTestCategory.objects.create(
                        name=s_name, slug=s_slug, organization_id=org_id,
                        description=fields.get('description', '')
                    )
                    print(f"   + Categorie creee : {obj.name}")
                cat_map[entry['pk']] = obj

        # 2. Fusion des Tests
        print("-> Fusion des tests (par Code)...")
        test_map = {}
        for entry in data:
            if entry['model'] == 'laboratory.labtest':
                fields = entry['fields']
                org_id = fields['organization']
                t_code = fields['test_code']
                
                obj = LabTest.objects.filter(organization_id=org_id, test_code=t_code).first()
                
                defaults = {
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

                if obj:
                    for key, value in defaults.items(): setattr(obj, key, value)
                    obj.save()
                else:
                    obj = LabTest.objects.create(test_code=t_code, organization_id=org_id, **defaults)
                    print(f"   + Test ajoute : {obj.name}")
                test_map[entry['pk']] = obj

        # 3. Restauration des Parametres (Correction du KeyError 'lab_test')
        print("-> Restauration des parametres (normes/unites)...")
        param_count = 0
        for entry in data:
            if entry['model'] == 'laboratory.labtestparameter':
                fields = entry['fields']
                # Le champ dans le JSON s'appelle 'test' et non 'lab_test'
                test_key = fields.get('test') 
                test_obj = test_map.get(test_key)
                
                if test_obj:
                    LabTestParameter.objects.update_or_create(
                        test=test_obj,
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

        # 4. Activation finale de la Bacteriologie
        print("-> Finalisation de l'affichage large...")
        bact_keys = ['BACTÉRIOLOGIQUE', 'BACTERIO', 'CULTURE', 'COPROLOGIE', 'ECBU', 'PCV']
        for k in bact_keys:
            LabTest.objects.filter(name__icontains=k).update(use_large_layout=True)

        # 5. Nettoyage
        empty_cats = LabTestCategory.objects.annotate(test_count=Count('tests')).filter(test_count=0)
        empty_cats.delete()

    print("\n--- REPARATION REUSSIE V3 ---")

if __name__ == "__main__":
    smart_repair('REPARATION_FINALE_LABO.json')
