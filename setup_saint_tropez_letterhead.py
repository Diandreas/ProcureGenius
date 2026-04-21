import os
import django
import sys
from django.core.files import File

# Configuration de l'environnement Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.laboratory.models import SubcontractorLab

def setup_letterhead():
    try:
        sub = SubcontractorLab.objects.get(name='CLINIQUE SAINT TROPEZ')
        
        # Chemins vers les images dans static
        static_dir = os.path.join('apps', 'laboratory', 'static', 'laboratory', 'images')
        header_path = os.path.join(static_dir, 'saint_tropez_header.png')
        footer_path = os.path.join(static_dir, 'saint_tropez_footer.png')
        
        if os.path.exists(header_path):
            with open(header_path, 'rb') as f:
                sub.header_image.save('saint_tropez_header.png', File(f), save=False)
            print(f"Header image saved for {sub.name}")
        else:
            print(f"Warning: Header image not found at {header_path}")
            
        if os.path.exists(footer_path):
            with open(footer_path, 'rb') as f:
                sub.footer_image.save('saint_tropez_footer.png', File(f), save=False)
            print(f"Footer image saved for {sub.name}")
        else:
            print(f"Warning: Footer image not found at {footer_path}")
            
        sub.save()
        print("Subcontractor CLINIQUE SAINT TROPEZ configured successfully.")
        
    except SubcontractorLab.DoesNotExist:
        print("Error: Subcontractor 'CLINIQUE SAINT TROPEZ' not found in database.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    setup_letterhead()
