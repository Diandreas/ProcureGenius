"""
Nettoie les balises HTML dans les champs technician_notes et interpretation.

Usage:
    python manage.py clean_technician_notes
"""
import re
from django.core.management.base import BaseCommand
from apps.laboratory.models import LabOrderItem


class Command(BaseCommand):
    help = 'Supprime les balises HTML dans les notes technicien'

    def handle(self, *args, **options):
        def clean(text):
            if not text:
                return ''
            return re.sub(r'<[^>]+>', '', text).replace('&nbsp;', ' ').strip()

        updated = 0
        for item in LabOrderItem.objects.exclude(technician_notes=''):
            cleaned = clean(item.technician_notes)
            if cleaned != item.technician_notes:
                item.technician_notes = cleaned
                item.save(update_fields=['technician_notes'])
                updated += 1

        for item in LabOrderItem.objects.exclude(interpretation=''):
            cleaned = clean(item.interpretation)
            if cleaned != item.interpretation:
                item.interpretation = cleaned
                item.save(update_fields=['interpretation'])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Notes nettoyées : {updated} items mis à jour'))

        # Aperçu
        for item in LabOrderItem.objects.exclude(technician_notes='')[:5]:
            self.stdout.write(f'  [{item.lab_test.test_code}] {item.technician_notes[:80]}')
