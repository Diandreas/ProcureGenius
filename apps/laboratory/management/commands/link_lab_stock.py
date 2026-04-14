"""
Management command: link_lab_stock
Lie les LabTests aux consommables de stock via LabTestConsumable.
Supporte plusieurs produits par examen (ex: glycemie = bandelette + lancette).

Usage:
  python manage.py link_lab_stock           # Mode ecriture
  python manage.py link_lab_stock --dry-run # Simulation
  python manage.py link_lab_stock --reset   # Recrire toutes les liaisons

Source: "Liste des produits du labo a relier au stock.xlsx"

Refs DB verifiees localement :
  PRD-20260302-0008  HBsAg Hepatitis B Surface Ag Test
  PRD-20260302-0001  HCV Rapid Test Cassette
  PRD-20260302-0014  HIV 1/2 Ab Test (Tri-lines)
  PRD-20260302-0004  hCG Pregnancy Test
  PRD-20260302-0005  Lh Ovulation Test
  PRD-20260302-0006  HAV Hepatitis A Virus Ab IgM Test
  PRD-20260302-0007  HBV Hepatitis B Virus 5-in-1 Test
  PRD-20260302-0009  HBsAb Hepatitis B Surface Ab Test
  PRD-20260302-0010  HBeAg Hepatitis B Envelope Ag Test
  PRD-20260302-0011  HBeAb Hepatitis B Envelope Ab Test
  PRD-20260302-0012  HBcAb Hepatitis B Core Ab Test
  PRD-20260302-0013  HEV Hepatitis E Virus Ab IgM Test
  PRD-20260302-0015  Gonorrhea Ag Test
  PRD-20260302-0016  Chlamydia Trachomatis Ag Test
  PRD-20260302-0017  Chlamydia Trachomatis Ab Test
  PRD-20260302-0018  H.Pylori Ab Test
  PRD-20260302-0019  H.Pylor Ag Test
  PRD-20260302-0020  Malaria P.f. Ag Test
  PRD-20260302-0021  Malaria P.v. Ag Test
  PRD-20260302-0022  Malaria P.f./P.v. Ag Test
  PRD-20260302-0023  Malaria P.f./Pan Ag Test
  PRD-20260302-0025  TOXO Toxoplasma Ab IgM Test
  PRD-20260302-0027  HSV-I Herpes Simplex Virus I Ab IgM Test
  PRD-20260302-0029  H185-23WM HSV-II IgM Test
  PRD-20260302-0041  Hemoglobin A1c (HbA1C) Test Kit
  PRD-20260302-0044  Anti streptolysin O (ASO) Test Kit
  PRD-20260305-0053  Safe AQ pro I - test strips
  PRD-20260305-0054  Safe AQ pro I - blood lancets
  PRD-20260305-0087  C Reactive Protein (reactif automate)
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.invoicing.models import Product
from apps.laboratory.models import LabTest, LabTestConsumable


# ==============================================================================
# MAPPING MULTI-PRODUITS
#
# Format: (test_code, [ (refs_produit, qty_par_test, note), ... ])
#   - refs_produit : liste de refs DB en ordre de preference
#   - qty_par_test : unites deduites du stock a chaque test effectue
#   - note         : description du consommable
#
# Glycemie = 2 consommables : 1 bandelette + 1 lancette
# ==============================================================================

MAPPINGS = [
    # -- Hepatite B -------------------------------------------------------
    ('SERO-H',          [(['PRD-20260302-0008', 'PRD-20260301-0038'], 1, 'cassette HBsAg')]),
    ('SERO-HBSAb',      [(['PRD-20260302-0009'], 1, 'cassette HBsAb')]),
    ('SERO-HBV pack',   [(['PRD-20260302-0007'], 1, 'cassette HBV 5-in-1')]),
    ('SERO-HBe-Ag Env', [(['PRD-20260302-0010'], 1, 'cassette HBeAg')]),
    ('SERO-HBe-Ab Env', [(['PRD-20260302-0011'], 1, 'cassette HBeAb')]),
    ('SERO-HBcAb',      [(['PRD-20260302-0012'], 1, 'cassette HBcAb')]),
    # -- Hepatite A/C/E ---------------------------------------------------
    ('SERO-HEPA',       [(['PRD-20260302-0006'], 1, 'cassette HAV IgM')]),
    ('SERO-HCV',        [(['PRD-20260302-0001'], 1, 'cassette HCV')]),
    ('SERO-HEV',        [(['PRD-20260302-0013'], 1, 'cassette HEV IgM')]),
    # -- VIH --------------------------------------------------------------
    ('SERO-HIV',        [(['PRD-20260302-0014', 'PRD-20260302-0002'], 1, 'cassette HIV 1/2')]),
    # -- Syphilis (produit a creer si absent) -----------------------------
    ('SERO-SYPH',       [(['SYP-W23'], 1, 'cassette Syphilis')]),
    # -- Malaria ----------------------------------------------------------
    ('SERO-MAL P.F',          [(['PRD-20260302-0020'], 1, 'cassette Malaria Pf')]),
    ('MAL-P.V Ag',            [(['PRD-20260302-0021'], 1, 'cassette Malaria Pv')]),
    ('SERO-MAL P.F / P.V Ag', [(['PRD-20260302-0022'], 1, 'cassette Malaria Pf/Pv')]),
    ('SERO-MAL P.F/PAN Ag',   [(['PRD-20260302-0023'], 1, 'cassette Malaria Pf/Pan')]),
    ('SERO-MAL PAN',          [(['PRD-20260302-0023'], 1, 'cassette Malaria Pan')]),
    # -- Chlamydia / Gonorrhee --------------------------------------------
    ('SERO-CHLAM Ag',   [(['PRD-20260302-0016'], 1, 'cassette Chlamydia Ag')]),
    ('SERO-CHLAM Ab',   [(['PRD-20260302-0017'], 1, 'cassette Chlamydia Ab')]),
    ('BACT-GONOR',      [(['PRD-20260302-0015'], 1, 'cassette Gonorrhee Ag')]),
    # -- H.Pylori ---------------------------------------------------------
    ('SERO-H.Pyl',      [(['PRD-20260302-0018'], 1, 'cassette H.Pylori Ab')]),
    ('BACT-H.Pyl',      [(['PRD-20260302-0019'], 1, 'cassette H.Pylori Ag')]),
    # -- Grossesse / Ovulation --------------------------------------------
    ('HORM-HCG',        [(['PRD-20260302-0004'], 1, 'cassette hCG')]),
    ('HORM-LH OV',      [(['PRD-20260302-0005'], 1, 'cassette LH Ovulation')]),
    # -- Toxoplasmose IgM -------------------------------------------------
    ('SERO-TOXO',       [(['PRD-20260302-0025'], 1, 'cassette TOXO IgM')]),
    # -- Herpes -----------------------------------------------------------
    ('SERO-HERPES HSV-I',  [(['PRD-20260302-0027'], 1, 'cassette HSV-I IgM')]),
    ('SERO-HERPES HSV-II', [(['PRD-20260302-0029'], 1, 'cassette HSV-II IgM')]),
    # -- Rubeole (a creer si absent) --------------------------------------
    ('SERO-RUBEO',      [(['H185-23WM'], 1, 'cassette Rubeole IgM')]),
    # -- ASO test rapide --------------------------------------------------
    ('BIO-ASLO',        [(['PRD-20260302-0044'], 1, 'kit ASO rapide')]),
    # -- CRP automate -----------------------------------------------------
    ('BIO-CRP-H',       [(['PRD-20260305-0087'], 1, 'reactif CRP automate')]),
    # -- HbA1c ------------------------------------------------------------
    ('HEM-HBA1C',       [(['PRD-20260302-0041'], 1, 'kit HbA1c')]),
    ('HORM-HBA1C',      [(['PRD-20260302-0041'], 1, 'kit HbA1c')]),
    # -- Glycemie : 2 consommables simultanement --------------------------
    ('BIO-GLU', [
        (['PRD-20260305-0053'], 1, 'bandelette Safe AQ test strips'),
        (['PRD-20260305-0054'], 1, 'lancette Safe AQ blood lancets'),
    ]),
    ('BIO-GLUPP', [
        (['PRD-20260305-0053'], 1, 'bandelette Safe AQ test strips'),
        (['PRD-20260305-0054'], 1, 'lancette Safe AQ blood lancets'),
    ]),
    # -- Groupe sanguin (a creer si absent) -------------------------------
    ('HEM-GS',          [(['DR077-2'], 1, 'reactif groupage ABO/Rh')]),
]



def resolve_product(refs, keywords=None):
    """Trouve un produit par refs en ordre de preference, puis par mots-cles."""
    for ref in refs:
        p = Product.objects.filter(reference=ref, is_active=True).first()
        if p:
            return p, f'ref:{ref}'
    if keywords:
        qs = Product.objects.filter(is_active=True)
        for kw in keywords:
            qs = qs.filter(name__icontains=kw)
        results = list(qs)
        if results:
            return results[0], f'keywords:{keywords}'
    return None, None


class Command(BaseCommand):
    help = 'Lie les LabTests aux consommables via LabTestConsumable (multi-produits par examen).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans modifications')
        parser.add_argument('--reset', action='store_true',
                            help='Supprimer toutes les liaisons existantes avant de reconstruire')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        reset = options['reset']
        mode = 'SIMULATION' if dry_run else 'ECRITURE'

        self.stdout.write(f'\n{"=" * 70}')
        self.stdout.write(f'  LINK LAB CONSUMABLES -- Mode: {mode}{"  [RESET]" if reset else ""}')
        self.stdout.write(f'{"=" * 70}\n')

        # -- Reset si demande -----------------------------------
        if reset and not dry_run:
            deleted = LabTestConsumable.objects.all().delete()
            self.stdout.write(f'\n  [RESET] {deleted[0]} liaisons supprimees.\n')

        # -- Etape 3 : Creer les liaisons LabTestConsumable ---------------
        self.stdout.write('\n-- Etape 2 : Liaisons LabTest -> Consommables --\n')

        linked = 0
        already = 0
        test_missing = []
        prod_missing = []

        for test_code, consumable_list in MAPPINGS:
            test = LabTest.objects.filter(test_code=test_code, is_active=True).first()
            if not test:
                test_missing.append(test_code)
                self.stdout.write(f'  [!TEST ] [{test_code}] introuvable')
                continue

            # Refs deja liees pour ce test
            existing_refs = set(
                test.consumables.select_related('product')
                .values_list('product__reference', flat=True)
            )

            for refs, qty, note in consumable_list:
                product, match = resolve_product(refs)
                if not product:
                    prod_missing.append((test_code, refs))
                    self.stdout.write(f'  [!PROD ] [{test_code}] refs={refs} introuvable')
                    continue

                if product.reference in existing_refs:
                    already += 1
                    stock = product.total_stock if hasattr(product, 'total_stock') else product.stock_quantity
                    self.stdout.write(
                        f'  [=DEJA ] [{test_code:22s}] x{qty} "{product.name[:38]}" (stock={stock})'
                    )
                    continue

                stock = product.total_stock if hasattr(product, 'total_stock') else product.stock_quantity
                self.stdout.write(
                    f'  [OK    ] [{test_code:22s}] x{qty} "{product.name[:38]}" (stock={stock})'
                    f'  [{note}]'
                )
                if not dry_run:
                    LabTestConsumable.objects.get_or_create(
                        lab_test=test,
                        product=product,
                        defaults={'quantity_per_test': qty, 'notes': note},
                    )
                linked += 1

        # -- Resume -------------------------------------------------------
        self.stdout.write(f'\n{"=" * 70}')
        self.stdout.write(f'  Liaisons creees     : {linked}')
        self.stdout.write(f'  Deja existantes     : {already}')
        if test_missing:
            self.stdout.write(f'  Tests absents       : {test_missing}')
        if prod_missing:
            self.stdout.write(f'  Produits introuvables ({len(prod_missing)}) :')
            for tc, refs in prod_missing:
                self.stdout.write(f'    [{tc}] refs={refs}')
        self.stdout.write(f'{"=" * 70}\n')

        if dry_run:
            self.stdout.write('  DRY-RUN -- Aucune modification.\n')
        else:
            self.stdout.write('  Termine !\n')
