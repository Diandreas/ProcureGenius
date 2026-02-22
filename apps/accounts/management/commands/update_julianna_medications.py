# -*- coding: utf-8 -*-
"""
Django Management Command : Mise à jour stock médicaments - Centre de Santé JULIANNA
Importe l'inventaire physique TARIFS_2026_INVENTAIRE depuis julianna_medications_config.py :
  - Crée ou retrouve chaque produit par nom
  - Met à jour le prix de vente (tarifs 2026)
  - Crée les lots (ProductBatch) par date de péremption
  - Synchronise stock_quantity avec la somme des lots

Usage :
    python manage.py update_julianna_medications
    python manage.py update_julianna_medications --dry-run
    python manage.py update_julianna_medications --org-name "Centre de Santé JULIANNA"
    python manage.py update_julianna_medications --reset-batches   # supprime les anciens lots avant import
"""

import calendar
import os
import sys
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

sys.path.append(os.path.dirname(__file__))
from julianna_medications_config import TARIFS_2026_INVENTAIRE

from apps.accounts.models import Organization
from apps.invoicing.models import Product, ProductBatch, ProductCategory

# Mapping mois français → numéro
MONTH_MAP = {
    'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
    'juil': 7, 'août': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'déc': 12,
}

# Catégorie par défaut si aucune catégorie médicaments n'est trouvée
DEFAULT_CATEGORY_KEYWORDS = ['médicament', 'pharmacie', 'drug', 'produit']


def parse_expiry(expiry_str):
    """Convertit 'nov-26' → date(2026, 11, 30) (dernier jour du mois)."""
    if not expiry_str:
        return None
    try:
        month_abbr, year_short = expiry_str.split('-')
        month = MONTH_MAP[month_abbr.strip().lower()]
        year = 2000 + int(year_short.strip())
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, last_day)
    except Exception:
        return None


def group_inventory(data):
    """
    Regroupe les lignes de TARIFS_2026_INVENTAIRE par nom de produit.

    Retourne un dict :
        { nom: { 'sell_unit': ..., 'price': ..., 'batches': [(qty, expiry_date), ...] } }
    """
    grouped = {}
    for name, qty, sell_unit, price, expiry_str in data:
        expiry = parse_expiry(expiry_str)
        if name not in grouped:
            grouped[name] = {
                'sell_unit': sell_unit,
                'price': price,
                'batches': [],
            }
        else:
            # Si le prix est différent d'une ligne à l'autre pour le même produit,
            # on prend le plus récent (dernier dans la liste, ordre du tableau)
            grouped[name]['price'] = price
        grouped[name]['batches'].append((qty, expiry))
    return grouped


