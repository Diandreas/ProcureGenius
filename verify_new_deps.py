#!/usr/bin/env python3
"""
Script de vérification des nouvelles dépendances pour ProcureGenius
"""

import sys
import importlib

def check_dependency(name, package_name=None):
    """Vérifie si une dépendance est installée"""
    if package_name is None:
        package_name = name

    try:
        importlib.import_module(package_name)
        print(f"✅ {name}")
        return True
    except ImportError:
        print(f"❌ {name}")
        return False

def main():
    print("🔍 Vérification des nouvelles dépendances ProcureGenius")
    print("=" * 60)

    # Django et composants principaux
    django_deps = [
        ("Django", "django"),
        ("Django REST Framework", "rest_framework"),
        ("Django Filter", "django_filters"),
        ("Django Crispy Forms", "crispy_forms"),
        ("Crispy Bootstrap 5", "crispy_bootstrap5"),
        ("Django Allauth", "allauth"),
        ("Django Import Export", "import_export"),
        ("Django Model Translation", "modeltranslation"),
        ("Python Dotenv", "dotenv"),
    ]

    # Nouvelles dépendances ajoutées
    new_deps = [
        ("Django CORS Headers", "corsheaders"),
        ("Django Background Tasks", "background_task"),
        ("Django Debug Toolbar", "debug_toolbar"),
        ("Sentry SDK", "sentry_sdk"),
        ("JSON Schema", "jsonschema"),
        ("Pandas", "pandas"),
        ("OpenPyXL", "openpyxl"),
        ("NumPy", "numpy"),
        ("FuzzyWuzzy", "fuzzywuzzy"),
        ("Python Levenshtein", "Levenshtein"),
        ("Jellyfish", "jellyfish"),
        ("RapidFuzz", "rapidfuzz"),
        ("WeasyPrint", "weasyprint"),
        ("Django WeasyPrint", "django_weasyprint"),
        ("XHTML2PDF", "xhtml2pdf"),
        ("QRCode", "qrcode"),
        ("Pillow", "PIL"),
    ]

    # Dépendances optionnelles
    optional_deps = [
        ("Redis", "redis"),
        ("Celery", "celery"),
        ("Psycopg2", "psycopg2"),
        ("Gunicorn", "gunicorn"),
        ("Requests", "requests"),
        ("Stripe", "stripe"),
        ("PayPal SDK", "paypalrestsdk"),
        ("Mistral AI", "mistralai"),
        ("Boto3", "boto3"),
        ("Django Storages", "storages"),
    ]

    failed_deps = []

    print("\n📦 DÉPENDANCES DJANGO PRINCIPALES:")
    print("-" * 40)
    for name, package in django_deps:
        if not check_dependency(name, package):
            failed_deps.append(package)

    print("\n🆕 NOUVELLES DÉPENDANCES AJOUTÉES:")
    print("-" * 40)
    for name, package in new_deps:
        if not check_dependency(name, package):
            failed_deps.append(package)

    print("\n🔧 DÉPENDANCES OPTIONNELLES:")
    print("-" * 40)
    for name, package in optional_deps:
        check_dependency(name, package)

    print("\n" + "=" * 60)

    if failed_deps:
        print(f"❌ {len(failed_deps)} dépendance(s) manquante(s):")
        for dep in failed_deps:
            print(f"   - {dep}")
        print("\n💡 Installez-les avec:")
        print("   pip install " + " ".join(failed_deps))
        return 1
    else:
        print("✅ Toutes les dépendances sont installées !")
        return 0

if __name__ == "__main__":
    sys.exit(main())


