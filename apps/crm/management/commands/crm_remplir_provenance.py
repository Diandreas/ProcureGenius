"""Remplit la provenance qu'on peut deduire sans demander (rejouable).

- patients de laboratoires partenaires -> « Laboratoire partenaire »
- patients adresses par un prescripteur externe -> « Envoyé par un médecin »

Ne touche jamais une provenance deja renseignee (a la main ou « inconnue »).
Sans --appliquer, affiche seulement ce qui serait fait.
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import Client, Organization
from apps.crm import services
from apps.crm.models import PatientCRMProfile, PatientOrigin


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument('--appliquer', action='store_true')

    def handle(self, *args, **options):
        for org in Organization.objects.all():
            if 'crm' not in (org.enabled_modules or []):
                continue
            origines = {o.code: o for o in services.origines_de(org)}
            if 'partner_lab' not in origines:
                origines['partner_lab'] = PatientOrigin.objects.filter(
                    organization=org, code='partner_lab').first()
            compte = {}
            candidats = Client.objects.filter(organization=org, client_type__in=['patient', 'both'])
            for patient in candidats.iterator():
                profil = PatientCRMProfile.objects.filter(patient=patient).first()
                if profil and (profil.origin_id or profil.unknown):
                    continue
                code = services.origine_automatique(patient)
                origine = origines.get(code) if code else None
                if not origine:
                    continue
                compte[code] = compte.get(code, 0) + 1
                if options['appliquer']:
                    profil = profil or PatientCRMProfile(organization=org, patient=patient)
                    profil.origin, profil.unknown = origine, False
                    profil.filled_by = PatientCRMProfile.SOURCE_AUTO
                    profil.save()
            self.stdout.write('%s : %s (%s)' % (
                org, compte or 'rien à remplir', 'appliqué' if options['appliquer'] else 'simulation'))
