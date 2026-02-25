# -*- coding: utf-8 -*-
"""
Commande de synchronisation des tarifs CSJ 2026 depuis le fichier Excel officiel.
Met à jour les prix existants et ajoute les services manquants.

Usage :
    python manage.py sync_csj_tarifs_2026
    python manage.py sync_csj_tarifs_2026 --dry-run
    python manage.py sync_csj_tarifs_2026 --org-name "Centre de Santé JULIANNA"
"""

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Organization
from apps.invoicing.models import Product, ProductCategory


# =============================================================================
# TARIFS OFFICIELS CSJ 2026
# Source : Tarifs soins CSJ 2026 v2.xlsx
# Format : (nom_excel, ancien_nom_en_base_si_different, prix_fcfa, categorie)
# Si ancien_nom = None → on cherche uniquement par nom_excel
# =============================================================================
TARIFS_2026 = [
    # ── Consultations ─────────────────────────────────────────────────────────
    ('Consultation Infirmière',          'Consultation Infirmier',           1500, 'Consultation'),
    ('Consultation Médecin général',     None,                               3000, 'Consultation'),

    # ── Hospitalisation ───────────────────────────────────────────────────────
    ('Pose de cathéter - Perfusion',     None,                               5000, 'Hospitalisation'),
    ('Pose de sonde urinaire',           None,                               5000, 'Hospitalisation'),
    ('KIT Drap pour lit',                'Drap pour lit',                    1000, 'Hospitalisation'),
    ('Mise En Observation (MEO) - Soins', None,                              2500, 'Hospitalisation'),
    ('Hospitalisation par jour',         None,                               5000, 'Hospitalisation'),
    ('Forfait concentrateur par heure',  'Forfait concentrateur / Heure',    6000, 'Hospitalisation'),
    ('Ponction pleurale',                'Ponction pleural',                10000, 'Hospitalisation'),
    ("Ponction d'ascite",                None,                              10000, 'Hospitalisation'),
    ('Nébulisation',                     'Nebulisation',                    6000, 'Hospitalisation'),

    # ── Petite chirurgie ──────────────────────────────────────────────────────
    ('Ongle incarné',                    None,                              10000, 'Petite chirurgie'),
    ('Incision et drainage panaris',     None,                              10000, 'Petite chirurgie'),
    ('Infiltration corticoïdes',         None,                               3000, 'Petite chirurgie'),
    ('Kystectomie/Lipomectomie S-C',     None,                              15000, 'Petite chirurgie'),
    ('Petite chéloïdectomie',            'Petite cheloïdectomie',           10000, 'Petite chirurgie'),
    ('Pansement simple',                 None,                               1000, 'Petite chirurgie'),
    ('Pansement complexe',               None,                               3000, 'Petite chirurgie'),
    ('Suture 1 à 3 points/un plan',      None,                               1000, 'Petite chirurgie'),
    ("Incision + drainage Abcès",        None,                              10000, 'Petite chirurgie'),
    ('Circoncision',                     'Circonsition',                    15000, 'Petite chirurgie'),
    ('Injection simple externe',         'Injection simple',                 2000, 'Petite chirurgie'),
    ('Anesthésie locale',                None,                               2000, 'Petite chirurgie'),
    ('Attelle plâtrée/Plâtre',           None,                              15000, 'Petite chirurgie'),

    # ── Gynécologie ───────────────────────────────────────────────────────────
    ('Insertion Jadelle',                None,                              10000, 'Gynécologie'),
    ('Retrait implant',                  None,                               5000, 'Gynécologie'),
    ('Depo provera',                     None,                               3000, 'Gynécologie'),

    # ── ORL ───────────────────────────────────────────────────────────────────
    ('Lavage nasal',                     None,                               3000, 'ORL'),
    ('Lavage des oreilles',              None,                               5000, 'ORL'),
    ("Ablation d'un frein de langue",    None,                               5000, 'ORL'),

    # ── Laboratoire ───────────────────────────────────────────────────────────
    ('Kit de prélèvement',               None,                                500, 'Laboratoire'),

    # ── Surveillance des paramètres ───────────────────────────────────────────
    ('Surveillance des paramètres - Tension',      None,                     500, 'Surveillance'),
    ('Surveillance des paramètres - Glycémie',     None,                    1000, 'Surveillance'),
    ('Surveillance des paramètres - Température',  None,                    1000, 'Surveillance'),
    ('Surveillance des paramètres - Poids/Taille', None,                       0, 'Surveillance'),
]


