"""
Recherche exhaustive de TOUTES les vitamines B en DB locale
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Product

all_products = Product.objects.filter(is_active=True)

print("══════════════════════════════════════════")
print("  TOUS les produits avec 'vitamine' ou 'vitamin'")
print("══════════════════════════════════════════\n")

for p in all_products:
    name_lower = p.name.lower()
    if 'vitamine' in name_lower or 'vitamin' in name_lower:
        is_inj = any(kw in name_lower for kw in ['inj', 'injectable', 'amp', 'ampoule', 'iv', 'im', 'perfus'])
        forme = "INJECTABLE" if is_inj else "COMPRIMÉ/OTHER"
        print(f"  [{forme}] '{p.name}'")
        print(f"           stock={p.stock_quantity}, id={p.id}, ref={p.reference or '-'}, category={p.category}")
        if p.description:
            print(f"           desc: {p.description[:100]}")
        print()

print("══════════════════════════════════════════")
print("  TOUS les produits avec 'vit b' ou 'vitamine b' ou 'vitamin b'")
print("══════════════════════════════════════════\n")

for p in all_products:
    name_lower = p.name.lower()
    if any(kw in name_lower for kw in ['vit b', 'vitamine b', 'vitamin b', 'vitamines b', 'vitamins b', 'vit-b', 'vitamine-b']):
        is_inj = any(kw in name_lower for kw in ['inj', 'injectable', 'amp', 'ampoule'])
        forme = "INJECTABLE" if is_inj else "ORAL/COMPRIMÉ"
        print(f"  [{forme}] '{p.name}'")
        print(f"           stock={p.stock_quantity}, id={p.id}")
        print()

print("══════════════════════════════════════════")
print("  RECHERCHE par référence contenant 'vit b' / 'vitb' / 'b complex'")
print("══════════════════════════════════════════\n")

for p in all_products:
    ref = (p.reference or '').lower()
    if any(kw in ref for kw in ['vit b', 'vitb', 'b complex', 'bcomplex', 'vitamin b']):
        print(f"  → '{p.name}' (ref={p.reference}, stock={p.stock_quantity})")
        print()

print("Done.")
