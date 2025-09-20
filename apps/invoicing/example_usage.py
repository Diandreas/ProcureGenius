"""
Exemples d'utilisation du système de facturation avec plusieurs éléments

Ce fichier montre comment utiliser efficacement le système de facturation
pour créer des factures avec plusieurs éléments, similaire au modèle Laravel montré.
"""

from datetime import date, timedelta
from django.contrib.auth import get_user_model
from .models import Invoice, InvoiceItem

User = get_user_model()


def example_create_invoice_with_multiple_items():
    """
    Exemple : Créer une facture avec plusieurs éléments en une seule opération
    Similaire à la méthode createForBarter() de l'exemple Laravel
    """
    
    # Récupérer l'utilisateur et le client
    user = User.objects.first()  # À adapter selon votre logique
    client = User.objects.filter(is_staff=False).first()  # À adapter selon vos modèles
    
    # Définir les éléments de la facture
    items_data = [
        {
            'service_code': 'WEB-DEV',
            'description': 'Développement site web',
            'quantity': 40,
            'unit_price': 75.00,
            'unit_of_measure': 'heure',
            'detailed_description': 'Développement frontend et backend'
        },
        {
            'service_code': 'DESIGN',
            'description': 'Design UI/UX',
            'quantity': 20,
            'unit_price': 85.00,
            'unit_of_measure': 'heure',
            'detailed_description': 'Création des maquettes et prototypes'
        },
        {
            'service_code': 'DEPLOY',
            'description': 'Déploiement et configuration serveur',
            'quantity': 8,
            'unit_price': 95.00,
            'unit_of_measure': 'heure',
            'detailed_description': 'Configuration serveur et mise en production'
        }
    ]
    
    # Créer la facture avec tous ses éléments
    invoice = Invoice.create_with_items(
        created_by=user,
        title='Facture développement site web - Projet ABC',
        due_date=date.today() + timedelta(days=30),
        items_data=items_data,
        # Paramètres supplémentaires
        client=client,
        description='Facture pour le développement complet du site web',
        payment_terms='Net 30',
        currency='CAD',
        billing_address='123 Rue Example, Montréal, QC, H1A 1A1'
    )
    
    print(f"Facture créée : {invoice.invoice_number}")
    print(f"Nombre d'éléments : {invoice.get_items_count()}")
    print(f"Total : {invoice.format_amount(invoice.total_amount)}")
    
    return invoice


def example_add_items_to_existing_invoice():
    """
    Exemple : Ajouter des éléments à une facture existante
    """
    
    # Récupérer une facture existante
    invoice = Invoice.objects.filter(status='draft').first()
    
    if invoice:
        # Ajouter des éléments un par un
        invoice.add_item(
            service_code='MAINT',
            description='Maintenance mensuelle',
            quantity=1,
            unit_price=150.00,
            unit_of_measure='forfait',
            detailed_description='Maintenance et mises à jour de sécurité'
        )
        
        invoice.add_item(
            service_code='SUPPORT',
            description='Support technique',
            quantity=5,
            unit_price=50.00,
            unit_of_measure='heure',
            detailed_description='Support technique par email et téléphone'
        )
        
        print(f"Éléments ajoutés à la facture {invoice.invoice_number}")
        print(f"Nouveau total : {invoice.format_amount(invoice.total_amount)}")
    
    return invoice


def example_clone_invoice_with_modifications():
    """
    Exemple : Cloner une facture avec ses éléments et des modifications
    """
    
    # Récupérer une facture à cloner
    original_invoice = Invoice.objects.first()
    
    if original_invoice:
        # Cloner avec des modifications
        cloned_invoice = original_invoice.clone_with_items(
            title=f"{original_invoice.title} - Mois suivant",
            due_date=date.today() + timedelta(days=45),
            status='draft'
        )
        
        print(f"Facture clonée : {cloned_invoice.invoice_number}")
        print(f"Facture originale : {original_invoice.invoice_number}")
        print(f"Éléments copiés : {cloned_invoice.get_items_count()}")
    
    return cloned_invoice


def example_manage_invoice_items():
    """
    Exemple : Gestion avancée des éléments de facture
    """
    
    invoice = Invoice.objects.filter(status='draft').first()
    
    if invoice:
        print(f"Facture {invoice.invoice_number}")
        print(f"Items avant modifications : {invoice.get_items_count()}")
        
        # Afficher tous les éléments
        for item in invoice.items.all():
            print(f"  - {item.description}: {item.quantity} x {item.unit_price} = {item.total_price}")
        
        # Trouver les éléments d'un service spécifique
        web_items = invoice.get_items_by_service('WEB-DEV')
        print(f"Éléments 'WEB-DEV' : {web_items.count()}")
        
        # Calculer la quantité totale
        total_qty = invoice.get_total_quantity()
        print(f"Quantité totale : {total_qty}")
        
        # Supprimer un élément (exemple)
        if invoice.items.exists():
            item_to_remove = invoice.items.first()
            invoice.remove_item(item_to_remove.id)
            print(f"Élément supprimé : {item_to_remove.description}")
        
        print(f"Items après suppression : {invoice.get_items_count()}")
    
    return invoice


