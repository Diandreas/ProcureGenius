import os
import django
from django.conf import settings
from django.db import transaction, models

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saas_procurement.settings")
django.setup()

from apps.laboratory.models import LabTestCategory, LabTest

def merge_lab_categories():
    print("--- Starting Lab Test Category Merge ---")
    
    with transaction.atomic():
        # Get all categories
        all_categories = LabTestCategory.objects.all().order_by('created_at')
        
        groups = {}
        for cat in all_categories:
            norm_name = "".join(cat.name.lower().split())
            key = (cat.organization_id, norm_name)
            if key not in groups:
                groups[key] = []
            groups[key].append(cat)
        
        for key, cats in groups.items():
            if len(cats) > 1:
                # Decide which one is the master
                # Prefer the one with tests, then the oldest one
                cats_with_tests = sorted(cats, key=lambda c: c.tests.count(), reverse=True)
                master = cats_with_tests[0]
                others = cats_with_tests[1:]
                
                print("\n[GROUP] Normal name: '{}' | Merging {} instances".format(key[1], len(cats)))
                print("  -> MASTER: {} (ID: {}, Slug: {}, Tests: {})".format(
                    master.name, master.id, master.slug, master.tests.count()
                ))
                
                for other in others:
                    print("  <- MERGING: {} (ID: {}, Slug: {}, Tests: {})".format(
                        other.name, other.id, other.slug, other.tests.count()
                    ))
                    
                    # Transfer tests to master category
                    LabTest.objects.filter(category=other).update(category=master)
                    
                    # Delete the duplicate category
                    other.delete()
                    print("     Duplicate deleted.")

    print("\n--- Lab Category Merge Complete ---")

if __name__ == "__main__":
    merge_lab_categories()
