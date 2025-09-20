#!/usr/bin/env python
import os
import sys
import django

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Créer un superutilisateur automatiquement
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@procuregenius.com',
        password='admin123',
        first_name='Administrateur',
        last_name='ProcureGenius'
    )
    print("Superutilisateur 'admin' cree avec le mot de passe 'admin123'")
else:
    print("Le superutilisateur 'admin' existe deja")

# Créer des templates par défaut
from apps.invoicing.models import PrintTemplate, PrintConfiguration

if not PrintTemplate.objects.filter(template_type='invoice', is_default=True).exists():
    PrintTemplate.objects.create(
        name="Template Facture par défaut",
        template_type='invoice',
        is_default=True,
        header_company_name="ProcureGenius",
        header_address="123 Rue de la Technologie\nMontréal, QC H1A 1A1\nCanada",
        header_phone="+1 (514) 123-4567",
        header_email="contact@procuregenius.com",
        footer_text="Merci de votre confiance",
        footer_conditions="Paiement à 30 jours. Retard de paiement : intérêts de 1,5% par mois."
    )
    print("Template de facture par defaut cree")

if not PrintTemplate.objects.filter(template_type='purchase_order', is_default=True).exists():
    PrintTemplate.objects.create(
        name="Template BC par défaut",
        template_type='purchase_order',
        is_default=True,
        header_company_name="ProcureGenius",
        header_address="123 Rue de la Technologie\nMontréal, QC H1A 1A1\nCanada",
        header_phone="+1 (514) 123-4567",
        header_email="contact@procuregenius.com",
        footer_text="Merci de confirmer la réception de cette commande",
        footer_conditions="Livraison selon les termes convenus. Retard de livraison à signaler immédiatement."
    )
    print("Template de bon de commande par defaut cree")

if not PrintConfiguration.objects.filter(is_default=True).exists():
    PrintConfiguration.objects.create(
        name="Configuration par défaut",
        is_default=True
    )
    print("Configuration d'impression par defaut creee")

print("\nApplication prete a etre utilisee !")
print("   URL: http://127.0.0.1:8000")
print("   Admin: http://127.0.0.1:8000/admin")
print("   Login: admin / admin123")