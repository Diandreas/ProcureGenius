"""
Management command: reconcile_stock_from_batches

Corrige product.stock_quantity pour les produits geres par lots
(ProductBatch) dont le compteur stock_quantity est clairement reste bloque
a une vieille valeur (0 ou negatif) pendant que les lots, eux, refletent le
vrai stock -- bug constate en prod le 09/09/2026 (load_pharmacy_batches
creait des lots avec les vraies quantites d'inventaire sans jamais mettre a
jour stock_quantity -- la liste des produits et la fiche produit
affichaient alors deux nombres differents pour le meme produit).

IMPORTANT -- ce script ne corrige QUE le cas non-ambigu (stock_quantity <= 0
alors que des lots actifs existent) : dans ce cas, stock_quantity n'a
clairement jamais ete mis a jour depuis la creation des lots, donc le total
des lots actifs est la seule information fiable.

Il ne touche PAS les produits ou stock_quantity ET le total des lots sont
tous les deux positifs mais different : l'enquete en prod a montre que dans
ce cas, la direction de l'erreur n'est PAS toujours la meme -- ex: un lot
passe 'expired' arrete d'etre decompte par les sorties labo/pharmacie
(filtre status__in=['available','opened']) alors que stock_quantity, lui,
continue de suivre la vraie consommation reelle via adjust_stock() ; dans
un autre cas c'est l'inverse, un ajustement manuel d'inventaire a mis a
jour stock_quantity sans jamais toucher le lot reference. Trancher a
l'aveugle dans ce cas peut EFFACER un stock reel encore utilise (ex: un
produit a stock_quantity=828 avec un lot expire a 0 restant activement
vendu au labo tous les jours -- corriger a 0 aurait ete faux). Ces cas sont
seulement rapportes (--report-ambiguous) pour verification humaine /
inventaire physique, jamais corriges automatiquement.

Cible pour la correction automatique = somme des lots 'available'/'opened'
(meme formule que Product.total_stock / sync_stock_from_batches()). Chaque
correction cree un StockMovement de type 'adjustment' pour tracabilite,
meme convention que fix_stock_april2026.py.

Usage:
  python manage.py reconcile_stock_from_batches                     # dry-run, cas surs uniquement
  python manage.py reconcile_stock_from_batches --execute           # applique les cas surs
  python manage.py reconcile_stock_from_batches --report-ambiguous  # liste les cas ambigus (rien n'est modifie)
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum


class Command(BaseCommand):
    help = "Recale stock_quantity sur la somme des lots actifs, uniquement pour les cas non-ambigus (stock_quantity <= 0)"

    def add_arguments(self, parser):
        parser.add_argument('--execute', action='store_true',
                            help='Applique reellement les corrections (sinon : dry-run)')
        parser.add_argument('--report-ambiguous', action='store_true',
                            help="N'affiche que les produits ou les deux valeurs sont positives mais different (aucune modification)")

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, StockMovement

        execute = options['execute']
        report_ambiguous = options['report_ambiguous']

        if report_ambiguous:
            self._report_ambiguous()
            return

        if not execute:
            self.stdout.write(self.style.WARNING(
                "\n[DRY-RUN] Aucune modification ne sera enregistree. Ajoutez --execute pour appliquer.\n"
            ))

        products = Product.objects.filter(
            product_type='physical', is_active=True, batches__isnull=False
        ).distinct()

        self.stdout.write(f"Produits geres par lots : {products.count()}\n")

        fixed = 0
        already_ok = 0
        skipped_ambiguous = 0

        with transaction.atomic():
            for product in products:
                batch_total = product.batches.filter(
                    status__in=['available', 'opened']
                ).aggregate(total=Sum('quantity_remaining'))['total'] or 0

                current = product.stock_quantity
                if current == batch_total:
                    already_ok += 1
                    continue

                # Cas ambigu : les deux valeurs sont positives -> ne pas trancher a l'aveugle.
                if current > 0 and batch_total > 0:
                    skipped_ambiguous += 1
                    continue

                delta = batch_total - current
                sign = '+' if delta >= 0 else ''
                self.stdout.write(
                    f"  [{'DRY-RUN' if not execute else 'OK'}] {product.name!r} : "
                    f"stock_quantity={current} -> {batch_total} (delta {sign}{delta})"
                )

                if execute:
                    StockMovement.objects.create(
                        product=product,
                        movement_type='adjustment',
                        quantity=delta,
                        quantity_before=current,
                        quantity_after=batch_total,
                        reference_type='manual',
                        reference_number='RECONCILE-09092026',
                        notes="Reconciliation automatique stock_quantity <- somme des lots actifs "
                              "(stock_quantity etait a 0 ou negatif, jamais mis a jour depuis la creation des lots)",
                    )
                    product.stock_quantity = batch_total
                    product.save(update_fields=['stock_quantity', 'updated_at'])

                fixed += 1

            if not execute:
                transaction.set_rollback(True)

        self.stdout.write("\n" + "=" * 60)
        if execute:
            self.stdout.write(self.style.SUCCESS(f"OK - {fixed} produit(s) corrige(s), {already_ok} deja corrects."))
        else:
            self.stdout.write(self.style.WARNING(
                f"Simulation : {fixed} produit(s) seraient corriges, {already_ok} deja corrects.\n"
                "Lancez avec --execute pour appliquer."
            ))
        if skipped_ambiguous:
            self.stdout.write(self.style.WARNING(
                f"\n{skipped_ambiguous} produit(s) NON touches (stock_quantity et lots tous deux positifs "
                f"mais differents - direction de l'erreur ambigue). Voir --report-ambiguous pour la liste."
            ))

    def _report_ambiguous(self):
        from apps.invoicing.models import Product

        products = Product.objects.filter(
            product_type='physical', is_active=True, batches__isnull=False
        ).distinct()

        rows = []
        for product in products:
            batch_total = product.batches.filter(
                status__in=['available', 'opened']
            ).aggregate(total=Sum('quantity_remaining'))['total'] or 0
            current = product.stock_quantity
            if current > 0 and batch_total > 0 and current != batch_total:
                rows.append((product, current, batch_total))

        self.stdout.write(f"\n{len(rows)} produit(s) avec un ecart ambigu (verification manuelle / inventaire recommandee) :\n")
        for product, current, batch_total in sorted(rows, key=lambda r: abs(r[1] - r[2]), reverse=True):
            self.stdout.write(
                f"  - {product.name:<55} stock_quantity={current:>5}  |  lots actifs={batch_total:>5}  |  ecart={current - batch_total:+d}"
            )
