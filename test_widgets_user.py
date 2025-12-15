"""
Script pour tester les widgets avec un utilisateur spécifique
Usage: py test_widgets_user.py sophiemartin
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.analytics.widget_data_service import WidgetDataService
from apps.invoicing.models import Invoice, InvoiceItem, Product
from apps.accounts.models import Client
from apps.purchase_orders.models import PurchaseOrder
from apps.suppliers.models import Supplier

User = get_user_model()

def print_separator(char='=', length=100):
    print(char * length)

def list_users():
    """Lister tous les utilisateurs avec leurs stats"""
    print_separator()
    print("👥 UTILISATEURS DISPONIBLES")
    print_separator()
    
    users = User.objects.filter(is_active=True).select_related('organization')
    
    if not users:
        print("❌ Aucun utilisateur actif trouvé")
        return
    
    print(f"\nTrouvé {users.count()} utilisateur(s) actif(s):\n")
    
    for i, user in enumerate(users, 1):
        print(f"{i}. {user.username}")
        if user.organization:
            print(f"   Organisation: {user.organization.name}")
            
            # Stats rapides
            org = user.organization
            clients = Client.objects.filter(organization=org).count()
            factures = Invoice.objects.filter(created_by__organization=org).count()
            produits = Product.objects.filter(organization=org).count()
            bcs = PurchaseOrder.objects.filter(created_by__organization=org).count()
            
            print(f"   📊 {clients} client(s), {factures} facture(s), {produits} produit(s), {bcs} BC(s)")
        else:
            print(f"   ⚠️  Pas d'organisation")
        print()

def test_user_data(username):
    """Tester les widgets avec un utilisateur spécifique"""
    print_separator()
    print(f"🧪 TEST DES WIDGETS POUR: {username}")
    print_separator()
    
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"❌ Utilisateur '{username}' introuvable")
        print("\nUtilisateurs disponibles:")
        list_users()
        return
    
    print(f"\n✓ Utilisateur: {user.username}")
    if user.organization:
        print(f"✓ Organisation: {user.organization.name}")
        org = user.organization
        
        # Afficher les stats de la base
        print("\n📊 Données dans la base:")
        stats = {
            'Clients': Client.objects.filter(organization=org).count(),
            'Factures': Invoice.objects.filter(created_by__organization=org).count(),
            'Factures payées': Invoice.objects.filter(created_by__organization=org, status='paid').count(),
            'Lignes de factures': InvoiceItem.objects.filter(invoice__created_by__organization=org).count(),
            'Produits': Product.objects.filter(organization=org).count(),
            'Bons de commande': PurchaseOrder.objects.filter(created_by__organization=org).count(),
            'Fournisseurs': Supplier.objects.filter(organization=org).count(),
        }
        
        for key, value in stats.items():
            icon = "✅" if value > 0 else "⚠️ "
            print(f"   {icon} {key:30} {value:>5}")
    else:
        print("⚠️  Utilisateur sans organisation")
        return
    
    # Tester quelques widgets clés
    print("\n" + "="*100)
    print("🧪 TEST DES WIDGETS PRINCIPAUX")
    print("="*100)
    
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)
    service = WidgetDataService(user, start_date, end_date)
    
    widgets_to_test = [
        ('financial_summary', 'Vue Financière'),
        ('invoices_overview', 'Aperçu Factures'),
        ('top_clients', 'Top Clients'),
        ('cash_flow_summary', 'Trésorerie'),
        ('top_selling_products', 'Top Produits'),
        ('po_overview', 'Aperçu BCs'),
    ]
    
    for widget_code, widget_name in widgets_to_test:
        print(f"\n🔍 {widget_name} ({widget_code})")
        print("-" * 100)
        
        try:
            data = service.get_widget_data(widget_code, limit=5, compare=False)
            
            # Afficher un résumé des données
            if isinstance(data, dict):
                print("   ✅ Données récupérées:")
                for key, value in data.items():
                    if isinstance(value, list):
                        print(f"      • {key}: {len(value)} élément(s)")
                        if value and len(value) > 0:
                            # Afficher le premier élément pour exemple
                            print(f"        Exemple: {str(value[0])[:80]}")
                    elif isinstance(value, (int, float)):
                        print(f"      • {key}: {value}")
                    elif isinstance(value, dict):
                        print(f"      • {key}: {len(value)} clé(s) - {list(value.keys())}")
                    else:
                        print(f"      • {key}: {str(value)[:50]}")
            
        except Exception as e:
            print(f"   ❌ ERREUR: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    print("\n" + "="*100)
    print("✅ TEST TERMINÉ")
    print("="*100)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        username = sys.argv[1]
        test_user_data(username)
    else:
        print("Usage: py test_widgets_user.py <username>")
        print("\nOu listez les utilisateurs disponibles:\n")
        list_users()

