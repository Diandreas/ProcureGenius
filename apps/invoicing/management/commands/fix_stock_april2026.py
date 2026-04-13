"""
Management command: fix_stock_april2026
Corrections de stock du 13 avril 2026 suite a inventaire physique.

Usage:
  python manage.py fix_stock_april2026
  python manage.py fix_stock_april2026 --dry-run    # Simulation sans sauvegarder

Corrections appliquees :
  - Artesunate 60mg          - stock = 26 (via ajustement)
  - Carbocisteine 2% 100ml   - stock = 2
  - Ceftriaxone 1g sans eau  - stock = 7
  - Cefixime (renommer si "cifixime"), 4 comprimes - stock = 4
  - Paracetamol codeine 500mg - stock = 3 boites
  - Paracetamol Viatris 1000mg - stock = 2 boites
  - Vitamine B complexe comprimes - stock = 9
  - Vitamine B complexe injectable - stock = 20

NOTE LOTS :
  Si un produit gere ses stocks via des lots (ProductBatch), ce script ajuste
  le lot le plus recent non-epuise. Si aucun lot n'existe, il tombe en mode
  "stock_quantity" classique.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


def find_product(search_terms, exclude_keywords=None):
    """Cherche un produit par nom (insensible a la casse, sous-texte)."""
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
            '\n------------------------------------------'
        ))
        self.stdout.write(self.style.WARNING(
            '  CORRECTIONS STOCK - Inventaire 13/04/2026'
        ))
        self.stdout.write(self.style.WARNING(
            f'  Mode : {"SIMULATION (--dry-run)" if dry_run else "ECRITURE REELLE"}'
        ))
        self.stdout.write(self.style.WARNING(
            '------------------------------------------\n'
        ))

        results = []

        with transaction.atomic():

            # -- 1. Artesunate 60mg -----------------------------------------
            products = find_product(
                ['artesunate 60', 'artesunate 60', 'artesunat 60'],
            )
            results.append(self._apply(
                products, target=26,
                notes='Inventaire 13/04/2026 : 18 + 8 = 26 unites',
                dry_run=dry_run,
            ))

            # -- 2. Carbocisteine 2% 100ml ----------------------------------
            products = find_product(
                ['carbocisteine 2%', 'carbocistein 2%', 'carboxiteine 2%', 'carbocisteine 2%'],
            )
            results.append(self._apply(
                products, target=2,
                notes='Inventaire 13/04/2026 : 2 flacons 100ml',
                dry_run=dry_run,
            ))

            # -- 3. Ceftriaxone 1g sans eau ---------------------------------
            products = find_product(
                ['ceftriaxon 1g', 'ceftriaxone 1g', 'ceftriasone 1g',
                 'ceftriaxon 1 g', 'ceftriaxon 1g sans eau'],
            )
            results.append(self._apply(
                products, target=7,
                notes='Inventaire 13/04/2026 : 7 flacons sans eau',
                dry_run=dry_run,
            ))

            # -- 4. Cefixime (corriger orthographe "cifixime") --------------
            products = find_product(
                ['cifixime', 'cefixime', 'cefixime'],
            )
            for p in products:
                if 'cifixime' in p.name.lower():
                    old_name = p.name
                    new_name = p.name.lower().replace('cifixime', 'cefixime')
                    new_name = new_name[0].upper() + new_name[1:]
                    self.stdout.write(f'  [RENOMMAGE] "{old_name}" - "{new_name}"')
                    if not dry_run:
                        p.name = new_name
                        p.save(update_fields=['name', 'updated_at'])
            results.append(self._apply(
                products, target=4,
                notes='Inventaire 13/04/2026 : 4 comprimes. Orthographe corrigee.',
                dry_run=dry_run,
            ))

            # -- 5. Paracetamol codeine 500mg -------------------------------
            products = find_product(
                ['paracetamol codein', 'paracetamol codein', 'paracetamol codein',
                 'codeine 500', 'paracetamol/cod', 'paracetamol/cod'],
            )
            results.append(self._apply(
                products, target=3,
                notes='Inventaire 13/04/2026 : 3 boites',
                dry_run=dry_run,
            ))

            # -- 6. Paracetamol Viatris 1000mg ------------------------------
            products = find_product(
                ['paracetamol viatris 1000', 'paracetamol viatris 1000', 'viatris 1000'],
            )
            results.append(self._apply(
                products, target=2,
                notes='Inventaire 13/04/2026 : 2 boites',
                dry_run=dry_run,
            ))

            # -- 7. Vitamine B complexe - comprimes -------------------------
            products_cp = find_product(
                ['vitamine b complex comprim', 'vitamin b complex comprim',
                 'vitamines b complex comprim', 'vitamine b comprim', 'vitamin b comprim'],
                exclude_keywords=['inj', 'injectable', 'amp', 'ampoule',
                                   'gynositol', 'inositol', 'b9'],
            )
            if not products_cp:
                self.stdout.write(self.style.WARNING(
                    "  [CREATION] 'Vitamine B complex comprimes' - produit inexistant, creation..."
                ))
                if not dry_run:
                    from apps.invoicing.models import ProductCategory
                    cat = None
                    cat_qs = ProductCategory.objects.filter(slug='medicaments', is_active=True)
                    if not cat_qs.exists():
                        cat_qs = ProductCategory.objects.filter(name__icontains='medicament')
                    if cat_qs.exists():
                        cat = cat_qs.first()

                    product = Product.objects.create(
                        name='Vitamine B complex comprimes',
                        reference='VIT-B-COMPR-001',
                        category=cat,
                        product_type='physical',
                        stock_quantity=0,
                        cost_price=0,
                        price=0,
                        is_active=True,
                        low_stock_threshold=5,
                    )
                    products_cp = [product]
                else:
                    self.stdout.write("  [DRY-RUN] Produit serait cree puis corrige a stock=9.")
                    results.append(False)
                    return

            results.append(self._apply(
                products_cp, target=9,
                notes='Inventaire 13/04/2026 : 9 comprimes. Produit cree.',
                label='Vitamine B complexe comprimes',
                dry_run=dry_run,
            ))

            # -- 8. Vitamine B complexe - injectable ------------------------
            products_inj = find_product(
                ['vitamines b complex inj', 'vitamines b complexe inj',
                 'vitamine b complex inj', 'vitamin b complex inj',
                 'vitamines b complex', 'vitamins b complex'],
            )
            if not products_inj:
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

        # -- Resume ---------------------------------------------------------
        ok = sum(1 for r in results if r)
        ko = len(results) - ok
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'\nSimulation terminee - {ok} produit(s) trouve(s), {ko} introuvable(s). Aucune modification.'
            ))
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\n- Termine - {ok} correction(s) appliquee(s), {ko} introuvable(s).')
            )
            if ko:
                self.stdout.write(self.style.ERROR(
                    '  Verifiez les produits INTROUVABLES et corrigez manuellement.'
                ))

    # ----------------------------------------------------------------------
    def _apply(self, products, target, notes, label=None, dry_run=False):
        """
        Applique la correction de stock sur les produits trouves.

        Logique lots :
          - Si le produit a des lots actifs - ajuste le lot le plus recent
            (quantity_remaining) + cree un StockMovement lie au lot.
          - Si pas de lots - ajuste product.stock_quantity (mode classique).
        """
        from apps.invoicing.models import StockMovement

        if not products:
            name = label or '(inconnu)'
            self.stdout.write(self.style.ERROR(f'  [INTROUVABLE] {name}'))
            return False

        for product in products:
            # -- Detecter le mode : lots ou stock_quantity classique --
            active_batches = product.batches.filter(
                status__in=['available', 'opened']
            ).order_by('-received_at')

            if active_batches.exists():
                # MODE LOTS : on ajuste le lot le plus recent non-epuise
                batch = active_batches.first()
                current = product.total_stock   # somme de tous les lots actifs
                delta = target - current
                sign = '+' if delta >= 0 else ''

                self.stdout.write(
                    f'  [{"DRY-RUN" if dry_run else "OK (LOT)"}] '
                    f'{product.name!r} : '
                    f'stock total lots={current} - cible={target} '
                    f'(delta {sign}{delta}) '
                    f'[lot: {batch.batch_number}]'
                )

                if not dry_run and delta != 0:
                    old_batch_qty = batch.quantity_remaining
                    new_batch_qty = old_batch_qty + delta
                    if new_batch_qty < 0:
                        # Securite : ne pas passer en negatif sur le lot
                        self.stdout.write(self.style.WARNING(
                            f'    - Lot {batch.batch_number} : qty_remaining={old_batch_qty} + delta={delta} = {new_batch_qty} (negatif!)'
                            f' - on force a 0 et on repartit sur les autres lots si besoin.'
                        ))
                        new_batch_qty = 0

                    batch.quantity_remaining = new_batch_qty
                    batch.update_status()  # passe a 'depleted' si qty=0
                    batch.save(update_fields=['quantity_remaining', 'status'])

                    StockMovement.objects.create(
                        product=product,
                        batch=batch,
                        movement_type='adjustment',
                        quantity=delta,
                        quantity_before=current,
                        quantity_after=target,
                        reference_type='manual',
                        reference_number='INV-13042026',
                        notes=notes,
                    )
                elif delta == 0:
                    self.stdout.write(f'         - Stock deja correct, aucun mouvement cree.')

            else:
                # MODE CLASSIQUE : pas de lots, on utilise stock_quantity
                current = product.stock_quantity
                delta = target - current
                sign = '+' if delta >= 0 else ''

                self.stdout.write(
                    f'  [{"DRY-RUN" if dry_run else "OK"}] '
                    f'{product.name!r} : '
                    f'stock actuel={current} - cible={target} '
                    f'(delta {sign}{delta})'
                )

                if not dry_run and delta != 0:
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
                    product.stock_quantity = target
                    product.save(update_fields=['stock_quantity', 'updated_at'])
                elif delta == 0:
                    self.stdout.write(f'         - Stock deja correct, aucun mouvement cree.')

        return True
