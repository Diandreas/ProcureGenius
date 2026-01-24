import sys
import os
import django
from pathlib import Path

# Add project root to sys.path
root = Path(r"d:\project\BFMa\ProcureGenius")
sys.path.append(str(root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.accounts.management.commands.julianna_data_parsers import parse_all_source_files

def test_parsers():
    soins_path = root / 'soins.md'
    medicament_path = root / 'medicament.md'
    html_path = root / 'g.html'
    
    print(f"Testing parsers with:")
    print(f"  Soins: {soins_path}")
    print(f"  Meds: {medicament_path}")
    print(f"  Lab: {html_path}")
    
    try:
        data = parse_all_source_files(str(soins_path), str(medicament_path), str(html_path))
        
        from apps.accounts.management.commands.julianna_medications_config import enrich_medication_data
        enriched_meds = enrich_medication_data(data['medications'])

        print("\nResults:")
        print(f"  Services: {len(data['services'])}")
        print(f"  Medications (consolidated + enriched): {len(enriched_meds)}")
        print(f"  Lab Tests: {len(data['lab_tests'])}")

        # Check for collisions in services
        service_refs = [s['code'] for s in data['services']]
        if len(service_refs) != len(set(service_refs)):
            print("\nWARNING: Duplicate service references found!")
            from collections import Counter
            dupes = [item for item, count in Counter(service_refs).items() if count > 1]
            print(f"  Duplicates: {dupes}")

        # Check for collisions in meds
        med_refs = [m['reference'] for m in enriched_meds]
        if len(med_refs) != len(set(med_refs)):
            print("\nWARNING: Duplicate medication references found!")
            from collections import Counter
            dupes = [item for item, count in Counter(med_refs).items() if count > 1]
            print(f"  Duplicates: {dupes}")
        
    except Exception as e:
        print(f"\nError: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_parsers()
