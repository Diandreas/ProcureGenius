from django.core.management.base import BaseCommand
from apps.laboratory.models import LabTest
from apps.invoicing.models import Product, ProductCategory

class Command(BaseCommand):
    help = 'Ensures every LabTest has a linked consumable Product'

    def handle(self, *args, **options):
        self.stdout.write("Checking Lab Tests for missing products...")
        
        tests = LabTest.objects.all()
        updated_count = 0
        
        for test in tests:
            if not test.linked_product:
                self.stdout.write(f"Creating product for test: {test.test_code}")
                # Calling save will trigger the auto-create logic we just added
                test.save()
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {updated_count} lab tests."))
