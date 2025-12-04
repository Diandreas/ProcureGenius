"""
Script de diagnostic pour vérifier les données d'organisation
"""
import os
import sys
import django

# Configurer Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings
from apps.invoicing.models import Invoice
from django.contrib.auth import get_user_model

User = get_user_model()

def check_data():
    print("\n" + "="*80)
    print("DIAGNOSTIC DES DONNÉES D'ORGANISATION")
    print("="*80 + "\n")

    # 1. Vérifier les organisations
    print("1. ORGANISATIONS:")
    orgs = Organization.objects.all()
    print(f"   Nombre total: {orgs.count()}")
    for org in orgs:
        print(f"   - {org.name} (ID: {org.id})")

    # 2. Vérifier OrganizationSettings
    print("\n2. ORGANIZATION SETTINGS:")
    org_settings = OrganizationSettings.objects.all()
    print(f"   Nombre total: {org_settings.count()}")
    for settings in org_settings:
        print(f"\n   Organisation: {settings.organization.name}")
        print(f"   - company_name: '{settings.company_name}'")
        print(f"   - company_address: '{settings.company_address}'")
        print(f"   - company_phone: '{settings.company_phone}'")
        print(f"   - company_email: '{settings.company_email}'")
        print(f"   - paper_size: '{settings.paper_size}'")

    # 3. Vérifier les utilisateurs et leurs organisations
    print("\n3. UTILISATEURS ET LEURS ORGANISATIONS:")
    users = User.objects.all()[:5]  # Premiers 5 utilisateurs
    for user in users:
        print(f"\n   Utilisateur: {user.username} ({user.email})")
        if hasattr(user, 'organization'):
            print(f"   - Organisation: {user.organization.name}")
        else:
            print(f"   - Organisation: AUCUNE")

    # 4. Vérifier les factures et leurs créateurs
    print("\n4. FACTURES ET LEURS CRÉATEURS:")
    invoices = Invoice.objects.all()[:3]  # Premières 3 factures
    for invoice in invoices:
        print(f"\n   Facture: {invoice.invoice_number}")
        print(f"   - Créée par: {invoice.created_by.username}")
        if hasattr(invoice.created_by, 'organization'):
            print(f"   - Organisation du créateur: {invoice.created_by.organization.name}")

            # Vérifier si OrganizationSettings existe
            org_settings = OrganizationSettings.objects.filter(
                organization=invoice.created_by.organization
            ).first()

            if org_settings:
                print(f"   - OrganizationSettings trouvé:")
                print(f"     • company_name: '{org_settings.company_name}'")
                print(f"     • paper_size: '{org_settings.paper_size}'")
            else:
                print(f"   - ❌ OrganizationSettings INTROUVABLE pour cette organisation!")
        else:
            print(f"   - ❌ Utilisateur n'a PAS d'organisation!")

    print("\n" + "="*80)
    print("FIN DU DIAGNOSTIC")
    print("="*80 + "\n")

if __name__ == '__main__':
    check_data()
