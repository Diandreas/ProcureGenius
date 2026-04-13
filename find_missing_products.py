"""
Quick script to find products that the stock fix script couldn't locate.
Run on VPS: python find_missing_products.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

# Search terms used in fix_stock_april2026 that returned nothing
search_groups = [
    # (label, search_terms, exclude_keywords)
    ("Ceftriaxone 1g", ['ceftriaxone 1g', 'ceftriasone 1g', 'ceftriaxone 1 g'], []),
    ("Paracétamol codéine 500", ['paracétamol codéine 500', 'paracetamol codeine 500', 'paracetamol codéine 500'], []),
    ("Vitamine B comprimés", ['vitamine b', 'vitamin b', 'vit b', 'vitabmine b', 'vitamien b'], ['inj', 'injectable', 'amp', 'ampoule']),
    ("Vitamine B injectable", ['vitamine b complex inj', 'vitamin b complex inj', 'vitamine b complexe inj'], []),
]

print("══════════════════════════════════════════")
print("  RECHERCHE PRODUITS MANQUANTS")
print("══════════════════════════════════════════\n")

for label, terms, excludes in search_groups:
    found_any = False
    for term in terms:
        qs = Product.objects.filter(name__icontains=term, is_active=True)
        if excludes:
            for kw in excludes:
                qs = qs.exclude(name__icontains=kw)
        if qs.exists():
            found_any = True
            print(f"✅ [{label}] — trouvé avec '{term}':")
            for p in qs:
                print(f"     → '{p.name}' (stock={p.stock_quantity}, id={p.id})")
            print()

    # Also show close matches
    qs_all = Product.objects.filter(is_active=True)
    for term in terms:
        close = [p for p in qs_all if term.split()[0] in p.name.lower()]
        if close:
            print(f"🔍 [{label}] — similarités avec '{term.split()[0]}':")
            for p in close[:10]:
                print(f"     → '{p.name}' (stock={p.stock_quantity})")
            print()

# Also list ALL products containing "vitamine" or "vitamin"
print("\n══════════════════════════════════════════")
print("  RECHERCHE Ceftriaxone 1g & Vitamine B comprimés")
print("══════════════════════════════════════════\n")

all_products = Product.objects.filter(is_active=True)

# Broad search for Ceftriaxone
print("🔍 Ceftriaxone — tout produit contenant 'cef' ou 'tri':")
for p in all_products:
    name_lower = p.name.lower()
    if any(kw in name_lower for kw in ['ceftriax', 'ceftriat', 'ceftri', 'ceft', 'trifax']):
        print(f"     → '{p.name}' (stock={p.stock_quantity}, id={p.id})")

# Broad search for Vitamine B comprimés
print("\n🔍 Vitamine B comprimés — tout produit avec 'vitamine'/'vitamin' + 'b' mais PAS injectable:")
for p in all_products:
    name_lower = p.name.lower()
    if ('vitamine' in name_lower or 'vitamin' in name_lower) and 'b' in name_lower:
        if 'injectable' not in name_lower and 'inj' not in name_lower and 'amp' not in name_lower:
            print(f"     → '{p.name}' (stock={p.stock_quantity}, id={p.id})")

# Also list ALL products containing "cef"
print("\n🔍 TOUS les produits avec 'cef' (toutes céphalosporines):")
for p in all_products:
    if 'cef' in p.name.lower():
        print(f"     → '{p.name}' (stock={p.stock_quantity}, id={p.id})")

# All products with "vitamine" or "vitamin"
print("\n🔍 TOUS les produits avec 'vitamine'/'vitamin':")
for p in all_products:
    name_lower = p.name.lower()
    if 'vitamine' in name_lower or 'vitamin' in name_lower:
        print(f"     → '{p.name}' (stock={p.stock_quantity}, id={p.id})")

print("\nDone.")
