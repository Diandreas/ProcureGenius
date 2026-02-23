"""
Commande interactive pour configurer le SMTP de l'organisation dans la BD.

Usage:
    python manage.py configure_smtp
    python manage.py configure_smtp --host smtp.hostinger.com --port 465 --non-interactive
"""
import sys
import socket
import smtplib
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = "Configure le serveur SMTP de l'organisation dans la base de données"

    def add_arguments(self, parser):
        parser.add_argument('--host', default='smtp.hostinger.com', help='Serveur SMTP (défaut: smtp.hostinger.com)')
        parser.add_argument('--port', type=int, default=465, help='Port SMTP (défaut: 465)')
        parser.add_argument('--username', default='contact@centrejulianna.com', help='Adresse email / identifiant SMTP')
        parser.add_argument('--from-name', default='Centre Julianna', help='Nom affiché dans les emails')
        parser.add_argument('--non-interactive', action='store_true', help='Pas de prompts interactifs (utilise les valeurs passées)')

    def handle(self, *args, **options):
        from apps.accounts.models import Organization, EmailConfiguration
        from apps.core.encryption import encrypt_value

        # --- Sélection de l'organisation ---
        orgs = Organization.objects.all().order_by('name')
        if not orgs.exists():
            raise CommandError("Aucune organisation trouvée dans la base de données.")

        if orgs.count() == 1:
            org = orgs.first()
            self.stdout.write(f"Organisation : {self.style.SUCCESS(org.name)}")
        else:
            self.stdout.write("\nOrganisations disponibles :")
            for i, o in enumerate(orgs, 1):
                self.stdout.write(f"  {i}. {o.name}")
            choice = input("Choisissez le numéro de l'organisation : ").strip()
            try:
                idx = int(choice) - 1
                org = list(orgs)[idx]
            except (ValueError, IndexError):
                raise CommandError("Sélection invalide.")

        # --- Afficher config existante ---
        existing = EmailConfiguration.objects.filter(organization=org).first()
        if existing:
            self.stdout.write(self.style.WARNING("\nConfiguration SMTP existante :"))
            self.stdout.write(f"  Hôte    : {existing.smtp_host}")
            self.stdout.write(f"  Port    : {existing.smtp_port}")
            self.stdout.write(f"  User    : {existing.smtp_username}")
            self.stdout.write(f"  SSL     : {existing.use_ssl}  TLS: {existing.use_tls}")
            self.stdout.write(f"  Vérifié : {existing.is_verified}")

        # --- Collecte des valeurs ---
        non_interactive = options['non_interactive']

        def ask(prompt, default):
            if non_interactive:
                return default
            val = input(f"{prompt} [{default}] : ").strip()
            return val if val else default

        def ask_password(prompt):
            if non_interactive:
                raise CommandError("Mode non-interactif : le mot de passe doit être fourni via --password (non supporté pour la sécurité). Lancez sans --non-interactive.")
            import getpass
            return getpass.getpass(f"{prompt} : ").strip()

        self.stdout.write("\n--- Entrez les paramètres SMTP (Entrée = valeur par défaut) ---")

        smtp_host = ask("Serveur SMTP", options['host'])
        smtp_port = int(ask("Port SMTP", str(options['port'])))
        smtp_username = ask("Email/identifiant SMTP", options['username'])
        from_name = ask("Nom expéditeur", options['from_name'])
        from_email = ask("Email expéditeur (from)", smtp_username)

        # Déterminer SSL/TLS selon le port
        if smtp_port == 465:
            use_ssl = True
            use_tls = False
        elif smtp_port == 587:
            use_ssl = False
            use_tls = True
        else:
            use_ssl_str = ask("Utiliser SSL? (o/n)", "o" if smtp_port == 465 else "n")
            use_ssl = use_ssl_str.lower() in ('o', 'oui', 'y', 'yes', '1')
            use_tls = not use_ssl

        self.stdout.write(f"  → Sécurité : {'SSL (port 465)' if use_ssl else 'TLS/STARTTLS (port 587)'}")

        # Mot de passe
        smtp_password = ask_password("Mot de passe SMTP")
        if not smtp_password:
            raise CommandError("Le mot de passe ne peut pas être vide.")

        # --- Test de connexion SMTP ---
        self.stdout.write("\nTest de connexion SMTP en cours...")
        connection_ok = self._test_smtp(smtp_host, smtp_port, smtp_username, smtp_password, use_ssl, use_tls)

        if not connection_ok and not non_interactive:
            confirm = input("La connexion a échoué. Sauvegarder quand même ? [o/N] : ").strip().lower()
            if confirm not in ('o', 'oui', 'y', 'yes'):
                self.stdout.write(self.style.WARNING("Configuration annulée."))
                return

        # --- Chiffrement et sauvegarde ---
        encrypted_password = encrypt_value(smtp_password)

        config, created = EmailConfiguration.objects.update_or_create(
            organization=org,
            defaults={
                'smtp_host': smtp_host,
                'smtp_port': smtp_port,
                'smtp_username': smtp_username,
                'smtp_password_encrypted': encrypted_password,
                'use_ssl': use_ssl,
                'use_tls': use_tls,
                'default_from_email': from_email,
                'default_from_name': from_name,
                'is_verified': connection_ok,
                'last_verified_at': timezone.now() if connection_ok else None,
            }
        )

        action = "créée" if created else "mise à jour"
        self.stdout.write(self.style.SUCCESS(
            f"\nConfiguration SMTP {action} pour '{org.name}' !"
        ))
        self.stdout.write(f"  Hôte    : {smtp_host}:{smtp_port}")
        self.stdout.write(f"  User    : {smtp_username}")
        self.stdout.write(f"  From    : {from_name} <{from_email}>")
        self.stdout.write(f"  SSL     : {use_ssl}  TLS: {use_tls}")
        self.stdout.write(f"  Vérifié : {connection_ok}")

    def _test_smtp(self, host, port, username, password, use_ssl, use_tls):
        """Teste la connexion SMTP et retourne True si succès."""
        try:
            if use_ssl:
                server = smtplib.SMTP_SSL(host, port, timeout=10)
            else:
                server = smtplib.SMTP(host, port, timeout=10)
                if use_tls:
                    server.starttls()

            server.login(username, password)
            server.quit()
            self.stdout.write(self.style.SUCCESS("  ✓ Connexion SMTP réussie !"))
            return True
        except smtplib.SMTPAuthenticationError:
            self.stdout.write(self.style.ERROR("  ✗ Erreur d'authentification SMTP (identifiant/mot de passe incorrect)"))
        except smtplib.SMTPConnectError as e:
            self.stdout.write(self.style.ERROR(f"  ✗ Impossible de se connecter au serveur SMTP : {e}"))
        except socket.timeout:
            self.stdout.write(self.style.ERROR(f"  ✗ Timeout : le serveur {host}:{port} ne répond pas"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  ✗ Erreur SMTP : {e}"))
        return False
