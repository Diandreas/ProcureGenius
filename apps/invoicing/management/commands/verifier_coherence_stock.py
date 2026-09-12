"""
Controle de coherence du stock : le compteur `Product.stock_quantity` doit
toujours egaler la somme des lots actifs, pour tout produit gere par lots.

A lancer quand un chiffre parait faux, ou periodiquement :

    python manage.py verifier_coherence_stock              # constat seul
    python manage.py verifier_coherence_stock --corriger   # aligne le compteur

Le compteur est DERIVE des lots : quand les deux divergent, ce sont les lots
qui font foi (ils portent les numeros de lot et les peremptions, et c'est sur
eux que reposent les sorties reelles). `--corriger` recale donc le compteur sur
les lots, jamais l'inverse, et laisse une trace dans les mouvements de stock.

Les produits SANS aucun lot ne sont pas concernes : chez eux `stock_quantity`
est la seule source, il n'y a rien a recouper.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum


class Command(BaseCommand):
    help = "Verifie que le compteur de stock colle a la somme des lots actifs"

    def add_arguments(self, parser):
        parser.add_argument(
            '--corriger', action='store_true',
            help="Aligne stock_quantity sur la somme des lots et trace un mouvement",
        )
        parser.add_argument(
            '--organisation', type=str, default=None,
            help="Limiter a une organisation (nom exact)",
        )

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, StockMovement

        produits = Product.objects.filter(product_type='physical')
        if options['organisation']:
            produits = produits.filter(organization__name=options['organisation'])

        ecarts = []
        for produit in produits.prefetch_related('batches'):
            lots = [b for b in produit.batches.all()]
            if not lots:
                continue  # pas de lots : rien a recouper
            somme_lots = sum(
                b.quantity_remaining for b in lots
                if b.status in ('available', 'opened')
            )
            compteur = produit.stock_quantity or 0
            if compteur != somme_lots:
                ecarts.append((produit, compteur, somme_lots))

        if not ecarts:
            self.stdout.write(self.style.SUCCESS(
                "Aucun ecart : le compteur colle aux lots sur tous les produits."
            ))
            return

        self.stdout.write(self.style.WARNING(
            "%s produit(s) en ecart entre le compteur et les lots :" % len(ecarts)
        ))
        for produit, compteur, somme_lots in ecarts:
            self.stdout.write(
                "  %-46s compteur %6s | lots %6s | ecart %+d" % (
                    produit.name[:46], compteur, somme_lots, somme_lots - compteur
                )
            )

        if not options['corriger']:
            self.stdout.write(
                "\nRelancez avec --corriger pour aligner le compteur sur les lots."
            )
            return

        with transaction.atomic():
            for produit, compteur, somme_lots in ecarts:
                produit.stock_quantity = somme_lots
                produit.save(update_fields=['stock_quantity'])
                StockMovement.objects.create(
                    product=produit,
                    movement_type='adjustment',
                    quantity=somme_lots - compteur,
                    quantity_before=compteur,
                    quantity_after=somme_lots,
                    reference_type='manual',
                    reference_number='COHERENCE-LOTS',
                    notes=("Recalage automatique du compteur sur la somme des lots "
                           "actifs (controle de coherence)."),
                )

        self.stdout.write(self.style.SUCCESS(
            "\n%s produit(s) recales sur leurs lots, avec un mouvement de trace."
            % len(ecarts)
        ))
