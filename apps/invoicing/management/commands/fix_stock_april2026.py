"""
Management command: fix_stock_april2026
Corrections de stock du 13 avril 2026 suite à inventaire physique.

Usage:
  python manage.py fix_stock_april2026
  python manage.py fix_stock_april2026 --dry-run    # Simulation sans sauvegarder

Corrections appliquées :
  - Artésunate 60mg          → stock = 26 (via ajustement)
  - Carbocistéine 2% 100ml   → stock = 2
  - Ceftriaxone 1g sans eau  → stock = 7
  - Cefixime (renommer si "cifixime"), 4 comprimés → stock = 4
  - Paracétamol codéine 500mg → stock = 3 boites
  - Paracétamol Viatris 1000mg → stock = 2 boites
  - Vitamine B complexe comprimés → stock = 9
  - Vitamine B complexe injectable → stock = 20
"""
from django.core.management.base import BaseCommand
from django.db import transaction


# Corrections à appliquer : (recherche_nom, stock_cible, notes, renommer_vers)
# La recherche est insensible à la casse et cherche un sous-texte
CORRECTIONS = [
    {
        'search': 'artésunate 60',
        'alt_search': ['artesunate 60', 'artesunat 60'],
        'target_stock': 26,
        'notes': 'Inventaire 13/04/2026 : 18 + 8 = 26 unités comptées',
        'rename': None,
    },
    {
        'search': 'carbocistéine 2%',
        'alt_search': ['carbocistein 2%', 'carboxiteine 2%', 'carbocisteine 2%'],
        'target_stock': 2,
        'notes': 'Inventaire 13/04/2026 : 2 flacons 100ml',
        'rename': None,
    },
    {
        'search': 'ceftriaxone 1g',
        'alt_search': ['ceftriasone 1g', 'ceftriaxone 1 g'],
        'target_stock': 7,
        'notes': 'Inventaire 13/04/2026 : 7 flacons sans eau',
        'rename': None,
    },
    {
        'search': 'cifixime',
        'alt_search': ['cefixime', 'céfixime'],
        'target_stock': 4,
        'notes': 'Inventaire 13/04/2026 : 4 comprimés. Nom corrigé : Céfixime → Cefixime',
        'rename': None,  # On corrige le nom via rename_if_contains ci-dessous
        'rename_contains': 'cifixime',  # Si le nom contient "cifixime", corriger l'orthographe
        'rename_replace': ('cifixime', 'cefixime'),
    },
    {
        'search': 'paracétamol codéine 500',
        'alt_search': ['paracetamol codeine 500', 'paracetamol codéine 500'],
        'target_stock': 3,
        'notes': 'Inventaire 13/04/2026 : 3 boites',
        'rename': None,
    },
    {
        'search': 'paracétamol viatris 1000',
        'alt_search': ['paracetamol viatris 1000', 'paracetamol viatris 1g'],
        'target_stock': 2,
        'notes': 'Inventaire 13/04/2026 : 2 boites',
        'rename': None,
    },
    {
        'search': 'vitamine b complex',
        'alt_search': ['vitamin b complex', 'vit b complex', 'vitabmine b complex', 'vitamien b complex'],
        'target_stock_comprime': 9,
        'target_stock_injectable': 20,
        'notes_comprime': 'Inventaire 13/04/2026 : 9 comprimés',
        'notes_injectable': 'Inventaire 13/04/2026 : 20 ampoules injectables',
        'split': True,  # Ce produit a deux formes, traitement spécial
        'rename': None,
    },
]


def find_product(search_terms, exclude_keywords=None):
    """Cherche un produit par nom (insensible à la casse, sous-texte)."""
    from apps.invoicing.models import Product
    for term in search_terms:
        qs = Product.objects.filter(name__icontains=term, is_active=True)
        if exclude_keywords:
            for kw in exclude_keywords:
                qs = qs.exclude(name__icontains=kw)
        if qs.exists():
            return list(qs)
    return []


