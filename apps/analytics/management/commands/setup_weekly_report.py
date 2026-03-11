"""
Commande pour activer/configurer le rapport hebdomadaire automatique.

Usage:
    python manage.py setup_weekly_report
    python manage.py setup_weekly_report --emails contact@centrejulianna.com,centrejulianna@gmail.com
    python manage.py setup_weekly_report --frequency weekly
    python manage.py setup_weekly_report --list    # Afficher les configs actives

Le rapport est envoyé automatiquement chaque lundi à 7h via Celery Beat.
"""
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Configure le rapport hebdomadaire automatique pour l'organisation"

    def add_arguments(self, parser):
        parser.add_argument('--emails', type=str, default=None,
                            help='Emails destinataires séparés par virgule (ex: a@b.com,c@d.com)')
        # Alias legacy
        parser.add_argument('--email', type=str, default=None,
                            help='(obsolète) Utilisez --emails')
        parser.add_argument('--frequency', type=str, default='weekly',
                            choices=['weekly', 'biweekly', 'monthly'],
                            help='Fréquence : weekly (lundi), biweekly (semaines paires), monthly (1er lundi du mois)')
        parser.add_argument('--list', action='store_true',
                            help='Afficher les configurations actives')
        parser.add_argument('--disable', action='store_true',
                            help='Désactiver tous les rapports hebdomadaires')

    def handle(self, *args, **options):
        from apps.accounts.models import Organization, CustomUser
        from apps.analytics.models import WeeklyReportConfig

        org = Organization.objects.first()
        if not org:
            raise CommandError("Aucune organisation trouvée.")

        # --- Afficher les configs actives ---
        if options['list']:
            configs = WeeklyReportConfig.objects.filter(organization=org)
            if not configs.exists():
                self.stdout.write(self.style.WARNING("Aucun rapport hebdomadaire configuré."))
                return
            self.stdout.write(f"\nRapports configurés pour '{org.name}' :")
            for c in configs:
                status = self.style.SUCCESS("ACTIF") if c.is_active else self.style.ERROR("INACTIF")
                all_recipients = [c.user.email] + [e.strip() for e in c.recipient_emails.split(',') if e.strip()]
                sections = []
                if c.include_healthcare: sections.append("Santé/Labo")
                if c.include_finance: sections.append("Finances")
                if c.include_inventory: sections.append("Inventaire")
                if c.include_stock_alerts: sections.append("Alertes")
                self.stdout.write(
                    f"  [{status}] {', '.join(all_recipients)} | {c.get_frequency_display()} | "
                    f"Sections: {', '.join(sections)}"
                )
            return

        # --- Désactiver ---
        if options['disable']:
            updated = WeeklyReportConfig.objects.filter(organization=org).update(is_active=False)
            self.stdout.write(self.style.SUCCESS(f"{updated} rapport(s) désactivé(s)."))
            return

        # --- Résoudre les emails ---
        raw_emails = options['emails'] or options['email'] or ''
        extra_emails = [e.strip() for e in raw_emails.split(',') if e.strip()]

        # Le user de référence = admin principal (jamais exposé, juste pour la FK)
        admin_user = (
            CustomUser.objects.filter(organization=org, is_active=True, role='admin').first()
            or CustomUser.objects.filter(organization=org, is_active=True).exclude(email='').first()
        )
        if not admin_user:
            raise CommandError("Aucun utilisateur actif trouvé dans l'organisation.")

        # Si aucun email fourni, utiliser l'admin par défaut
        if not extra_emails:
            extra_emails = [admin_user.email]
            self.stdout.write(f"Aucun email spécifié — utilisation de : {admin_user.email}")

        # Le premier email de la liste devient l'email principal (user.email override)
        # Les autres vont dans recipient_emails
        recipient_emails_field = ','.join(extra_emails)

        frequency = options['frequency']
        freq_labels = {'weekly': 'chaque lundi', 'biweekly': 'semaines paires (lundi)', 'monthly': '1er lundi du mois'}

        config, created = WeeklyReportConfig.objects.update_or_create(
            organization=org,
            user=admin_user,
            defaults={
                'frequency': frequency,
                'is_active': True,
                'include_healthcare': True,
                'include_finance': True,
                'include_inventory': True,
                'include_stock_alerts': True,
                'recipient_emails': recipient_emails_field,
            }
        )

        action = "créé" if created else "mis à jour"
        self.stdout.write(self.style.SUCCESS(f"\nRapport hebdomadaire {action} !"))
        self.stdout.write(f"  Destinataires : {', '.join(extra_emails)}")
        self.stdout.write(f"  Fréquence     : {config.get_frequency_display()} ({freq_labels.get(frequency)})")
        self.stdout.write(f"  Sections      : Santé/Labo, Finances, Inventaire, Alertes stock")
        self.stdout.write(f"  Envoi auto    : via Celery Beat (lundi 7h00)")
        self.stdout.write("")
        self.stdout.write("Pour envoyer immédiatement (test) :")
        self.stdout.write(self.style.WARNING("  python manage.py test_weekly_report"))
        self.stdout.write("")
        self.stdout.write("Pour voir toutes les configs actives :")
        self.stdout.write(self.style.WARNING("  python manage.py setup_weekly_report --list"))
