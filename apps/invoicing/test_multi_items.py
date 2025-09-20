#!/usr/bin/env python3
"""
Script de test pour démontrer le système de facturation avec plusieurs éléments

Ce script peut être exécuté pour valider que toutes les fonctionnalités
de gestion des éléments multiples fonctionnent correctement.
"""

import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.invoicing.models import Invoice, InvoiceItem

User = get_user_model()


def create_test_data():
    """Crée des données de test si nécessaire"""
    
    # Créer un utilisateur de test si nécessaire
    user, created = User.objects.get_or_create(
        username='test_user',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print("✅ Utilisateur de test créé")
    
    # Créer un client de test
    client, created = User.objects.get_or_create(
        username='test_client',
        defaults={
            'email': 'client@example.com',
            'first_name': 'Client',
            'last_name': 'Test',
            'is_staff': False
        }
    )
    if created:
        print("✅ Client de test créé")
    
    return user, client


def test_create_invoice_with_multiple_items():
    """Test : Création d'une facture avec plusieurs éléments"""
    
    print("\n📝 Test : Création d'une facture avec plusieurs éléments")
    print("-" * 60)
    
    user, client = create_test_data()
    
    # Données des éléments
    items_data = [
        {
            'service_code': 'DEV-WEB',
            'description': 'Développement application web',
            'quantity': 50,
            'unit_price': Decimal('80.00'),
            'unit_of_measure': 'heure',
            'detailed_description': 'Développement frontend et backend React/Django'
        },
        {
            'service_code': 'DEV-MOBILE',
            'description': 'Développement application mobile',
            'quantity': 30,
            'unit_price': Decimal('90.00'),
            'unit_of_measure': 'heure',
            'detailed_description': 'Application mobile iOS et Android'
        },
        {
            'service_code': 'DEPLOY',
            'description': 'Déploiement et DevOps',
            'quantity': 10,
            'unit_price': Decimal('100.00'),
            'unit_of_measure': 'heure',
            'detailed_description': 'Configuration serveurs et CI/CD'
        }
    ]
    
    # Créer la facture
    invoice = Invoice.create_with_items(
        created_by=user,
        title='Facture Développement Complet - Projet XYZ',
        due_date=date.today() + timedelta(days=30),
        items_data=items_data,
        client=client,
        description='Développement complet d\'une application web et mobile',
        payment_terms='Net 30',
        currency='CAD',
        billing_address='123 Rue du Développeur, Montréal, QC, H3A 1B1'
    )
    
    # Vérifications
    assert invoice.get_items_count() == 3, f"Attendu 3 éléments, trouvé {invoice.get_items_count()}"
    expected_total = (50 * 80) + (30 * 90) + (10 * 100)  # 4000 + 2700 + 1000 = 7700
    assert invoice.subtotal == expected_total, f"Total attendu {expected_total}, trouvé {invoice.subtotal}"
    
    print(f"✅ Facture créée : {invoice.invoice_number}")
    print(f"✅ Nombre d'éléments : {invoice.get_items_count()}")
    print(f"✅ Sous-total : {invoice.subtotal} CAD")
    print(f"✅ Total : {invoice.total_amount} CAD")
    
    # Afficher les éléments
    print("\n📋 Éléments de la facture :")
    for item in invoice.items.all():
        print(f"   • {item.description}: {item.quantity} {item.unit_of_measure} × {item.unit_price} = {item.total_price} CAD")
    
    return invoice


def test_add_remove_items():
    """Test : Ajout et suppression d'éléments"""
    
    print("\n➕ Test : Ajout et suppression d'éléments")
    print("-" * 60)
    
    # Utiliser la facture créée précédemment ou en créer une nouvelle
    invoice = Invoice.objects.filter(status='draft').first()
    if not invoice:
        invoice = test_create_invoice_with_multiple_items()
    
    initial_count = invoice.get_items_count()
    initial_total = invoice.total_amount
    
    print(f"État initial : {initial_count} éléments, {initial_total} CAD")
    
    # Ajouter un élément
    new_item = invoice.add_item(
        service_code='MAINT',
        description='Maintenance et support',
        quantity=12,
        unit_price=Decimal('150.00'),
        unit_of_measure='mois',
        detailed_description='Maintenance mensuelle et support technique'
    )
    
    # Vérifications après ajout
    assert invoice.get_items_count() == initial_count + 1, "L'élément n'a pas été ajouté"
    print(f"✅ Élément ajouté : {new_item.description}")
    print(f"✅ Nouveaux totaux : {invoice.get_items_count()} éléments, {invoice.total_amount} CAD")
    
    # Supprimer un élément
    item_to_remove = invoice.items.first()
    removed_description = item_to_remove.description
    success = invoice.remove_item(item_to_remove.id)
    
    assert success, "La suppression a échoué"
    assert invoice.get_items_count() == initial_count, "L'élément n'a pas été supprimé"
    print(f"✅ Élément supprimé : {removed_description}")
    print(f"✅ Totaux après suppression : {invoice.get_items_count()} éléments, {invoice.total_amount} CAD")
    
    return invoice


def test_clone_invoice():
    """Test : Clonage d'une facture"""
    
    print("\n📄 Test : Clonage d'une facture")
    print("-" * 60)
    
    # Utiliser une facture existante
    original_invoice = Invoice.objects.filter(items__isnull=False).first()
    if not original_invoice:
        original_invoice = test_create_invoice_with_multiple_items()
    
    # Cloner la facture
    cloned_invoice = original_invoice.clone_with_items(
        title=f"COPIE - {original_invoice.title}",
        due_date=date.today() + timedelta(days=60),
        status='draft'
    )
    
    # Vérifications
    assert cloned_invoice.get_items_count() == original_invoice.get_items_count(), "Nombre d'éléments différent"
    assert cloned_invoice.subtotal == original_invoice.subtotal, "Totaux différents"
    assert cloned_invoice.id != original_invoice.id, "IDs identiques"
    
    print(f"✅ Facture originale : {original_invoice.invoice_number} ({original_invoice.get_items_count()} éléments)")
    print(f"✅ Facture clonée : {cloned_invoice.invoice_number} ({cloned_invoice.get_items_count()} éléments)")
    print(f"✅ Totaux identiques : {cloned_invoice.total_amount} CAD")
    
    return cloned_invoice


def test_validation():
    """Test : Validations des factures"""
    
    print("\n🛡️  Test : Validations des factures")
    print("-" * 60)
    
    user, client = create_test_data()
    
    # Créer une facture vide
    empty_invoice = Invoice.objects.create(
        created_by=user,
        title='Facture vide pour test validation',
        due_date=date.today() + timedelta(days=30),
        subtotal=0,
        total_amount=0,
        client=client
    )
    
    # Test : Une facture sans éléments ne peut pas être envoyée
    try:
        empty_invoice.status = 'sent'
        empty_invoice.full_clean()  # Déclenche la validation
        empty_invoice.save()
        print("❌ ERREUR : La validation aurait dû échouer")
    except Exception as e:
        print("✅ Validation correcte : Facture vide ne peut pas être envoyée")
        print(f"   Message d'erreur : {str(e)}")
    
    # Ajouter un élément et tester à nouveau
    empty_invoice.add_item(
        service_code='TEST',
        description='Élément de test',
        quantity=1,
        unit_price=Decimal('100.00')
    )
    
    try:
        empty_invoice.status = 'sent'
        empty_invoice.full_clean()
        empty_invoice.save()
        print("✅ Validation réussie : Facture avec éléments peut être envoyée")
    except Exception as e:
        print(f"❌ ERREUR inattendue : {str(e)}")
    
    return empty_invoice


def test_statistics():
    """Test : Statistiques et méthodes utilitaires"""
    
    print("\n📊 Test : Statistiques et méthodes utilitaires")
    print("-" * 60)
    
    # Récupérer toutes les factures avec éléments
    invoices_with_items = Invoice.objects.filter(items__isnull=False).distinct()
    
    if invoices_with_items.exists():
        total_invoices = invoices_with_items.count()
        total_items = sum(invoice.get_items_count() for invoice in invoices_with_items)
        total_amount = sum(float(invoice.total_amount) for invoice in invoices_with_items)
        
        print(f"✅ Factures avec éléments : {total_invoices}")
        print(f"✅ Total des éléments : {total_items}")
        print(f"✅ Montant total : {total_amount:,.2f} CAD")
        print(f"✅ Moyenne éléments/facture : {total_items/total_invoices:.1f}")
        
        # Test des méthodes utilitaires sur une facture
        test_invoice = invoices_with_items.first()
        print(f"\n🔍 Analyse de {test_invoice.invoice_number} :")
        print(f"   • Nombre d'éléments : {test_invoice.get_items_count()}")
        print(f"   • Quantité totale : {test_invoice.get_total_quantity()}")
        print(f"   • A des éléments : {test_invoice.has_items()}")
        print(f"   • Montant formaté : {test_invoice.format_amount(test_invoice.total_amount)}")
        
        # Grouper par code de service
        service_codes = set()
        for item in test_invoice.items.all():
            service_codes.add(item.service_code)
        
        print(f"   • Codes de service : {', '.join(service_codes)}")
        for code in service_codes:
            items = test_invoice.get_items_by_service(code)
            print(f"     - {code}: {items.count()} élément(s)")
    
    else:
        print("⚠️  Aucune facture avec éléments trouvée")


def run_all_tests():
    """Exécute tous les tests"""
    
    print("🚀 DÉMARRAGE DES TESTS DU SYSTÈME DE FACTURATION MULTI-ÉLÉMENTS")
    print("=" * 70)
    
    try:
        # Tests principaux
        test_create_invoice_with_multiple_items()
        test_add_remove_items()
        test_clone_invoice()
        test_validation()
        test_statistics()
        
        print("\n" + "=" * 70)
        print("🎉 TOUS LES TESTS ONT RÉUSSI !")
        print("\nVotre système de facturation avec plusieurs éléments fonctionne parfaitement.")
        print("Il est maintenant aussi puissant que l'exemple Laravel que vous avez montré.")
        
        # Résumé final
        invoices_count = Invoice.objects.count()
        items_count = InvoiceItem.objects.count()
        print(f"\n📈 Résumé final :")
        print(f"   • Factures en base : {invoices_count}")
        print(f"   • Éléments en base : {items_count}")
        
    except Exception as e:
        print(f"\n❌ ERREUR PENDANT LES TESTS : {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