class Command(BaseCommand):
    help = 'Corrections de stock inventaire 13 avril 2026'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulation : affiche les changements sans les appliquer',
        )

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, StockMovement

        dry_run = options['dry_run']

        self.stdout.write(self.style.WARNING(
            '\n══════════════════════════════════════════'
        ))
        self.stdout.write(self.style.WARNING(
            '  CORRECTIONS STOCK — Inventaire 13/04/2026'
        ))
        self.stdout.write(self.style.WARNING(
            f'  Mode : {"SIMULATION (--dry-run)" if dry_run else "ÉCRITURE RÉELLE"}'
        ))
        self.stdout.write(self.style.WARNING(
            '══════════════════════════════════════════\n'
        ))

        results = []

        with transaction.atomic():

            # ── 1. Artésunate 60mg ─────────────────────────────────────────
            products = find_product(
                ['artésunate 60', 'artesunate 60', 'artesunat 60'],
            )
            results.append(self._apply(
                products, target=26,
                notes='Inventaire 13/04/2026 : 18 + 8 = 26 unités',
                dry_run=dry_run,
            ))

            # ── 2. Carbocistéine 2% 100ml ──────────────────────────────────
            products = find_product(
                ['carbocistéine 2%', 'carbocistein 2%', 'carboxiteine 2%', 'carbocisteine 2%'],
            )
            results.append(self._apply(
                products, target=2,
                notes='Inventaire 13/04/2026 : 2 flacons 100ml',
                dry_run=dry_run,
            ))

            # ── 3. Ceftriaxone 1g sans eau ─────────────────────────────────
            # DB name: "Ceftriaxon 1g sans eau - B/10" (sans 'e' final)
            products = find_product(
                ['ceftriaxon 1g', 'ceftriaxone 1g', 'ceftriasone 1g',
                 'ceftriaxon 1 g', 'ceftriaxon 1g sans eau'],
            )
            results.append(self._apply(
                products, target=7,
                notes='Inventaire 13/04/2026 : 7 flacons sans eau',
                dry_run=dry_run,
            ))

            # ── 4. Cefixime (corriger orthographe "cifixime") ──────────────
            products = find_product(
                ['cifixime', 'cefixime', 'céfixime'],
            )
            for p in products:
                if 'cifixime' in p.name.lower():
                    old_name = p.name
                    new_name = p.name.lower().replace('cifixime', 'cefixime')
                    # Remettre la casse correcte
                    new_name = new_name[0].upper() + new_name[1:]
                    self.stdout.write(f'  [RENOMMAGE] "{old_name}" → "{new_name}"')
                    if not dry_run:
                        p.name = new_name
                        p.save(update_fields=['name', 'updated_at'])
            results.append(self._apply(
                products, target=4,
                notes='Inventaire 13/04/2026 : 4 comprimés. Orthographe corrigée.',
                dry_run=dry_run,
            ))

            # ── 5. Paracétamol codéine 500mg ───────────────────────────────
            products = find_product(
                ['paracétamol codéin', 'paracetamol codein', 'paracetamol codéin',
                 'codéiné 500', 'paracétamol/cod', 'paracetamol/cod'],
            )
            results.append(self._apply(
                products, target=3,
                notes='Inventaire 13/04/2026 : 3 boites',
                dry_run=dry_run,
            ))

            # ── 6. Paracétamol Viatris 1000mg ──────────────────────────────
            products = find_product(
                ['paracétamol viatris 1000', 'paracetamol viatris 1000', 'viatris 1000'],
            )
            results.append(self._apply(
                products, target=2,
                notes='Inventaire 13/04/2026 : 2 boites',
                dry_run=dry_run,
            ))

            # ── 7. Vitamine B complexe — comprimés ─────────────────────────
            # NOTE : "Vitamine B complex comprimés" n'existe pas en DB
            # Seul "Gynositol Plus Myo-inositol Vitamine B9" existe (non lié)
            # À créer manuellement si nécessaire.
            products_cp = find_product(
                ['vitamine b complex comprim', 'vitamin b complex comprim',
                 'vitamines b complex comprim'],
                exclude_keywords=['inj', 'injectable', 'amp', 'ampoule',
                                   'gynositol', 'inositol', 'b9'],
            )
            results.append(self._apply(
                products_cp, target=9,
                notes='Inventaire 13/04/2026 : 9 comprimés',
                label='Vitamine B complexe comprimés',
                dry_run=dry_run,
            ))

            # ── 8. Vitamine B complexe — injectable ────────────────────────
            # DB name: "Vitamines B complex injectable - B/100"
            products_inj = find_product(
                ['vitamines b complex inj', 'vitamines b complexe inj',
                 'vitamine b complex inj', 'vitamin b complex inj',
                 'vitamines b complex', 'vitamins b complex'],
            )
            if not products_inj:
                # Fallback : chercher avec le mot-clé injectable/inj séparément
                products_inj = find_product(
                    ['vitamine b complex', 'vitamin b complex', 'vit b complex',
                     'vitabmine b complex', 'vitamien b complex'],
                )
                products_inj = [p for p in products_inj
                                 if any(kw in p.name.lower()
                                        for kw in ['inj', 'injectable', 'amp', 'ampoule'])]
            results.append(self._apply(
                products_inj, target=20,
                notes='Inventaire 13/04/2026 : 20 ampoules injectables',
                label='Vitamine B complexe injectable',
                dry_run=dry_run,
            ))

            if dry_run:
                transaction.set_rollback(True)

        # ── Résumé ─────────────────────────────────────────────────────────
        ok = sum(1 for r in results if r)
        ko = len(results) - ok
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'\nSimulation terminée — {ok} produit(s) trouvé(s), {ko} introuvable(s). Aucune modification.'
            ))
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ Terminé — {ok} correction(s) appliquée(s), {ko} introuvable(s).')
            )
            if ko:
                self.stdout.write(self.style.ERROR(
                    '  Vérifiez les produits INTROUVABLES et corrigez manuellement.'
                ))

    # ──────────────────────────────────────────────────────────────────────
    def _apply(self, products, target, notes, label=None, dry_run=False):
        """
        Applique la correction de stock sur les produits trouvés.
        Crée un StockMovement d'ajustement.
        Retourne True si au moins un produit traité.
        """
        from apps.invoicing.models import StockMovement

        if not products:
            name = label or '(inconnu)'
            self.stdout.write(self.style.ERROR(f'  [INTROUVABLE] {name}'))
            return False

        for product in products:
            current = product.stock_quantity
            delta = target - current
            sign = '+' if delta >= 0 else ''

            self.stdout.write(
                f'  [{"DRY-RUN" if dry_run else "OK"}] '
                f'{product.name!r} : '
                f'stock actuel={current} → cible={target} '
                f'(delta {sign}{delta})'
            )

            if not dry_run and delta != 0:
                # Enregistre le mouvement d'ajustement
                StockMovement.objects.create(
                    product=product,
                    movement_type='adjustment',
                    quantity=delta,
                    quantity_before=current,
                    quantity_after=target,
                    reference_type='manual',
                    reference_number='INV-13042026',
                    notes=notes,
                )
                # Met à jour le stock du produit
                product.stock_quantity = target
                product.save(update_fields=['stock_quantity', 'updated_at'])
            elif delta == 0:
                self.stdout.write(f'         → Stock déjà correct, aucun mouvement créé.')

        return True
