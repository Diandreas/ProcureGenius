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
print("  TOUS les produits avec 'vitamine'/'vitamin'/'ceftriaxone'/'paracétamol codé'")
print("══════════════════════════════════════════\n")

all_products = Product.objects.filter(is_active=True)
for kw in ['vitamine', 'vitamin', 'ceftriaxone', 'ceftriasone', 'paracétamol cod', 'paracetamol cod']:
    matches = [p for p in all_products if kw.lower() in p.name.lower()]
    if matches:
        print(f"\n📦 Mot-clé '{kw}':")
        for p in matches:
            print(f"     → '{p.name}' (stock={p.stock_quantity}, id={p.id})")

print("\nDone.")
