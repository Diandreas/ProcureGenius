"""
List all lab tests in the DB to match with Excel stock items.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import LabTest
from apps.invoicing.models import Product

# All Excel stock items
excel_items = [
    ('79', 'Safe AQ pro I - 50 pcs test strips/box'),
    ('80', 'Safe AQ pro I - 50 pcs blood lancets/box'),
    ('81', 'HBsAg-W23'),
    ('82', 'HCV-W23'),
    ('83', 'HIV-W23'),
    ('84', 'SYP-W23'),
    ('85', 'H111-23U - hCG Pregnancy Test'),
    ('86', 'H112-23U - LH Ovulation Test'),
    ('87', 'H121-23W - HAV Hepatitis A IgM'),
    ('88', 'H122-43W - HBV 5-in-1'),
    ('89', 'H123-23W - HBsAg'),
    ('90', 'H124-23W - HBsAb'),
    ('91', 'H125-23W - HBeAg'),
    ('92', 'H126-23W - HBeAb'),
    ('93', 'H127-23W - HBcAb'),
    ('95', 'H129-23W - HEV IgM'),
    ('97', 'H132-23W - HIV 1/2 Ab'),
    ('99', 'H134-23S - Gonorrhea Ag'),
    ('100', 'H135-23S - Chlamydia Ag'),
    ('101', 'H136-23P - Chlamydia Ab'),
    ('102', 'H144-23W - H.Pylori Ab'),
    ('103', 'H145-23F - H.Pylori Ag'),
    ('104', 'H146-23W - Malaria P.f.'),
    ('105', 'H147-23W - Malaria P.v.'),
    ('106', 'H148-23W - Malaria P.f./P.v.'),
    ('107', 'H149-23W'),
    ('108', 'H1410-23W'),
    ('109', 'H181-23WM - Toxo IgM?'),
    ('110', 'H181-23WG - Toxo IgG?'),
    ('111', 'H184-23WM - Herpes 1/2 IgM?'),
    ('112', 'H184-23WG - Herpes 1/2 IgG?'),
    ('113', 'H185-23WM - Rubella IgM?'),
    ('114', 'H185-23WG - Rubella IgG?'),
    ('118', 'BH-14H - Blood tubes'),
    ('119', 'DR002-1'),
    ('120', 'DR004-1'),
    ('119-120', 'DR018-2'),
    ('122', 'DR020-2'),
    ('123', 'DR019-2'),
    ('124', 'DR024-2'),
    ('125', 'DR022-2'),
    ('126', 'DR063-2'),
    ('127', 'DR064-2'),
    ('128', 'DR016-1'),
    ('129', 'DR061-2'),
    ('130', 'DR062-2'),
    ('131', 'DR077-2'),
    ('132', 'DR021-2'),
    ('133', 'DR023-2'),
    ('134', 'DR057-4'),
]

print("══════════════════════════════════════════")
print("  LAB TESTS IN DB — Current state")
print("══════════════════════════════════════════\n")

tests = LabTest.objects.filter(is_active=True).order_by('test_code', 'name')
for t in tests:
    linked = t.linked_product.name if t.linked_product else '❌ NON LIÉ'
    print(f"  [{t.test_code}] {t.name}")
    print(f"    → linked: {linked}")
    print()

print(f"\nTotal: {tests.count()} tests actifs")
print(f"Liés: {tests.filter(linked_product__isnull=False).count()}")
print(f"Non liés: {tests.filter(linked_product__isnull=True).count()}")

# Try auto-matching
print("\n\n══════════════════════════════════════════")
print("  AUTO-MATCH SUGGESTIONS")
print("══════════════════════════════════════════\n")

for t in tests:
    if t.linked_product:
        continue
    name_lower = t.name.lower()
    code_lower = (t.test_code or '').lower()
    
    # Try to match Excel items by keywords
    for num, produit in excel_items:
        prod_lower = produit.lower()
        # Check if test name/code matches product
        # Extract key words from test name
        words = [w for w in name_lower.replace('-', ' ').split() if len(w) > 2]
        match = False
        for w in words:
            if w in prod_lower:
                match = True
                break
        
        if match:
            print(f"  [{t.test_code}] {t.name}")
            print(f"    → match Excel: [{num}] {produit}")
            print()
            break  # Only first match