class Command(BaseCommand):
    help = 'Synchronise les tarifs CSJ 2026 (mise à jour prix + ajout services manquants)'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Affiche les changements sans les appliquer')
        parser.add_argument('--org-name', type=str, default='',
                            help="Nom de l'organisation (JULIANNA par défaut)")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        org_name = options['org_name']

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('  SYNC TARIFS CSJ 2026'))
        if dry_run:
            self.stdout.write(self.style.WARNING('  [DRY RUN] - Aucune modification en base'))
        self.stdout.write('=' * 70)

        org = self._find_org(org_name)
        self.stdout.write(f'\n[OK] Organisation : {org.name}\n')

        stats = {'updated': 0, 'created': 0, 'unchanged': 0}

        try:
            with transaction.atomic():
                for new_name, old_name, price, cat_name in TARIFS_2026:
                    self._process_tarif(org, new_name, old_name, price, cat_name, stats, dry_run)
                if dry_run:
                    raise transaction.TransactionManagementError('DRY RUN')
        except transaction.TransactionManagementError:
            pass

        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('  RÉSUMÉ'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'  ^ Mis à jour  : {stats["updated"]}')
        self.stdout.write(f'  + Créés       : {stats["created"]}')
        self.stdout.write(f'  = Inchangés   : {stats["unchanged"]}')
        if dry_run:
            self.stdout.write(self.style.WARNING('\n  Mode DRY RUN - relancez sans --dry-run pour appliquer.'))
        else:
            self.stdout.write(self.style.SUCCESS('\n  [OK] Tarifs 2026 synchronisés avec succès !'))
        self.stdout.write('=' * 70)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _find_org(self, org_name):
        if org_name:
            try:
                return Organization.objects.get(name__iexact=org_name)
            except Organization.DoesNotExist:
                raise CommandError(f'Organisation introuvable : "{org_name}"')
        orgs = Organization.objects.filter(name__icontains='julianna')
        if not orgs.exists():
            raise CommandError('Aucune organisation JULIANNA trouvée. Utilisez --org-name.')
        if orgs.count() > 1:
            names = ', '.join(orgs.values_list('name', flat=True))
            raise CommandError(f'Plusieurs organisations trouvées : {names}')
        return orgs.first()

    def _get_or_create_category(self, org, cat_name):
        cat, created = ProductCategory.objects.get_or_create(
            organization=org,
            name=cat_name,
            defaults={
                'slug': cat_name.lower().replace(' ', '-').replace('é', 'e').replace('è', 'e'),
                'description': f'Services - {cat_name}',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  [+] Catégorie créée : {cat_name}'))
        return cat

    def _find_service(self, org, new_name, old_name):
        """Cherche un service par nouveau nom, puis par ancien nom."""
        qs = Product.objects.filter(organization=org, product_type='service')
        # 1. Nom exact (nouveau)
        p = qs.filter(name__iexact=new_name).first()
        if p:
            return p
        # 2. Ancien nom (si fourni)
        if old_name:
            p = qs.filter(name__iexact=old_name).first()
            if p:
                return p
        return None

    def _process_tarif(self, org, new_name, old_name, price, cat_name, stats, dry_run):
        product = self._find_service(org, new_name, old_name)
        category = self._get_or_create_category(org, cat_name)

        if product is None:
            # Nouveau service à créer
            if not dry_run:
                Product.objects.create(
                    organization=org,
                    name=new_name,
                    product_type='service',
                    category=category,
                    price=Decimal(price),
                    cost_price=Decimal(0),
                    description=f'{new_name} - Centre de Santé JULIANNA',
                    stock_quantity=0,
                    low_stock_threshold=0,
                    is_active=True,
                )
            stats['created'] += 1
            self.stdout.write(self.style.SUCCESS(
                f'  + {new_name[:60]:<60} CRÉÉ  {price:>7,} F'
            ))
        else:
            old_price = int(product.price)
            name_changed = product.name != new_name
            price_changed = old_price != price

            if price_changed or name_changed:
                if not dry_run:
                    fields = []
                    if price_changed:
                        product.price = Decimal(price)
                        fields.append('price')
                    if name_changed:
                        product.name = new_name
                        fields.append('name')
                    if fields:
                        product.save(update_fields=fields)

                label = f'{product.name[:40]} → {new_name[:40]}' if name_changed else new_name[:60]
                price_label = f'{old_price:,} → {price:,}' if price_changed else f'{price:,} (inchangé)'
                self.stdout.write(
                    f'  ^ {label:<60} {price_label} F'
                )
                stats['updated'] += 1
            else:
                stats['unchanged'] += 1
                self.stdout.write(
                    f'  = {new_name[:60]:<60} {price:>7,} F  (OK)'
                )
