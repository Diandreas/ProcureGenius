"""
Management command: link_lab_stock
Creates lab consumable products from Excel inventory and links them to LabTests.

Usage:
  python manage.py link_lab_stock
  python manage.py link_lab_stock --dry-run    # Simulation

Based on: "Liste des produits du labo à relier au stock.xlsx"

Mapping rules from user:
  - ASO (rapide vs quantitatif) → le test rapide utilise le kit ASO
  - CRP (rapide vs quantitatif) → le test rapide utilise le kit CRP
  - Hémoglobine glyquée → un seul produit partagé (HEM-HBA1C + HORM-HBA1C)
  - Toxo IgG/IgM → un seul produit pour les deux
  - Herpes 1 et 2 → chaque test utilise son propre kit
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.invoicing.models import Product, ProductCategory
from apps.laboratory.models import LabTest


# ── Mapping: (lab_test_code, stock_product_name, product_code/ref) ──
# Les produits stock sont ceux du fichier Excel.
# Chaque LabTest est lié à UN produit de stock qui sera déduit à chaque test.
MAPPINGS = [
    # ═══════════════════════════════════════════════════════════
    # SÉROLOGIE / IMMUNOLOGIE — Tests rapides (cassettes)
    # ═══════════════════════════════════════════════════════════

    # Hépatites
    ('SERO-H', 'HBsAg-W23', 'HBsAg-W23'),                    # Hépatite B Ag HBs
    ('SERO-HBSAb', 'HBsAb Hepatitis B Surface Ab Test', 'H124-23W'),
    ('SERO-HBV pack', 'HBV Hepatitis B Virus 5-in-1 Test', 'H122-43W'),
    ('SERO-HBe-Ag Env', 'HBeAg Hepatitis B Envelope Ag Test', 'H125-23W'),
    ('SERO-HBe-Ab Env', 'HBeAb Hepatitis B Envelope Ab Test', 'H126-23W'),
    ('SERO-HBcAb', 'HBcAb Hepatitis B Core Ab Test', 'H127-23W'),
    ('SERO-HEPA', 'HAV Hepatitis A Virus Ab IgM Test', 'H121-23W'),
    ('SERO-HCV', 'HCV Rapid Test Cassette(Whole blood/Serum/Plasma)', 'HCV-W23'),
    ('SERO-HEV', 'HEV Hepatitis E Virus Ab IgM Test', 'H129-23W'),

    # VIH / Syphilis
    ('SERO-HIV', 'HIV 1/2 Ab Test (Tri-lines)', 'H132-23W'),  # User: VIH 1&2
    ('SERO-SYPH', 'Syphlis Rapid Test Cassette(Whole blood/Serum/Plasma)', 'SYP-W23'),

    # Malaria
    ('SERO-MAL P.F', 'Malaria P.f. Ag Test', 'H146-23W'),
    ('MAL-P.V Ag', 'Malaria P.v. Ag Test', 'H147-23W'),
    ('SERO-MAL P.F / P.V Ag', 'Malaria P.f./P.v. Ag Test', 'H148-23W'),
    ('SERO-MAL P.F/PAN Ag', 'Malaria P.f./P.v. Ag Test', 'H148-23W'),
    ('SERO-MAL PAN', 'Malaria P.f./P.v. Ag Test', 'H148-23W'),

    # Chlamydia / Gonorrhea
    ('SERO-CHLAM Ag', 'Chlamydia Trachomatis Ag Test', 'H135-23S'),
    ('SERO-CHLAM Ab', 'Chlamydia Trachomatis Ab Test', 'H136-23P'),
    ('BACT-GONOR', 'Gonorrhea Ag Test', 'H134-23S'),

    # H.Pylori
    ('SERO-H.Pyl', 'H.Pylori Ab Test', 'H144-23W'),
    ('BACT-H.Pyl', 'H.Pylor Ag Test', 'H145-23F'),

    # Grossesse / Ovulation
    ('HORM-HCG', 'hCG Pregnancy Test', 'H111-23U'),
    ('HORM-LH OV', 'Lh Ovulation Test', 'H112-23U'),

    # Toxoplasmose — un seul produit pour les deux (IgG+IgM dans le même test)
    ('SERO-TOXO', 'TOXO IgM/IgG rapid test', 'H181-23WM'),
    ('H181-23WG', 'TOXO IgM/IgG rapid test', 'H181-23WG'),

    # Herpes 1 et 2 — chaque test utilise son kit
    ('SERO-HERPES HSV-I', 'HERPES HSV-I IgG/IgM rapid test', 'H184-23WM'),
    ('SERO-HERPES HSV-II', 'HERPES HSV-II IgG/IgM rapid test', 'H185-23WM'),

    # Rubéole
    ('SERO-RUBEO', 'RUBEO IgG/IgM rapid test', 'H185-23WM'),

    # ═══════════════════════════════════════════════════════════
    # BIOCHIMIE — Tests rapides vs automate
    # ═══════════════════════════════════════════════════════════

    # ASO — user: "le moins cher c'est un test rapide"
    # BIO-ASLO = test rapide → utilise le kit ASO rapide
    # SERO-ASLO = dosage classique → ne déduit pas le même kit (ou aucun)
    ('BIO-ASLO', 'ASLO 5000 rapid test', 'DR002-1'),

    # CRP — user: "le moins cher c'est un test rapide"
    # BIO-CRP-H = dosage quantitatif (automate) → pas de déduction rapide
    # On lie quand même au kit CRP si c'est un test rapide disponible
    ('BIO-CRP-H', 'CRP rapid test', 'DR004-1'),

    # Hémoglobine glyquée — un seul produit pour les deux codes
    ('HEM-HBA1C', 'HbA1c rapid test', 'DR018-2'),
    ('HORM-HBA1C', 'HbA1c rapid test', 'DR018-2'),

    # ═══════════════════════════════════════════════════════════
    # HÉMATOLOGIE
    # ═══════════════════════════════════════════════════════════

    # Glycémie → Safe AQ pro I test strips
    ('BIO-GLU', 'Safe AQ pro I - 50 pcs test strips/box', 'Safe AQ pro I strips'),
    ('BIO-GLUPP', 'Safe AQ pro I - 50 pcs test strips/box', 'Safe AQ pro I strips'),

    # Groupe sanguin
    ('HEM-GS', 'ABO/Rh blood grouping reagents', 'DR016-1'),

    # ═══════════════════════════════════════════════════════════
    # CONSOMMABLES GÉNÉRAUX (non liés à un test spécifique)
    # ═══════════════════════════════════════════════════════════
    # Safe AQ pro I lancets → utilisé pour glycémie mais pas lié directement
    # BH-14H → tubes de prélèvement (consommable général)
    # DR020-2, DR019-2, DR024-2, DR022-2, DR063-2, DR064-2,
    # DR061-2, DR062-2, DR077-2, DR021-2, DR023-2, DR057-4
    # → ces kits DR ne sont pas encore identifiés, on les crée sans lien
]

# Produits stock à créer (tous les items du fichier Excel)
STOCK_PRODUCTS = [
    # (name, reference, quantity, description)
    ('Safe AQ pro I - 50 pcs test strips/box', 'SAFE-AQ-STRIPS', 1000, 'Bandelettes de test glycémie Safe AQ pro I'),
    ('Safe AQ pro I - 50 pcs blood lancets/box', 'SAFE-AQ-LANCETS', 1000, 'Lancettes de prélèvement Safe AQ pro I'),
    ('HBsAg-W23', 'HBsAg-W23', 100, 'HBsAg Rapid Test Cassette (Whole blood/Serum/Plasma)'),
    ('HCV-W23', 'HCV-W23', 100, 'HCV Rapid Test Cassette (Whole blood/Serum/Plasma)'),
    ('HIV-W23', 'HIV-W23', 100, 'HIV 1/2 Test Cassette (Whole blood/Serum/Plasma)'),
    ('SYP-W23', 'SYP-W23', 100, 'Syphilis Rapid Test Cassette (Whole blood/Serum/Plasma)'),
    ('hCG Pregnancy Test', 'H111-23U', 50, 'hCG Pregnancy Test Cassette'),
    ('Lh Ovulation Test', 'H112-23U', 50, 'LH Ovulation Test Cassette'),
    ('HAV Hepatitis A Virus Ab IgM Test', 'H121-23W', 75, 'Hepatitis A Virus Ab IgM Test'),
    ('HBV Hepatitis B Virus 5-in-1 Test', 'H122-43W', 50, 'Hepatitis B Virus 5-in-1 Test'),
    ('HBsAg Hepatitis B Surface Ag Test', 'H123-23W', 75, 'Hepatitis B Surface Ag Test'),
    ('HBsAb Hepatitis B Surface Ab Test', 'H124-23W', 75, 'Hepatitis B Surface Ab Test'),
    ('HBeAg Hepatitis B Envelope Ag Test', 'H125-23W', 75, 'Hepatitis B Envelope Ag Test'),
    ('HBeAb Hepatitis B Envelope Ab Test', 'H126-23W', 75, 'Hepatitis B Envelope Ab Test'),
    ('HBcAb Hepatitis B Core Ab Test', 'H127-23W', 75, 'Hepatitis B Core Ab Test'),
    ('HEV Hepatitis E Virus Ab IgM Test', 'H129-23W', 75, 'Hepatitis E Virus Ab IgM Test'),
    ('HIV 1/2 Ab Test (Tri-lines)', 'H132-23W', 75, 'HIV 1/2 Ab Test'),
    ('Gonorrhea Ag Test', 'H134-23S', 75, 'Gonorrhea Antigen Test'),
    ('Chlamydia Trachomatis Ag Test', 'H135-23S', 75, 'Chlamydia Antigen Test'),
    ('Chlamydia Trachomatis Ab Test', 'H136-23P', 75, 'Chlamydia Antibody Test'),
    ('H.Pylori Ab Test', 'H144-23W', 75, 'Helicobacter Pylori Antibody Test'),
    ('H.Pylor Ag Test', 'H145-23F', 75, 'Helicobacter Pylori Antigen Test'),
    ('Malaria P.f. Ag Test', 'H146-23W', 50, 'Malaria Plasmodium falciparum Antigen Test'),
    ('Malaria P.v. Ag Test', 'H147-23W', 50, 'Malaria Plasmodium vivax Antigen Test'),
    ('Malaria P.f./P.v. Ag Test', 'H148-23W', 50, 'Malaria P.f./P.v. Combined Antigen Test'),
    ('TOXO IgM/IgG rapid test', 'H181-23WM', 25, 'Toxoplasma IgM/IgG Rapid Test'),
    ('TOXO IgM/IgG rapid test (IgG)', 'H181-23WG', 25, 'Toxoplasma IgG Rapid Test'),
    ('HERPES HSV-I IgG/IgM rapid test', 'H184-23WM', 25, 'Herpes Simplex Virus Type 1 IgG/IgM Rapid Test'),
    ('HERPES HSV-II IgG/IgM rapid test', 'H184-23WG', 25, 'Herpes Simplex Virus Type 2 IgG/IgM Rapid Test'),
    ('RUBEO IgG/IgM rapid test', 'H185-23WM', 25, 'Rubella IgG/IgM Rapid Test'),
    ('RUBEO IgG/IgM rapid test (IgG)', 'H185-23WG', 25, 'Rubella IgG Rapid Test'),
    ('Blood collection tubes', 'BH-14H', 1000, 'Tubes de prélèvement sanguin'),
    ('ASLO 5000 rapid test', 'DR002-1', 20, 'ASLO 5000 Rapid Test Kit'),
    ('CRP rapid test', 'DR004-1', 20, 'CRP Rapid Test Kit'),
    ('HbA1c rapid test', 'DR018-2', 20, 'HbA1c Rapid Test Kit'),
    ('Malaria PAN/ Pf rapid test', 'DR020-2', 20, 'Malaria PAN/Pf Rapid Test'),
    ('HIV rapid test', 'DR019-2', 20, 'HIV Rapid Test Kit'),
    ('HBsAg rapid test', 'DR024-2', 20, 'HBsAg Rapid Test Kit'),
    ('Syphilis rapid test', 'DR022-2', 20, 'Syphilis (TP) Rapid Test Kit'),
    ('HCV rapid test', 'DR063-2', 20, 'HCV Rapid Test Kit'),
    ('Dengue NS1 rapid test', 'DR064-2', 20, 'Dengue NS1 Rapid Test Kit'),
    ('Pregnancy test rapid', 'DR016-1', 20, 'Pregnancy (hCG) Rapid Test'),
    ('Malaria Pf/Pv rapid test', 'DR061-2', 20, 'Malaria Pf/Pv Rapid Test'),
    ('Ferrotype/Retics rapid test', 'DR062-2', 20, 'Reticulocyte Rapid Test'),
    ('Blood group ABO/Rh', 'DR077-2', 20, 'ABO/Rh Blood Grouping Test'),
    ('Fibrinogen rapid test', 'DR021-2', 20, 'Fibrinogen Rapid Test'),
    ('TP/INR rapid test', 'DR023-2', 20, 'TP/INR Rapid Test'),
    ('D-Dimer rapid test', 'DR057-4', 20, 'D-Dimer Rapid Test'),
]


class Command(BaseCommand):
    help = 'Create lab consumable products and link them to LabTests'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans modifications')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        mode = 'SIMULATION' if dry_run else 'ÉCRITURE'

        self.stdout.write(self.style.WARNING(f'\n{"=" * 60}'))
        self.stdout.write(self.style.WARNING(f'  LINK LAB STOCK → LAB TESTS — Mode: {mode}'))
        self.stdout.write(self.style.WARNING(f'{"=" * 60}\n'))

        # Get or create lab consumables category
        cat, _ = ProductCategory.objects.get_or_create(
            slug='lab-consumables',
            defaults={'name': 'Consommables de laboratoire', 'is_active': True}
        )

        # ── Step 1: Create stock products ──
        self.stdout.write(self.style.SUCCESS('── Étape 1 : Création des produits stock ──\n'))
        products_map = {}  # reference → Product

        for name, ref, qty, desc in STOCK_PRODUCTS:
            existing = Product.objects.filter(reference=ref).first()
            if existing:
                self.stdout.write(f'  [OK] "{name}" existe déjà (stock={existing.stock_quantity})')
                products_map[ref] = existing
            else:
                self.stdout.write(f'  [CRÉATION] "{name}" → ref={ref}, stock_initial={qty}')
                if not dry_run:
                    product = Product.objects.create(
                        name=name,
                        reference=ref,
                        category=cat,
                        product_type='physical',
                        stock_quantity=qty,
                        cost_price=0,
                        price=0,
                        is_active=True,
                        low_stock_threshold=5,
                        description=desc,
                    )
                    products_map[ref] = product
                else:
                    products_map[ref] = None  # placeholder

        # ── Step 2: Link LabTests to products ──
        self.stdout.write(self.style.SUCCESS('\n── Étape 2 : Liaison LabTests → Produits ──\n'))

        linked_count = 0
        not_found = []
        already_linked = []

        for test_code, product_name, product_ref in MAPPINGS:
            # Handle special case: H181-23WG is a product ref but also a "fake" test code for Toxo IgG
            # Find the test
            if test_code.startswith('H1'):
                # It's a reference to a product that doesn't have a corresponding lab test
                # Skip - this is just a stock item (like Toxo IgG separate)
                continue

            test = LabTest.objects.filter(test_code=test_code, is_active=True).first()
            if not test:
                not_found.append(test_code)
                self.stdout.write(f'  [!] Test "{test_code}" introuvable')
                continue

            if test.linked_product:
                already_linked.append(test_code)
                self.stdout.write(f'  [=] [{test_code}] déjà lié à "{test.linked_product.name}"')
                continue

            # Find the product — first by reference in our map, then by DB lookup
            product = products_map.get(product_ref)
            if not product:
                product = Product.objects.filter(reference=product_ref).first()
            if not product:
                product = Product.objects.filter(name__icontains=product_name.split()[0]).first()

            if product:
                stock_val = getattr(product, 'stock_quantity', 'N/A (would be created)')
                self.stdout.write(f'  [✓] [{test_code}] {test.name} → "{product.name}" (stock={stock_val})')
                if not dry_run:
                    test.linked_product = product
                    test.save(update_fields=['linked_product'])
                linked_count += 1
            elif dry_run and product_ref in products_map:
                # Product would be created in this run
                self.stdout.write(f'  [✓] [{test_code}] {test.name} → "{product_name}" (nouveau produit, stock initialisé)')
                linked_count += 1
            else:
                self.stdout.write(f'  [!] Produit "{product_ref}" ({product_name}) introuvable pour [{test_code}]')
                not_found.append(test_code)

        # ── Summary ──
        self.stdout.write(self.style.WARNING(f'\n{"=" * 60}'))
        self.stdout.write(self.style.SUCCESS(f'  Produits stock créés: {len([r for r, p in products_map.items() if p])}'))
        self.stdout.write(self.style.SUCCESS(f'  LabTests liés: {linked_count}'))
        if already_linked:
            self.stdout.write(self.style.WARNING(f'  Déjà liés (ignorés): {len(already_linked)}'))
        if not_found:
            self.stdout.write(self.style.ERROR(f'  Non trouvés: {not_found}'))
        self.stdout.write(self.style.WARNING(f'{"=" * 60}\n'))

        if dry_run:
            self.stdout.write(self.style.WARNING('  ⚠ DRY-RUN — Aucune modification enregistrée.\n'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ Terminé !\n'))
