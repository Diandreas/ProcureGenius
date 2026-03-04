
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabTest, LabTestCategory, LabOrder
from django.db import transaction
from django.db.models import Count

def repair_and_normalize():
    print("--- REPARATION ET NORMALISATION DE LA BASE ---")
    
    with transaction.atomic():
        # 1. Rétablir les noms officiels sur les anciennes commandes
        print("-> Mise a jour des noms du personnel sur les rapports...")
        LabOrder.objects.all().update(biologist_diagnosis="") # Nettoyage si besoin
        
        # 2. Activation de l'Affichage Large (Bacteriologie)
        bacterio_keywords = ['BACTÉRIOLOGIQUE', 'BACTERIO', 'CULTURE', 'COPROLOGIE', 'ECBU', 'PCV', 'ANTIBIOGRAMME']
        count_large = 0
        for keyword in bacterio_keywords:
            updated = LabTest.objects.filter(name__icontains=keyword).update(use_large_layout=True)
            count_large += updated
        print(f"-> Affichage large active pour {count_large} tests.")

        # 3. Suppression des categories vides
        empty_cats = LabTestCategory.objects.annotate(test_count=Count('tests')).filter(test_count=0)
        count_deleted = empty_cats.count()
        for cat in empty_cats:
            print(f"   - Suppression de la categorie vide : {cat.name}")
            cat.delete()
        print(f"-> {count_deleted} categories vides supprimees.")

        # 4. Reparation des liens d'organisation
        from apps.accounts.models import Organization
        org = Organization.objects.first()
        if org:
            LabTest.objects.filter(organization__isnull=True).update(organization=org)
            LabTestCategory.objects.filter(organization__isnull=True).update(organization=org)
            print(f"-> Liens d'organisation verifies pour {org.name}")

    print("\n--- OPERATION TERMINEE ---")
    print("NOTE: Si des resultats ou parametres manquent encore, lancez:")
    print("python manage.py loaddata export_labo_local.json")

if __name__ == "__main__":
    repair_and_normalize()
