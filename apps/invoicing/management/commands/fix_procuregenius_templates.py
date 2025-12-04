"""
Management command pour corriger les PrintTemplates qui utilisent "ProcureGenius"
Usage: python manage.py fix_procuregenius_templates
"""
from django.core.management.base import BaseCommand
from apps.invoicing.models import PrintTemplate
from apps.core.models import OrganizationSettings


class Command(BaseCommand):
    help = 'Corrige les PrintTemplates qui utilisent "ProcureGenius" comme nom d\'entreprise'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("CORRECTION DES PRINT TEMPLATES"))
        self.stdout.write("="*80 + "\n")

        # Trouver tous les PrintTemplate avec "ProcureGenius" ou "PROCUREGENIUS"
        templates_to_fix = PrintTemplate.objects.filter(
            header_company_name__icontains="procuregenius"
        )

        count = templates_to_fix.count()
        self.stdout.write(f"Templates trouvés avec 'ProcureGenius': {count}\n")

        if count == 0:
            self.stdout.write(self.style.WARNING("Aucun template à corriger."))
            return

        fixed_count = 0
        for template in templates_to_fix:
            self.stdout.write(f"\nTemplate: {template.name}")
            self.stdout.write(f"  Type: {template.template_type}")
            self.stdout.write(f"  Organisation: {template.organization.name if template.organization else 'Aucune'}")
            self.stdout.write(f"  Ancien nom: '{template.header_company_name}'")

            # Essayer de récupérer le vrai nom de l'entreprise
            new_name = None

            if template.organization:
                # Chercher OrganizationSettings
                org_settings = OrganizationSettings.objects.filter(
                    organization=template.organization
                ).first()

                if org_settings and org_settings.company_name and org_settings.company_name.strip():
                    new_name = org_settings.company_name
                    self.stdout.write(self.style.SUCCESS(f"  → Trouvé dans OrganizationSettings: '{new_name}'"))
                elif template.organization.name:
                    new_name = template.organization.name
                    self.stdout.write(self.style.WARNING(f"  → Utilisation du nom de l'organisation: '{new_name}'"))
                else:
                    new_name = ""
                    self.stdout.write(self.style.WARNING(f"  → Aucun nom disponible, utilisation de chaîne vide"))

                # Mettre à jour le template
                template.header_company_name = new_name
                template.save()
                self.stdout.write(self.style.SUCCESS(f"  ✓ Template mis à jour"))
                fixed_count += 1
            else:
                self.stdout.write(self.style.ERROR(f"  ⚠ Template sans organisation, ignoré"))

        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS(f"CORRECTION TERMINÉE - {fixed_count}/{count} templates corrigés"))
        self.stdout.write("="*80 + "\n")
