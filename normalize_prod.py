import os
import django
import json
from django.utils.text import slugify

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabTest, LabTestCategory, LabTestParameter, LabOrder, LabOrderItem, LabResultValue
from apps.accounts.models import Client, Organization
from django.db import transaction
from django.db.models import Count

def smart_repair(json_file):
    if not os.path.exists(json_file):
        print(f"Erreur : Le fichier {json_file} est introuvable.")
        return

    print(f"--- RESTAURATION TOTALE V5 VIA {json_file} ---")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with transaction.atomic():
        # 1. Synchronisation des categories
        print("-> 1/5 Synchronisation des categories...")
        cat_map = {} 
        for entry in data:
            if entry['model'] == 'laboratory.labtestcategory':
                fields = entry['fields']
                obj, created = LabTestCategory.objects.update_or_create(
                    slug=slugify(fields['name']),
                    organization_id=fields['organization'],
                    defaults={'name': fields['name'], 'description': fields.get('description', '')}
                )
                cat_map[entry['pk']] = obj

        # 2. Fusion des Tests
        print("-> 2/5 Synchronisation du catalogue de tests...")
        test_map = {}
        for entry in data:
            if entry['model'] == 'laboratory.labtest':
                fields = entry['fields']
                obj, created = LabTest.objects.update_or_create(
                    test_code=fields['test_code'],
                    organization_id=fields['organization'],
                    defaults={
                        'name': fields['name'],
                        'price': fields.get('price', 0),
                        'category': cat_map.get(fields['category']),
                        'use_large_layout': fields.get('use_large_layout', False),
                        'unit_of_measurement': fields.get('unit_of_measurement', ''),
                        'result_template': fields.get('result_template', ''),
                    }
                )
                test_map[entry['pk']] = obj

        # 3. Restauration des Parametres
        print("-> 3/5 Restauration des normes et unites...")
        param_map = {}
        for entry in data:
            if entry['model'] == 'laboratory.labtestparameter':
                fields = entry['fields']
                # Utilisation de 'test' au lieu de 'lab_test' (vu dans models.py)
                test_key = fields.get('test')
                test_obj = test_map.get(test_key)
                if test_obj:
                    obj, created = LabTestParameter.objects.update_or_create(
                        test=test_obj,
                        code=fields['code'],
                        defaults={
                            'name': fields['name'],
                            'unit': fields.get('unit', ''),
                            'adult_ref_min_general': fields.get('adult_ref_min_general'),
                            'adult_ref_max_general': fields.get('adult_ref_max_general'),
                        }
                    )
                    param_map[entry['pk']] = obj

        # 4. Restauration des Commandes et Items
        print("-> 4/5 Restauration des commandes patients et resultats simples...")
        order_map = {}
        item_map = {}
        for entry in data:
            if entry['model'] == 'laboratory.laborder':
                fields = entry['fields']
                # Verifier si le patient existe, sinon on ne peut pas creer la commande
                if Client.objects.filter(id=fields['patient']).exists():
                    obj, created = LabOrder.objects.update_or_create(
                        order_number=fields['order_number'],
                        organization_id=fields['organization'],
                        defaults={
                            'patient_id': fields['patient'],
                            'order_date': fields['order_date'],
                            'status': fields['status'],
                            'biologist_diagnosis': fields.get('biologist_diagnosis', ''),
                        }
                    )
                    order_map[entry['pk']] = obj
            
            if entry['model'] == 'laboratory.laborderitem':
                fields = entry['fields']
                order_obj = order_map.get(fields['lab_order'])
                test_obj = test_map.get(fields['lab_test'])
                if order_obj and test_obj:
                    obj, created = LabOrderItem.objects.update_or_create(
                        lab_order=order_obj,
                        lab_test=test_obj,
                        defaults={
                            'result_value': fields.get('result_value', ''),
                            'result_numeric': fields.get('result_numeric'),
                            'technician_notes': fields.get('technician_notes', ''),
                        }
                    )
                    item_map[entry['pk']] = obj

        # 5. Valeurs de Parametres (NFS, etc.)
        print("-> 5/5 Restauration des valeurs detaillees (NFS, etc.)...")
        val_count = 0
        for entry in data:
            if entry['model'] == 'laboratory.labresultvalue':
                fields = entry['fields']
                item_obj = item_map.get(fields['order_item'])
                param_obj = param_map.get(fields['parameter'])
                if item_obj and param_obj:
                    LabResultValue.objects.update_or_create(
                        order_item=item_obj,
                        parameter=param_obj,
                        defaults={
                            'result_numeric': fields.get('result_numeric'),
                            'result_text': fields.get('result_text', ''),
                            'flag': fields.get('flag', 'N'),
                        }
                    )
                    val_count += 1
        print(f"-> {val_count} valeurs detaillees restaurees.")

    print("\n--- RESTAURATION TERMINEE AVEC SUCCES ---")

if __name__ == "__main__":
    smart_repair('REPARATION_FINALE_LABO.json')
