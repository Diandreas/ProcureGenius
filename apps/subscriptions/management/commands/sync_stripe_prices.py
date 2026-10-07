"""Recopie dans Procura les prix définis dans Stripe : Stripe est la seule source des prix.

Pour chaque formule payante, on lit les prix ACTIFS et récurrents de son produit
Stripe (le plus récent par périodicité) et on enregistre : identifiants de prix,
montants et devise. Le produit « utilisateur supplémentaire » s'applique à toutes
les formules payantes.

Première liaison (identifiants de produits donnés par l'administrateur) :
    python manage.py sync_stripe_prices --pro prod_xxx --business prod_yyy --seat prod_zzz

Ensuite (cron horaire), sans argument : le produit est retrouvé à partir du prix
déjà enregistré, même si ce prix a été archivé entre-temps. Changer un prix dans
Stripe (nouveau prix, ancien archivé) suffit donc pour que le site suive.

    python manage.py sync_stripe_prices --simulation   # affiche sans rien enregistrer
"""
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.subscriptions.models import SubscriptionPlan
from apps.subscriptions.stripe_service import montant_stripe

FORMULES = ('pro', 'business')


def _produit_depuis_prix(stripe, *ids):
    for i in ids:
        if i:
            try:
                return stripe.Price.retrieve(i).product
            except Exception:
                continue
    return None


def _prix_actifs(stripe, produit):
    """{'month': Price, 'year': Price} : le prix actif le plus récent de chaque périodicité."""
    retenus = {}
    for p in stripe.Price.list(product=produit, active=True, limit=100).auto_paging_iter():
        rec = getattr(p, 'recurring', None)
        if not rec or rec.get('interval_count', 1) != 1 or rec.get('interval') not in ('month', 'year'):
            continue
        actuel = retenus.get(rec['interval'])
        if actuel is None or p.created > actuel.created:
            retenus[rec['interval']] = p
    return retenus


def _montant(prix):
    return Decimal(str(montant_stripe(prix.unit_amount, prix.currency))).quantize(Decimal('0.01'))


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument('--pro')
        parser.add_argument('--business')
        parser.add_argument('--seat', help="produit « utilisateur supplémentaire »")
        parser.add_argument('--simulation', action='store_true')

    def handle(self, *args, **o):
        import stripe

        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        if not stripe.api_key:
            raise CommandError('STRIPE_SECRET_KEY non configuré.')

        plans = {p.code: p for p in SubscriptionPlan.objects.filter(code__in=FORMULES)}
        seat_produit = o['seat'] or _produit_depuis_prix(
            stripe, *[x for p in plans.values() for x in (p.stripe_seat_price_id_monthly, p.stripe_seat_price_id_yearly)])
        seat_prix = _prix_actifs(stripe, seat_produit) if seat_produit else {}

        for code in FORMULES:
            plan = plans.get(code)
            if plan is None:
                continue
            produit = o.get(code) or _produit_depuis_prix(stripe, plan.stripe_price_id_monthly, plan.stripe_price_id_yearly)
            if not produit:
                self.stdout.write(f'{code} : aucun produit Stripe connu (passez --{code} prod_...).')
                continue
            prix = _prix_actifs(stripe, produit)
            mensuel, annuel = prix.get('month'), prix.get('year')
            if mensuel is None:
                self.stderr.write(f'{code} : aucun prix mensuel actif sur {produit}, formule laissée telle quelle.')
                continue

            avant = (plan.price_monthly, plan.price_yearly, plan.currency, plan.extra_user_price)
            plan.stripe_price_id_monthly = mensuel.id
            plan.price_monthly = _montant(mensuel)
            plan.currency = mensuel.currency.upper()
            # Pas de prix annuel dans Stripe : l'option annuelle n'est pas proposée.
            plan.stripe_price_id_yearly = annuel.id if annuel else ''
            plan.price_yearly = _montant(annuel) if annuel else Decimal('0')
            if seat_prix.get('month'):
                plan.stripe_seat_price_id_monthly = seat_prix['month'].id
                plan.extra_user_price = _montant(seat_prix['month'])
            if seat_prix.get('year'):
                plan.stripe_seat_price_id_yearly = seat_prix['year'].id
            elif seat_produit:
                plan.stripe_seat_price_id_yearly = ''

            apres = (plan.price_monthly, plan.price_yearly, plan.currency, plan.extra_user_price)
            etat = 'inchangé' if avant == apres else f'{avant} -> {apres}'
            if not o['simulation']:
                plan.save()
            self.stdout.write(f'{code} : {plan.price_monthly} {plan.currency}/mois, '
                              f'annuel {plan.price_yearly or "non proposé"}, siège {plan.extra_user_price} ({etat})'
                              + (' [simulation]' if o['simulation'] else ''))
