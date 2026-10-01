"""Envoie le rapport « patients financiers » du mois ecoule aux organisations qui l'ont active.

A lancer chaque jour (cron) : la commande ne fait rien tant que ce n'est pas le
jour choisi, et n'envoie jamais deux fois le meme mois.

    python manage.py crm_envoyer_rapport_mensuel              # envoi normal
    python manage.py crm_envoyer_rapport_mensuel --simulation # dit ce qui partirait
    python manage.py crm_envoyer_rapport_mensuel --mois 2026-09 --force
"""
from datetime import date

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crm import rapport
from apps.crm.models import MonthlyReportSchedule


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument('--simulation', action='store_true')
        parser.add_argument('--force', action='store_true', help="ignore le jour choisi et l'historique")
        parser.add_argument('--mois', help='AAAA-MM (par defaut : le mois precedent)')

    def handle(self, *args, **o):
        debut, fin = rapport.bornes_du_mois(o['mois']) if o['mois'] else rapport.mois_precedent()
        aujourdhui = date.today()
        for plan in MonthlyReportSchedule.objects.filter(enabled=True).select_related('organization'):
            org = plan.organization
            if not o['force']:
                if aujourdhui.day < plan.day_of_month:
                    continue
                if plan.last_sent_for == debut:
                    continue
            destinataires = plan.liste_destinataires()
            if o['simulation']:
                self.stdout.write('%s : enverrait %s à %s' % (org, debut.strftime('%m/%Y'), destinataires))
                continue
            try:
                totaux = rapport.envoyer_rapport(org, debut, fin, destinataires)
            except Exception as e:  # on garde la trace, on n'interrompt pas les autres organisations
                plan.last_error = str(e)[:300]
                plan.save(update_fields=['last_error'])
                self.stderr.write('%s : ECHEC %s' % (org, e))
                continue
            plan.last_sent_for, plan.last_sent_at, plan.last_error = debut, timezone.now(), ''
            plan.save(update_fields=['last_sent_for', 'last_sent_at', 'last_error'])
            self.stdout.write('%s : envoyé (%s)' % (org, totaux))
