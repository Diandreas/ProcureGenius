import os
import sys
from django.conf import settings
from django.template.loader import render_to_string
import django

# Setup minimal django
if not settings.configured:
    settings.configure(
        DEBUG=True,
        INSTALLED_APPS=['django.contrib.contenttypes', 'apps.invoicing', 'apps.laboratory'],
        TEMPLATES=[{
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [os.path.join(os.getcwd(), 'templates')],
            'APP_DIRS': True,
        }],
    )
    django.setup()

def test_weasyprint():
    try:
        from weasyprint import HTML
        print("[OK] WeasyPrint imported")
        
        html_string = "<html><body><h1>Test</h1></body></html>"
        html = HTML(string=html_string)
        print("[OK] HTML object created")
        
        pdf = html.write_pdf()
        print(f"[OK] PDF generated, type: {type(pdf)}")
        
        # Test with unpacking if it returns a tuple in some version
        try:
            res = html.write_pdf()
            if isinstance(res, tuple):
                print(f"[INFO] write_pdf returns a tuple of length {len(res)}")
            else:
                print("[INFO] write_pdf returns a single object")
        except Exception as e:
            print(f"[FAIL] Unpacking test: {e}")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_weasyprint()