class Command(BaseCommand):
    help = 'Importe/met à jour les médicaments et lots depuis TARIFS_2026_INVENTAIRE (inventaire physique CSJ 2026)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les changements sans les appliquer en base',
        )
        parser.add_argument(
            '--org-name',
            type=str,
            default='',
            help="Nom de l'organisation (cherche JULIANNA par défaut)",
        )
        parser.add_argument(
            '--reset-batches',
            action='store_true',
            help='Supprimer tous les lots existants du produit avant de créer les nouveaux',
        )

    # ── Recherche alias ───────────────────────────────────────────────────────
    # Pour associer les noms de l'inventaire aux noms éventuellement en base
    NAME_ALIASES = {
        'Paracétamol 1g - 8 comprimés':     ['Paracétamol 1g', 'Paracetamol 1g', 'PARACETAMOL BIOGARAN 1g', 'PARACETAMOL VIATRIS 1000mg'],
        'Paracétamol 500mg - 16 comprimés': ['Paracétamol 500mg', 'PARACETAMOL BIOGARAN 500mg'],
        'Paracétamol 1000mg - 8 comprimés': ['Paracétamol 1000mg', 'Doliprane 1000mg'],
        'Doliprane 1000 mg - 8 comprimés':  ['DOLIPRANE Paracétamol 1000mg', 'Doliprane 1000mg'],
        'Doliprane 300 mg - 12 sachets-dose poudre': ['DOLIPRANE Paracétamol 300mg', 'Doliprane 300mg'],
        'Doliprane 200 mg - 12 sachets-dose poudre': ['DOLIPRANE Paracétamol 200mg', 'Doliprane 200mg'],
        'Doliprane 100 ml - Flacon':        ['DOLIPRANE suspension buvable'],
        'Alginate de sodium (Gaviscon) 500mg/267mg - sachets de 10 ml': [
            'ALGINATE DE SODIUM / BICARBONATE Sandoz',
            'ALGINATE DE SODIUM / BICARBONATE Arrow',
            'ALGINATE DE SODIUM / BICARBONATE Viatris',
            'GAVISCON sachets 10ml',
            'Gaviscon',
            'Alginate de sodium',
        ],
        'Paracetamol/codéine - 500 mg/30 mg - 16 comprimés': [
            'PARACETAMOL/CODÉINE BIOGARAN 500mg/30mg',
            'Paracétamol codéiné',
        ],
        'Dafalgan codéine 500 mg/30 mg - 16 comprimés pelliculés': ['DAFALGAN CODÉINE'],
        'Amoxiciline 500mg - 12 gélules':   ['CLAMOXYL Amoxicilline 500mg', 'Amoxicilline 500mg'],
        'Amoxiciline 500mg':                ['Amoxicilline 500mg', 'CLAMOXYL Amoxicilline 500mg'],
        'Amoxiciline 1g - 6 comprimés':     ['AMOXICILLINE SANDOZ 1g', 'Amoxicilline 1g'],
        'Esoméprazole 20 mg - 28 gélules gastrorésistantes': ['ESOMÉPRAZOLE BIOGARAN 20mg'],
        'Spafon 80mg - 30 comprimés':       ['SPASFON phloroglucinol', 'Spafon'],
        'Phloroglucinol 80 mg':             ['PHLOROGLUCINOL BGR 80mg', 'Spasfon phloroglucinol'],
        'Tixocortol Suspension nasal 1%':   ['TIXOCORTOL ZENTIVA suspension nasale', 'TIXOCORTOL TEVA 1%'],
        'Locoïd 0,1%':                      ['LOCOID POMMADE hydrocortisone'],
        'Tardyferon 50 mg - 30 comprimés pelliculés': ['TARDYFERON sulfate ferreux 50mg', 'TARDYFERON Fer 80mg'],
        'Acide folique 0,4 mg - 30 comprimés': ['ACIDE FOLIQUE CCD 0,4mg'],
        'Gynositol Plus Myo-inositol Vitamine B9 - 30 sachets': ['GYNOSITOL PLUS postbiotique'],
        'Laroxyl 40 mg/ml':                 ['LAROXYL amitriptyline 40mg/ml'],
        'Nicopatch 28 dispositifs de 21mg/24h': ['NICOPATCHLIB 21mg/24h patch'],
        'Mono sept 30 unidoses de 0,4 ml':  ['MONO-SEPT solution'],
        'Acide borique 12mg/18mg par ml - 20 unidoses': ['BORAX / ACIDE BORIQUE BIOGARAN'],
        'Betadine Scrub 4%':                ['BÉTADINE SCRUB 4%'],
        'Betadine Dermique 10%':            ['BÉTADINE DERMIQUE 10%'],
        'Betadine Alcoolique 5%':           ['BÉTADINE ALCOOLIQUE 5%'],
        'Eau oxygénée Stabilisée 10 volumes': ['EAU OXYGÉNÉE STABILISÉE 10 VOLUMES GILBERT'],
        'Compresses de Gaze stériles 10 cm x 10 cm - 50 sachets': ['COMPRESSES DE GAZE STÉRILES'],
        'Meteospasmyl - 20 capsules':       ['METEOSPASMYL'],
        'Lactulose 10g/15ml - 20 sachets':  ['LACTULOSE VIATRIS 10g/15ml sachets'],
        'Macrogol 4000 - 24 sachets de 4g': ['MACROGOL BIOGARAN 4g'],
        'Carbosylane 45 mg - 140mg - 48 doses': ['CARBOSYLANE'],
        'Loperamide 2mg':                   ['LOPÉRAMIDE TEVA 2mg'],
    }

    # ── Catégories par mot-clé dans le nom du produit ─────────────────────────
    CATEGORY_HINTS = {
        'blister': ['médicament', 'pharmacie', 'drug'],
        'box':     ['médicament', 'pharmacie', 'drug'],
        'bottle':  ['antiseptique', 'désinfectant', 'médicament'],
        'sachet':  ['médicament'],
        'tube':    ['médicament', 'dermatologie'],
        'vial':    ['médicament', 'injectable'],
        'piece':   ['consommable', 'matériel', 'médicament'],
    }

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        org_name = options['org_name']
        reset_batches = options['reset_batches']

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('  IMPORT MÉDICAMENTS - TARIFS 2026 - CENTRE DE SANTÉ JULIANNA'))
        mode = '[DRY RUN]' if dry_run else '[MODE RÉEL]'
        reset_txt = ' + RESET LOTS' if reset_batches else ''
        self.stdout.write(f'  {mode}{reset_txt}')
        self.stdout.write('=' * 70)

        org = self._find_organization(org_name)
        self.stdout.write(f'\n[OK] Organisation : {org.name}')

        grouped = group_inventory(TARIFS_2026_INVENTAIRE)
        self.stdout.write(f'[OK] {len(grouped)} produits distincts, '
                          f'{sum(len(v["batches"]) for v in grouped.values())} lignes de lots\n')

        stats = {
            'products_created': 0,
            'products_updated': 0,
            'products_unchanged': 0,
            'batches_created': 0,
            'batches_skipped': 0,
            'batches_reset': 0,
            'no_expiry': 0,
        }

        try:
            with transaction.atomic():
                self.stdout.write('-- Traitement des produits ------------------------------------------')
                for product_name, data in grouped.items():
                    self._process_product(org, product_name, data, stats, dry_run, reset_batches)

                if dry_run:
                    raise transaction.TransactionManagementError('DRY RUN - Rollback')

        except transaction.TransactionManagementError:
            pass
        except Exception as e:
            raise CommandError(f'Erreur : {e}')

        self._print_summary(stats, dry_run)

    # ── Organisation ──────────────────────────────────────────────────────────

    def _find_organization(self, org_name):
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
            raise CommandError(f'Plusieurs organisations : {names}. Utilisez --org-name.')
        return orgs.first()

    # ── Produit ───────────────────────────────────────────────────────────────

    def _find_product(self, org, name):
        """Cherche un produit par nom exact, alias, ou mots-clés."""
        # 1. Nom exact
        qs = Product.objects.filter(organization=org, name__iexact=name, product_type='physical')
        if qs.exists():
            return qs.first()

        # 2. Alias
        for alias in self.NAME_ALIASES.get(name, []):
            qs = Product.objects.filter(organization=org, name__iexact=alias, product_type='physical')
            if qs.exists():
                return qs.first()

        # 3. Recherche partielle sur les 2 premiers mots significatifs (>4 car)
        keywords = [w for w in name.split() if len(w) > 4][:2]
        if keywords:
            qs = Product.objects.filter(organization=org, product_type='physical')
            for kw in keywords:
                qs = qs.filter(name__icontains=kw)
            if qs.count() == 1:
                return qs.first()

        return None

    def _get_or_create_category(self, org, sell_unit):
        """Retourne la catégorie médicaments/pharmacie de l'organisation."""
        keywords = self.CATEGORY_HINTS.get(sell_unit, ['médicament'])
        # Cherche une catégorie existante (mots-clés prioritaires)
        for kw in keywords + DEFAULT_CATEGORY_KEYWORDS:
            cat = ProductCategory.objects.filter(
                organization=org, name__icontains=kw, is_active=True
            ).first()
            if cat:
                return cat
        # Dernier recours : première catégorie active de l'organisation
        return ProductCategory.objects.filter(organization=org, is_active=True).first()

    def _process_product(self, org, name, data, stats, dry_run, reset_batches):
        sell_unit = data['sell_unit']
        new_price = data['price']
        batches = data['batches']  # [(qty, expiry_date), ...]

        product = self._find_product(org, name)

        if product is None:
            # ── Création du produit ──
            if not dry_run:
                try:
                    cat = self._get_or_create_category(org, sell_unit)
                    product = Product.objects.create(
                        organization=org,
                        name=name,
                        product_type='physical',
                        category=cat,
                        price=new_price,
                        sell_unit=sell_unit,
                        base_unit=sell_unit,
                        conversion_factor=1,
                        stock_quantity=0,
                        low_stock_threshold=5,
                        is_active=True,
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f'  + {name[:55]:<55} CRÉÉ  {new_price:>6,} F'
                    ))
                    stats['products_created'] += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'  ! {name[:55]:<55} ERREUR création: {e}'
                    ))
                    return
            else:
                self.stdout.write(self.style.WARNING(
                    f'  + {name[:55]:<55} SERAIT CRÉÉ  {new_price:>6,} F'
                ))
                stats['products_created'] += 1
                # En dry-run on ne crée pas les lots puisqu'il n'y a pas de produit
                stats['batches_created'] += len(batches)
                return
        else:
            # ── Mise à jour prix ──
            old_price = int(product.price)
            old_name = product.name
            changed = old_price != new_price or old_name != name
            if changed:
                if not dry_run:
                    fields = ['price']
                    product.price = new_price
                    if old_name != name:
                        product.name = name
                        fields.append('name')
                    product.save(update_fields=fields)
                label = f'{old_name[:35]} -> {name[:35]}' if old_name != name else name[:55]
                self.stdout.write(
                    f'  ^ {label:<55} {old_price:>6,} -> {new_price:>6,} F'
                )
                stats['products_updated'] += 1
            else:
                stats['products_unchanged'] += 1

        # ── Gestion des lots ──
        if not dry_run and reset_batches:
            deleted, _ = ProductBatch.objects.filter(product=product).delete()
            if deleted:
                stats['batches_reset'] += deleted

        for idx, (qty, expiry) in enumerate(batches, 1):
            if expiry is None:
                self.stdout.write(self.style.WARNING(
                    f'      /!\\ {name[:50]} - lot sans date de peremption, ignore'
                ))
                stats['no_expiry'] += 1
                continue

            self._process_batch(product, name, qty, expiry, idx, stats, dry_run, reset_batches)

        # ── Synchronisation stock_quantity ──
        if not dry_run and product and product.pk:
            total = ProductBatch.objects.filter(
                product=product, status__in=['available', 'opened']
            ).values_list('quantity_remaining', flat=True)
            new_stock = sum(total)
            if product.stock_quantity != new_stock:
                product.stock_quantity = new_stock
                product.save(update_fields=['stock_quantity'])

    def _process_batch(self, product, name, qty, expiry, idx, stats, dry_run, reset_batches):
        """Crée un lot si inexistant (sauf si reset_batches, auquel cas on crée toujours)."""
        batch_number = f'INV2026-{product.pk if product.pk else "NEW"}-{expiry.strftime("%Y%m")}-{idx:02d}'

        if not dry_run:
            # Vérifie l'existence (même produit, même mois d'expiration) sauf si reset
            exists = (
                not reset_batches
                and ProductBatch.objects.filter(
                    product=product,
                    expiry_date__year=expiry.year,
                    expiry_date__month=expiry.month,
                    quantity_remaining__gt=0,
                ).exists()
            )
            if exists:
                self.stdout.write(
                    f'      = lot {expiry.strftime("%m/%Y")} déjà en base, ignoré ({qty} u.)'
                )
                stats['batches_skipped'] += 1
                return

            ProductBatch.objects.create(
                organization=product.organization,
                product=product,
                batch_number=batch_number,
                quantity=qty,
                quantity_remaining=qty,
                expiry_date=expiry,
                status='available',
            )
        self.stdout.write(
            f'      {"[DRY]" if dry_run else "     "} lot {expiry.strftime("%m/%Y")}  qty={qty:>4}'
        )
        stats['batches_created'] += 1

    # ── Résumé ────────────────────────────────────────────────────────────────

    def _print_summary(self, stats, dry_run):
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'  {prefix}RÉSUMÉ'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'  + Produits crees          : {stats["products_created"]}')
        self.stdout.write(f'  ^ Produits mis a jour     : {stats["products_updated"]}')
        self.stdout.write(f'  = Produits inchanges      : {stats["products_unchanged"]}')
        self.stdout.write(f'  OK Lots crees             : {stats["batches_created"]}')
        self.stdout.write(f'  = Lots deja en base       : {stats["batches_skipped"]}')
        if stats['batches_reset']:
            self.stdout.write(f'  X Lots supprimes (reset)  : {stats["batches_reset"]}')
        if stats['no_expiry']:
            self.stdout.write(self.style.WARNING(
                f'  /!\\ Lots sans peremption   : {stats["no_expiry"]} (ignores)'
            ))
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING('  Mode DRY RUN : aucune modification enregistree.'))
            self.stdout.write('  Relancez sans --dry-run pour appliquer.')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] Stock medicaments mis a jour avec succes !'))
        self.stdout.write('=' * 70)
