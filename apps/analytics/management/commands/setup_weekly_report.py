"""
Commande pour activer/configurer le rapport hebdomadaire automatique.

Usage:
    python manage.py setup_weekly_report
    python manage.py setup_weekly_report --email contact@centrejulianna.com
    python manage.py setup_weekly_report --frequency weekly
    python manage.py setup_weekly_report --list    # Afficher les configs actives

Le rapport est ensuite envoyé automatiquement chaque lundi à 7h via Celery Beat.
"""
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Configure le rapport hebdomadaire automatique pour l'organisation"

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default=None,
                            help='Email destinataire (défaut : admins de l\'org)')
        parser.add_argument('--frequency', type=str, default='weekly',
                            choices=['weekly', 'biweekly', 'monthly'],
                            help='Fréquence : weekly (lundi), biweekly (semaines paires), monthly (1er lundi du mois)')
        parser.add_argument('--list', action='store_true',
                            help='Afficher les configurations actives')
        parser.add_argument('--disable', type=str, default=None, metavar='EMAIL',
                            help='Désactiver le rapport pour cet email')

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
                self.stdout.write("Lancez la commande sans --list pour en créer un.")
                return
            self.stdout.write(f"\nRapports configurés pour '{org.name}' :")
            for c in configs:
                status = self.style.SUCCESS("ACTIF") if c.is_active else self.style.ERROR("INACTIF")
                sections = []
                if c.include_healthcare: sections.append("Santé/Labo")
                if c.include_finance: sections.append("Finances")
                if c.include_inventory: sections.append("Inventaire")
                if c.include_stock_alerts: sections.append("Alertes")
                self.stdout.write(
                    f"  [{status}] {c.user.email} | {c.get_frequency_display()} | "
                    f"Sections: {', '.join(sections)}"
                )
            return

        # --- Désactiver ---
        if options['disable']:
            target_email = options['disable']
            try:
                user = CustomUser.objects.get(email=target_email, organization=org)
                updated = WeeklyReportConfig.objects.filter(
                    organization=org, user=user
                ).update(is_active=False)
                if updated:
                    self.stdout.write(self.style.SUCCESS(f"Rapport désactivé pour {target_email}."))
                else:
                    self.stdout.write(self.style.WARNING(f"Aucun rapport trouvé pour {target_email}."))
            except CustomUser.DoesNotExist:
                raise CommandError(f"Utilisateur '{target_email}' non trouvé.")
            return

        # --- Activer / Créer ---
        # Trouver l'utilisateur destinataire
        if options['email']:
            try:
                user = CustomUser.objects.get(email=options['email'], organization=org)
            except CustomUser.DoesNotExist:
                raise CommandError(
                    f"Utilisateur avec email '{options['email']}' non trouvé dans l'organisation.\n"
                    f"Utilisateurs disponibles :\n" +
                    "\n".join(f"  - {u.email} ({u.get_role_display() if hasattr(u, 'get_role_display') else u.role})"
                              for u in CustomUser.objects.filter(organization=org, is_active=True).exclude(email=''))
                )
        else:
            # Prendre l'admin ou le premier utilisateur actif
            user = (
                CustomUser.objects.filter(organization=org, is_active=True, role='admin').first()
                or CustomUser.objects.filter(organization=org, is_active=True).exclude(email='').first()
            )
            if not user:
                raise CommandError("Aucun utilisateur actif trouvé. Utilisez --email pour spécifier.")
            self.stdout.write(f"Utilisateur sélectionné automatiquement : {user.email}")

        if not user.email:
            raise CommandError(f"L'utilisateur '{user.username}' n'a pas d'adresse email configurée.")

        frequency = options['frequency']
        freq_labels = {'weekly': 'chaque lundi', 'biweekly': 'semaines paires (lundi)', 'monthly': '1er lundi du mois'}

        config, created = WeeklyReportConfig.objects.update_or_create(
            organization=org,
            user=user,
            defaults={
                'frequency': frequency,
                'is_active': True,
                'include_healthcare': True,
                'include_finance': True,
                'include_inventory': True,
                'include_stock_alerts': True,
            }
        )

        action = "créé" if created else "mis à jour"
        self.stdout.write(self.style.SUCCESS(
            f"\nRapport hebdomadaire {action} !"
        ))
        self.stdout.write(f"  Destinataire : {user.email}")
        self.stdout.write(f"  Fréquence    : {config.get_frequency_display()} ({freq_labels.get(frequency)})")
        self.stdout.write(f"  Sections     : Santé/Labo, Finances, Inventaire, Alertes stock")
        self.stdout.write(f"  Envoi auto   : via Celery Beat (lundi 7h00)")
        self.stdout.write("")
        self.stdout.write("Pour tester immédiatement l'envoi :")
        self.stdout.write(self.style.WARNING(
            "  python manage.py test_weekly_report"
        ))
        self.stdout.write("")
        self.stdout.write("Pour voir toutes les configs actives :")
        self.stdout.write(self.style.WARNING(
            "  python manage.py setup_weekly_report --list"
        ))
