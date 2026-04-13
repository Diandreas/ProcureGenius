"""
Management command: link_lab_stock
Lie les LabTests aux produits de stock existants (ou cree si vraiment absent).

Usage:
  python manage.py link_lab_stock           # Mode ecriture
  python manage.py link_lab_stock --dry-run # Simulation

Strategie :
  - Cherche d'abord par reference exacte dans la DB locale
  - Puis par nom exact (iexact)
  - Puis par mots-cles significatifs
  - NE CREE un produit QUE si aucun match trouve nulle part
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.invoicing.models import Product, ProductCategory
from apps.laboratory.models import LabTest


# ==============================================================================
# MAPPING : test_code -> (refs_candidates, name_keywords)
#
# Pour chaque LabTest, on liste dans l'ordre de preference :
#   - Les references exactes des produits deja en DB
#   - Des mots-cles de fallback pour la recherche par nom
#
# Refs DB reelles (verifiees sur la DB locale) :
#   PRD-20260302-0008  HBsAg Hepatitis B Surface Ag Test
#   PRD-20260301-0038  HBsAg Rapid Test Cassette
#   PRD-20260302-0001  HCV Rapid Test Cassette
#   PRD-20260302-0014  HIV 1/2 Ab Test (Tri-lines)
#   PRD-20260302-0002  HIV 1/2 Test Cassette
#   PRD-20260302-0004  hCG Pregnancy Test
#   PRD-20260302-0005  Lh Ovulation Test
#   PRD-20260302-0006  HAV Hepatitis A Virus Ab IgM Test
#   PRD-20260302-0007  HBV Hepatitis B Virus 5-in-1 Test
#   PRD-20260302-0009  HBsAb Hepatitis B Surface Ab Test
#   PRD-20260302-0010  HBeAg Hepatitis B Envelope Ag Test
#   PRD-20260302-0011  HBeAb Hepatitis B Envelope Ab Test
#   PRD-20260302-0012  HBcAb Hepatitis B Core Ab Test
#   PRD-20260302-0013  HEV Hepatitis E Virus Ab IgM Test
#   PRD-20260302-0015  Gonorrhea Ag Test
#   PRD-20260302-0016  Chlamydia Trachomatis Ag Test
#   PRD-20260302-0017  Chlamydia Trachomatis Ab Test
#   PRD-20260302-0018  H.Pylori Ab Test
#   PRD-20260302-0019  H.Pylor Ag Test
#   PRD-20260302-0020  Malaria P.f. Ag Test
#   PRD-20260302-0021  Malaria P.v. Ag Test
#   PRD-20260302-0022  Malaria P.f./P.v. Ag Test
#   PRD-20260302-0023  Malaria P.f./Pan Ag Test
#   PRD-20260302-0025  TOXO Toxoplasma Ab IgM Test
#   PRD-20260302-0026  TOXO Toxoplasma Ab IgG Test
#   PRD-20260302-0027  HSV-I Herpes Simplex Virus I Ab IgG Test
#   PRD-20260302-0028  HSV-I Herpes Simplex Virus I Ab IgM Test
#   PRD-20260302-0029  H185-23WM HSV-II Herpes Simplex Virus II Ab IgM Test
#   PRD-20260302-0030  H185-23WG HSV-II Herpes Simplex Virus II Ab IgG Test
#   PRD-20260302-0041  Hemoglobin A1c (HbA1C) Test Kit
#   PRD-20260302-0044  Anti streptolysin O (ASO) Test Kit
#   PRD-20260305-0053  Safe AQ pro I - 50 pcs test strips/box
#   PRD-20260305-0054  Safe AQ pro I - 50 pcs blood lancets/box
#   PRD-20260305-0086  Anti-Streptolysin O  (reactif automate -> pas le kit rapide)
#   PRD-20260305-0087  C Reactive Protein   (reactif automate)
# ==============================================================================

# (test_code, [refs_en_ordre_de_preference], [mots_cles_fallback])
MAPPINGS = [
    # -- Hepatite B -----------------------------------------------------
    ('SERO-H',         ['PRD-20260302-0008', 'PRD-20260301-0038'], ['HBsAg', 'Hepatitis B Surface Ag']),
    ('SERO-HBSAb',     ['PRD-20260302-0009'],                      ['HBsAb', 'Hepatitis B Surface Ab']),
    ('SERO-HBV pack',  ['PRD-20260302-0007'],                      ['HBV', '5-in-1']),
    ('SERO-HBe-Ag Env',['PRD-20260302-0010'],                      ['HBeAg', 'Envelope Ag']),
    ('SERO-HBe-Ab Env',['PRD-20260302-0011'],                      ['HBeAb', 'Envelope Ab']),
    ('SERO-HBcAb',     ['PRD-20260302-0012'],                      ['HBcAb', 'Core Ab']),
    # -- Hepatite A/C/E -------------------------------------------------
    ('SERO-HEPA',      ['PRD-20260302-0006'],                      ['HAV', 'Hepatitis A']),
    ('SERO-HCV',       ['PRD-20260302-0001'],                      ['HCV', 'Rapid Test Cassette']),
    ('SERO-HEV',       ['PRD-20260302-0013'],                      ['HEV', 'Hepatitis E']),
    # -- VIH / Syphilis -------------------------------------------------
    ('SERO-HIV',       ['PRD-20260302-0014', 'PRD-20260302-0002'], ['HIV', 'Ab Test']),
    ('SERO-SYPH',      [],                                         ['Syphilis', 'Rapid Test']),
    # -- Malaria --------------------------------------------------------
    ('SERO-MAL P.F',        ['PRD-20260302-0020'], ['Malaria', 'P.f.', 'Ag Test']),
    ('MAL-P.V Ag',          ['PRD-20260302-0021'], ['Malaria', 'P.v.', 'Ag Test']),
    ('SERO-MAL P.F / P.V Ag',['PRD-20260302-0022'],['Malaria', 'P.f./P.v.']),
    ('SERO-MAL P.F/PAN Ag', ['PRD-20260302-0023'], ['Malaria', 'Pan']),
    ('SERO-MAL PAN',        ['PRD-20260302-0023'], ['Malaria', 'Pan']),
    # -- Chlamydia / Gonorrhee ------------------------------------------
    ('SERO-CHLAM Ag',  ['PRD-20260302-0016'], ['Chlamydia', 'Trachomatis Ag']),
    ('SERO-CHLAM Ab',  ['PRD-20260302-0017'], ['Chlamydia', 'Trachomatis Ab']),
    ('BACT-GONOR',     ['PRD-20260302-0015'], ['Gonorrhea', 'Ag Test']),
    # -- H.Pylori -------------------------------------------------------
    ('SERO-H.Pyl',     ['PRD-20260302-0018'], ['H.Pylori', 'Ab Test']),
    ('BACT-H.Pyl',     ['PRD-20260302-0019'], ['H.Pylor', 'Ag Test']),
    # -- Grossesse / Ovulation ------------------------------------------
    ('HORM-HCG',       ['PRD-20260302-0004'], ['hCG', 'Pregnancy']),
    ('HORM-LH OV',     ['PRD-20260302-0005'], ['Lh Ovulation', 'Ovulation Test']),
    # -- Toxoplasmose ---------------------------------------------------
    # IgM et IgG -> produits separes en DB
    ('SERO-TOXO',      ['PRD-20260302-0025'], ['TOXO', 'IgM']),
    # -- Herpes ---------------------------------------------------------
    ('SERO-HERPES HSV-I',  ['PRD-20260302-0027'], ['HSV-I', 'Herpes', 'IgG']),
    ('SERO-HERPES HSV-II', ['PRD-20260302-0029'], ['HSV-II', 'Herpes']),
    # -- Rubeole --------------------------------------------------------
    # Pas de produit Rubeole trouve en DB -> sera cree si absent
    ('SERO-RUBEO',     [], ['Rubella', 'Rubeole', 'IgM']),
    # -- Biochimie ------------------------------------------------------
    # ASO test rapide -> PRD-20260302-0044 "Anti streptolysin O (ASO) Test Kit"
    # (PRD-20260305-0086 = reactif automate, different)
    ('BIO-ASLO',       ['PRD-20260302-0044'], ['Anti streptolysin', 'ASO Test Kit']),
    # CRP dosage quantitatif automate -> PRD-20260305-0087 "C Reactive Protein"
    ('BIO-CRP-H',      ['PRD-20260305-0087'], ['C Reactive Protein']),
    # HbA1c
    ('HEM-HBA1C',      ['PRD-20260302-0041'], ['HbA1c', 'Hemoglobin A1c']),
    ('HORM-HBA1C',     ['PRD-20260302-0041'], ['HbA1c', 'Hemoglobin A1c']),
    # -- Glycemie -------------------------------------------------------
    # Test strips (bandelettes) pour glycemie
    ('BIO-GLU',   ['PRD-20260305-0053'], ['Safe AQ', 'test strips']),
    ('BIO-GLUPP', ['PRD-20260305-0053'], ['Safe AQ', 'test strips']),
    # -- Groupe sanguin -------------------------------------------------
    # Pas de produit "groupe sanguin" rapide trouve -> sera cree si absent
    ('HEM-GS',    [], ['ABO', 'Rh', 'groupe sanguin', 'blood group']),
]


# Produits a creer SEULEMENT s'ils sont vraiment absents en DB
# (apres verification par reference ET par nom ET par mots-cles)
PRODUCTS_TO_CREATE_IF_MISSING = [
    # (name, reference, qty, description, search_keywords)
    ('Syphilis Rapid Test Cassette', 'SYP-W23', 100,
     'Syphilis (TPHA/VDRL) Rapid Test Cassette (Whole blood/Serum/Plasma)',
     ['Syphilis', 'Rapid Test']),
    ('Rubella IgG/IgM Rapid Test', 'H185-23WM', 25,
     'Rubeole IgG/IgM Rapid Test',
     ['Rubella', 'Rubeole', 'IgM']),
    ('ABO/Rh Blood Grouping Reagents', 'DR077-2', 20,
     'Reactifs de groupage sanguin ABO/Rh',
     ['ABO', 'Rh', 'blood group', 'groupe sanguin']),
]


def resolve_product(refs, keywords):
    """
    Cherche un produit existant :
      1. Par chaque reference dans la liste (ordre de preference)
      2. Par nom icontains avec tous les mots-cles (premier combo qui donne 1 resultat)
    Retourne (product, match_type) ou (None, None).
    """
    # 1. References exactes
    for ref in refs:
        p = Product.objects.filter(reference=ref, is_active=True).first()
        if p:
            return p, f'ref:{ref}'

    # 2. Mots-cles (tous doivent matcher)
    if keywords:
        qs = Product.objects.filter(is_active=True)
        for kw in keywords:
            qs = qs.filter(name__icontains=kw)
        results = list(qs)
        if len(results) == 1:
            return results[0], f'keywords:{keywords}'
        if len(results) > 1:
            # Plusieurs resultats -> prendre le premier mais signaler
            return results[0], f'keywords-ambig({len(results)}):{keywords}'

    return None, None


class Command(BaseCommand):
    help = 'Lie les LabTests aux produits de stock (DB locale). Cree uniquement si vraiment absent.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans modifications')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        mode = 'SIMULATION' if dry_run else 'ECRITURE'

        self.stdout.write(f'\n{"=" * 70}')
        self.stdout.write(f'  LINK LAB STOCK -> LAB TESTS -> Mode: {mode}')
        self.stdout.write(f'{"=" * 70}\n')

        cat, _ = ProductCategory.objects.get_or_create(
            slug='lab-consumables',
            defaults={'name': 'Consommables de laboratoire', 'is_active': True}
        )

        # -- Etape 1 : Pre-resoudre les produits a creer si manquants ----------
        self.stdout.write('-- Etape 1 : Verification produits a creer si absents --\n')
        extra_products = {}  # ref -> Product (ceux crees ici si besoin)

        for name, ref, qty, desc, kws in PRODUCTS_TO_CREATE_IF_MISSING:
            product, match = resolve_product([ref], kws)
            if product:
                stock_val = product.total_stock if hasattr(product, 'total_stock') else product.stock_quantity
                self.stdout.write(f'  [EXISTE  ({match})] "{product.name}" (stock={stock_val})')
                extra_products[ref] = product
            else:
                self.stdout.write(f'  [ABSENT -> CREATION] "{name}" ref={ref}')
                if not dry_run:
                    product = Product.objects.create(
                        name=name, reference=ref, category=cat,
                        product_type='physical', stock_quantity=qty,
                        cost_price=0, price=0, is_active=True,
                        low_stock_threshold=5, description=desc,
                    )
                    extra_products[ref] = product

        # -- Etape 2 : Liaison LabTests -> Produits -----------------------------
        self.stdout.write('\n-- Etape 2 : Liaison LabTests -> Produits --\n')

        linked_count = 0
        already_linked = []
        not_found_tests = []
        not_found_products = []

        for test_code, refs, keywords in MAPPINGS:
            test = LabTest.objects.filter(test_code=test_code, is_active=True).first()
            if not test:
                not_found_tests.append(test_code)
                self.stdout.write(f'  [!TEST ABSENT ] [{test_code}]')
                continue

            if test.linked_product:
                already_linked.append(test_code)
                stock_val = test.linked_product.total_stock if hasattr(test.linked_product, 'total_stock') else test.linked_product.stock_quantity
                self.stdout.write(f'  [=DEJA LIE    ] [{test_code:20s}] -> "{test.linked_product.name}" (stock={stock_val})')
                continue

            # Chercher le produit (refs DB + extra_products + keywords)
            all_refs = refs + list(extra_products.keys())
            product, match = resolve_product(all_refs, keywords)

            # Fallback : chercher dans extra_products par keywords aussi
            if not product:
                for ep_ref, ep_prod in extra_products.items():
                    if any(kw.lower() in ep_prod.name.lower() for kw in keywords):
                        product, match = ep_prod, f'extra:{ep_ref}'
                        break

            if product:
                stock_val = product.total_stock if hasattr(product, 'total_stock') else product.stock_quantity
                self.stdout.write(
                    f'  [OK ({match[:35]:35s})] [{test_code:20s}] {test.name[:35]:35s} -> "{product.name[:40]}" (stock={stock_val})'
                )
                if not dry_run:
                    test.linked_product = product
                    test.save(update_fields=['linked_product'])
                linked_count += 1
            else:
                not_found_products.append((test_code, refs, keywords))
                self.stdout.write(f'  [!PROD ABSENT ] [{test_code:20s}] refs={refs} keywords={keywords}')

        # -- Resume ------------------------------------------------------------
        self.stdout.write(f'\n{"=" * 70}')
        self.stdout.write(f'  LabTests lies       : {linked_count}')
        self.stdout.write(f'  Deja lies (ignores) : {len(already_linked)}')
        if not_found_tests:
            self.stdout.write(f'  Tests absents en DB : {not_found_tests}')
        if not_found_products:
            self.stdout.write(f'  Produits introuvables ({len(not_found_products)}) :')
            for tc, refs, kws in not_found_products:
                self.stdout.write(f'    [{tc}] refs={refs} kws={kws}')
        self.stdout.write(f'{"=" * 70}\n')

        if dry_run:
            self.stdout.write('  DRY-RUN -> Aucune modification enregistree.\n')
        else:
            self.stdout.write('  Termine !\n')
