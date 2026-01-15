
import sys
import os

print(f"Executable: {sys.executable}")
print(f"Path: {sys.path}")

try:
    import weasyprint
    print(f"WeasyPrint: {weasyprint.__version__} at {os.path.dirname(weasyprint.__file__)}")
except ImportError as e:
    print(f"WeasyPrint ERROR: {e}")

try:
    import django_weasyprint
    print(f"Django-WeasyPrint: {os.path.dirname(django_weasyprint.__file__)}")
except ImportError as e:
    print(f"Django-WeasyPrint ERROR: {e}")