def example_create_invoice_like_laravel_barter():
    """
    Exemple : Créer une facture similaire à createForBarter() de Laravel
    """
    
    user = User.objects.first()
    client = User.objects.filter(is_staff=False).first()
    
    # Simuler les données d'un "troc" ou échange
    exchange_data = {
        'reference': 'TROC-2024-001',
        'additional_payment': 250.00,
        'description': 'Échange de services + paiement complémentaire'
    }
    
    # Créer la facture pour l'échange
    items_data = [
        {
            'service_code': 'EXCHANGE',
            'description': f'Échange de services - {exchange_data["reference"]}',
            'quantity': 1,
            'unit_price': 0.00,  # Pas de prix pour l'échange
            'unit_of_measure': 'forfait',
            'detailed_description': 'Services échangés dans le cadre du troc'
        }
    ]
    
    # Ajouter le paiement complémentaire si nécessaire
    if exchange_data['additional_payment'] > 0:
        items_data.append({
            'service_code': 'PAYMENT',
            'description': 'Paiement complémentaire',
            'quantity': 1,
            'unit_price': exchange_data['additional_payment'],
            'unit_of_measure': 'forfait',
            'detailed_description': 'Différence à payer en plus de l\'échange'
        })
    
    # Créer la facture
    invoice = Invoice.create_with_items(
        created_by=user,
        title=f'Facture d\'échange - {exchange_data["reference"]}',
        due_date=date.today() + timedelta(days=30),
        items_data=items_data,
        client=client,
        description=exchange_data['description'],
        payment_terms='Net 30',
        currency='CAD',
        status='paid' if exchange_data['additional_payment'] == 0 else 'sent'
    )
    
    print(f"Facture d'échange créée : {invoice.invoice_number}")
    print(f"Statut : {invoice.get_status_display()}")
    print(f"Total : {invoice.format_amount(invoice.total_amount)}")
    
    return invoice


def example_bulk_operations():
    """
    Exemple : Opérations en lot sur les factures
    """
    
    # Trouver toutes les factures avec des éléments
    invoices_with_items = Invoice.objects.filter(items__isnull=False).distinct()
    
    print(f"Factures avec éléments : {invoices_with_items.count()}")
    
    # Statistiques globales
    total_invoices = 0
    total_items = 0
    total_amount = 0
    
    for invoice in invoices_with_items:
        items_count = invoice.get_items_count()
        total_invoices += 1
        total_items += items_count
        total_amount += float(invoice.total_amount)
        
        print(f"  {invoice.invoice_number}: {items_count} éléments, {invoice.format_amount(invoice.total_amount)}")
    
    print(f"\nRésumé :")
    print(f"  Factures : {total_invoices}")
    print(f"  Éléments totaux : {total_items}")
    print(f"  Montant total : {total_amount:,.2f} CAD")
    print(f"  Moyenne éléments/facture : {total_items/total_invoices if total_invoices > 0 else 0:.1f}")


if __name__ == "__main__":
    """
    Tests des fonctionnalités
    """
    print("=== Exemples d'utilisation du système de facturation ===\n")
    
    try:
        # Créer une facture avec plusieurs éléments
        print("1. Création d'une facture avec plusieurs éléments")
        invoice1 = example_create_invoice_with_multiple_items()
        print()
        
        # Ajouter des éléments à une facture existante
        print("2. Ajout d'éléments à une facture existante")
        example_add_items_to_existing_invoice()
        print()
        
        # Cloner une facture
        print("3. Clonage d'une facture avec modifications")
        example_clone_invoice_with_modifications()
        print()
        
        # Gestion des éléments
        print("4. Gestion avancée des éléments")
        example_manage_invoice_items()
        print()
        
        # Facture d'échange (style Laravel)
        print("5. Facture d'échange (similaire à Laravel)")
        example_create_invoice_like_laravel_barter()
        print()
        
        # Opérations en lot
        print("6. Statistiques et opérations en lot")
        example_bulk_operations()
        
    except Exception as e:
        print(f"Erreur : {e}")
        print("Assurez-vous que la base de données est configurée et qu'il y a des utilisateurs.")
