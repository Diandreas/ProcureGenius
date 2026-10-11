"""
Corrige le code devise des factures, avoirs et contrats enregistrés avec l'ancienne valeur par défaut « CAD »
dans des organisations dont la devise est autre (ex. XAF). Seul le code devise change, jamais les montants.

Complète aussi le pays des organisations en XAF qui n'en ont pas (Cameroun, marché principal).

Simulation par défaut ; --apply pour écrire. Usage :
    python manage.py fix_record_currency            # liste ce qui changerait
    python manage.py fix_record_currency --apply
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Organization
from apps.contracts.models import Contract
from apps.core.countries import country_profile
from apps.invoicing.models import Invoice

try:
    from apps.invoicing.models import CreditNote
except ImportError:  # pragma: no cover
    CreditNote = None


class Command(BaseCommand):
    help = "Remplace la devise « CAD » héritée par la devise de l'organisation (montants inchangés)."

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Écrire les changements (sinon simulation).')

    def handle(self, *args, **opts):
        apply = opts['apply']
        total = 0
        with transaction.atomic():
            for org in Organization.objects.all().order_by('name'):
                reglages = getattr(org, 'settings', None)
                if reglages is None:
                    continue
                devise = reglages.default_currency or 'XAF'

                if not reglages.country and devise == 'XAF':
                    profil = country_profile('CM')
                    self.stdout.write(f"[{org.name}] pays vide -> CM, fuseau {profil['timezone']}")
                    if apply:
                        reglages.country = 'CM'
                        reglages.timezone = reglages.timezone or profil['timezone']
                        reglages.save(update_fields=['country', 'timezone'])

                if devise == 'CAD':
                    continue
                modeles = [('factures', Invoice), ('contrats', Contract)]
                if CreditNote is not None and hasattr(CreditNote, 'currency'):
                    modeles.append(('avoirs', CreditNote))
                for nom, modele in modeles:
                    qs = modele.objects.filter(organization=org, currency='CAD')
                    n = qs.count()
                    if not n:
                        continue
                    total += n
                    self.stdout.write(f"[{org.name}] {n} {nom} CAD -> {devise}")
                    if apply:
                        qs.update(currency=devise)  # update() : pas de save(), aucun effet de bord comptable

            if not apply:
                transaction.set_rollback(True)

        etat = 'corrigés' if apply else 'à corriger (simulation, relancer avec --apply)'
        self.stdout.write(self.style.SUCCESS(f"{total} enregistrements {etat}."))
