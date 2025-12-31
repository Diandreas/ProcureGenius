#!/bin/bash

# Script pour installer les dépendances Django essentielles
# Compatible avec Django 4.2

echo "🐍 Installation des dépendances Django essentielles..."

# Activer l'environnement virtuel si pas déjà fait
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activation de l'environnement virtuel..."
    source venv/bin/activate
fi

# Installer les dépendances essentielles d'abord
echo "📦 Installation des dépendances de base..."
pip install --upgrade pip

# Django et composants essentiels (versions compatibles)
pip install Django==4.2.11
pip install djangorestframework
pip install django-filter
pip install django-crispy-forms
pip install crispy-bootstrap5
pip install python-dotenv

# Base de données
pip install psycopg2-binary

# Sécurité et CORS
pip install django-cors-headers

# Autres dépendances essentielles
pip install django-allauth django-import-export django-modeltranslation django-background-tasks django-debug-toolbar sentry-sdk jsonschema

# Data processing
pip install pandas openpyxl xlrd numpy

# Fuzzy matching
pip install fuzzywuzzy python-Levenshtein jellyfish rapidfuzz

# PDF et génération de code QR
pip install weasyprint django-weasyprint xhtml2pdf qrcode

# Serveur
pip install gunicorn

echo "✅ Dépendances essentielles installées"

# Tester Django
echo "🧪 Test de Django..."
python -c "
import django
from django.conf import settings
settings.configure(
    SECRET_KEY='test-key-for-installation',
    INSTALLED_APPS=[
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'rest_framework',
        'django_filters',
        'crispy_forms',
        'corsheaders',
    ],
    USE_TZ=True,
)
django.setup()
print('✅ Django et dépendances fonctionnelles')
"

echo "🎉 Prêt pour le déploiement !"

