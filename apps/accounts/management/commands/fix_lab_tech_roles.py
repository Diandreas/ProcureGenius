"""
Management command pour s'assurer que les biologistes
Lauriane (lauriane) et Emmanuel (kell.mahop) ont bien le rôle lab_tech.

Usage :
    python manage.py fix_lab_tech_roles
    python manage.py fix_lab_tech_roles --dry-run
"""

from django.core.management.base import BaseCommand
from apps.accounts.models import User


LAB_TECH_USERS = [
    'lauriane',
    'kell.mahop',
]


class Command(BaseCommand):
    help = "Corrige le rôle des biologistes Lauriane et Emmanuel → lab_tech"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Affiche ce qui serait fait sans modifier la base de données",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING("MODE DRY-RUN - aucune modification ne sera appliquee\n"))

        changed = 0
        not_found = []

        for username in LAB_TECH_USERS:
            try:
                user = User.objects.get(username=username)
                if user.role == 'lab_tech':
                    self.stdout.write(
                        f"  [OK] {user.get_full_name()} ({username}) - role deja lab_tech, rien a faire"
                    )
                else:
                    old_role = user.role
                    if not dry_run:
                        user.role = 'lab_tech'
                        user.save(update_fields=['role'])
                    prefix = "[DRY-RUN] " if dry_run else ""
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  {prefix}[MAJ] {user.get_full_name()} ({username}) : {old_role} -> lab_tech"
                        )
                    )
                    changed += 1
            except User.DoesNotExist:
                not_found.append(username)
                self.stdout.write(
                    self.style.ERROR(f"  [ERREUR] Utilisateur '{username}' introuvable dans la base de donnees")
                )

        self.stdout.write("")
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Termine - {changed} role(s) mis a jour"))
        else:
            self.stdout.write(self.style.WARNING(f"Dry-run termine - {changed} role(s) auraient ete mis a jour"))

        if not_found:
            self.stdout.write(self.style.ERROR(f"Utilisateurs non trouves : {', '.join(not_found)}"))
