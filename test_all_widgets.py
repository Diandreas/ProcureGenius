"""
Script de test complet pour tous les widgets du dashboard
Usage: py test_all_widgets.py
"""
import os
import sys
import django
import json
from decimal import Decimal
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.analytics.widget_data_service import WidgetDataService

User = get_user_model()

# Liste des 16 widgets
WIDGETS = [
    # Global (3)
    ('financial_summary', 'Vue Financière Globale', 'global'),
    ('alerts_notifications', 'Alertes et Notifications', 'global'),
    ('cash_flow_summary', 'Trésorerie', 'global'),
    # Clients (3)
    ('top_clients', 'Top Clients', 'clients'),
    ('clients_at_risk', 'Clients à Risque', 'clients'),
    ('pareto_clients', 'Analyse Pareto 80/20', 'clients'),
    # Products (3)
    ('top_selling_products', 'Produits les Plus Vendus', 'products'),
    ('stock_alerts', 'Alertes Stock', 'products'),
    ('margin_analysis', 'Analyse Marges', 'products'),
    # Invoices (2)
    ('invoices_overview', 'Vue Factures', 'invoices'),
    ('overdue_invoices', 'Factures en Retard', 'invoices'),
    # Purchase Orders (4)
    ('po_overview', 'Vue Bons de Commande', 'purchase_orders'),
    ('overdue_po', 'BCs en Retard', 'purchase_orders'),
    ('supplier_performance', 'Top Fournisseurs', 'purchase_orders'),
    ('pending_approvals', 'Approbations en Attente', 'purchase_orders'),
    # AI (1)
    ('ai_suggestions', 'Suggestions IA', 'ai'),
]


def serialize_for_json(obj):
    """Convertir les objets non-JSON en string"""
    if isinstance(obj, (datetime, Decimal)):
        return str(obj)
    return obj


def print_separator(char='=', length=100):
    print(char * length)


def print_header(text):
    print_separator()
    print(f"  {text}")
    print_separator()


def analyze_widget_data(widget_code, data):
    """Analyser les données d'un widget et donner un diagnostic"""
    issues = []
    info = []
    
    if not isinstance(data, dict):
        issues.append(f"❌ Type de retour incorrect: {type(data)} (devrait être dict)")
        return issues, info
    
    # Vérifications spécifiques par widget
    if widget_code == 'financial_summary':
        revenue = data.get('revenue', 0)
        expenses = data.get('expenses', 0)
        if revenue == 0 and expenses == 0:
            issues.append("⚠️  Revenue et expenses à 0 - Vérifiez que vous avez des factures payées")
        else:
            info.append(f"✓ Revenue: {revenue}, Expenses: {expenses}")
    
    elif widget_code == 'top_clients':
        clients = data.get('clients', [])
        if not clients or len(clients) == 0:
            issues.append("⚠️  Aucun client - Vérifiez que vous avez des clients avec des factures")
        else:
            info.append(f"✓ {len(clients)} client(s) trouvé(s)")
    
    elif widget_code == 'pareto_clients':
        total_clients = data.get('total_clients', 0)
        if total_clients == 0:
            issues.append("⚠️  Aucun client - Nécessite plusieurs clients avec factures")
        else:
            info.append(f"✓ {total_clients} client(s) total")
    
    elif widget_code == 'top_selling_products':
        products = data.get('products', [])
        if not products or len(products) == 0:
            issues.append("⚠️  Aucun produit - Vérifiez les lignes de factures (InvoiceItem)")
        else:
            info.append(f"✓ {len(products)} produit(s) trouvé(s)")
    
    elif widget_code == 'stock_alerts':
        low_stock = data.get('low_stock_products', [])
        if 'low_stock_products' not in data:
            issues.append("❌ Clé 'low_stock_products' manquante dans la réponse")
        else:
            info.append(f"✓ {len(low_stock)} produit(s) en stock bas")
    
    elif widget_code == 'cash_flow_summary':
        receivable = data.get('receivable', 0)
        payable = data.get('payable', 0)
        if receivable == 0 and payable == 0:
            issues.append("⚠️  À recevoir et à payer à 0")
        else:
            info.append(f"✓ À recevoir: {receivable}, À payer: {payable}")
    
    elif widget_code == 'invoices_overview':
        by_status = data.get('by_status', {})
        total = data.get('total_invoices', 0)
        if total == 0:
            issues.append("⚠️  Aucune facture")
        else:
            info.append(f"✓ {total} facture(s) total")
            info.append(f"  Statuts: {json.dumps(by_status, default=str)}")
    
    elif widget_code == 'po_overview':
        by_status = data.get('by_status', {})
        total = data.get('total_purchase_orders', 0)
        if total == 0:
            issues.append("⚠️  Aucun bon de commande")
        else:
            info.append(f"✓ {total} BC(s) total")
    
    elif widget_code == 'margin_analysis':
        by_category = data.get('by_category', [])
        total_products = data.get('total_products', 0)
        if total_products == 0:
            issues.append("⚠️  Aucun produit avec prix de revient (cost_price)")
        else:
            info.append(f"✓ {total_products} produit(s) avec marge")
    
    elif widget_code == 'supplier_performance':
        suppliers = data.get('suppliers', [])
        if not suppliers or len(suppliers) == 0:
            issues.append("⚠️  Aucun fournisseur avec commandes")
        else:
            info.append(f"✓ {len(suppliers)} fournisseur(s)")
    
    elif widget_code == 'overdue_invoices':
        invoices = data.get('invoices', [])
        info.append(f"✓ {len(invoices)} facture(s) en retard")
    
    elif widget_code == 'overdue_po':
        pos = data.get('purchase_orders', [])
        info.append(f"✓ {len(pos)} BC(s) en retard")
    
    elif widget_code == 'pending_approvals':
        pos = data.get('purchase_orders', [])
        info.append(f"✓ {len(pos)} BC(s) en attente d'approbation")
    
    elif widget_code == 'alerts_notifications':
        alerts = data.get('alerts', [])
        info.append(f"✓ {len(alerts)} alerte(s)")
    
    elif widget_code == 'clients_at_risk':
        clients = data.get('clients', [])
        info.append(f"✓ {len(clients)} client(s) à risque")
    
    elif widget_code == 'ai_suggestions':
        suggestions = data.get('suggestions', [])
        message = data.get('message', '')
        info.append(f"✓ {len(suggestions)} suggestion(s)")
        if message:
            info.append(f"  Message: {message}")
    
    return issues, info


def test_widget(user, widget_code, widget_name, module):
    """Tester un widget individuel"""
    print(f"\n🔍 TEST: {widget_name} ({widget_code})")
    print(f"   Module: {module}")
    print("-" * 100)
    
    try:
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        service = WidgetDataService(user, start_date, end_date)
        data = service.get_widget_data(widget_code, limit=5, compare=False)
        
        # Analyser les données
        issues, info = analyze_widget_data(widget_code, data)
        
        if issues:
            print("   ⚠️  PROBLÈMES DÉTECTÉS:")
            for issue in issues:
                print(f"      {issue}")
        
        if info:
            print("   📊 INFORMATIONS:")
            for i in info:
                print(f"      {i}")
        
        if not issues:
            print("   ✅ WIDGET OK - Aucun problème détecté")
        
        # Afficher les clés retournées
        if isinstance(data, dict):
            keys = list(data.keys())
            print(f"   🔑 Clés retournées: {', '.join(keys)}")
        
        return True, data, issues
        
    except Exception as e:
        print(f"   ❌ ERREUR: {str(e)}")
        import traceback
        print("\n   📋 Stack trace:")
        for line in traceback.format_exc().split('\n'):
            if line.strip():
                print(f"      {line}")
        return False, None, [str(e)]


def check_database_state(user):
    """Vérifier l'état de la base de données"""
    print_header("🗄️  ÉTAT DE LA BASE DE DONNÉES")
    
    from apps.invoicing.models import Invoice, InvoiceItem, Product
    from apps.accounts.models import Client
    from apps.purchase_orders.models import PurchaseOrder
    from apps.suppliers.models import Supplier
    
    org = user.organization
    
    # Compter les enregistrements
    stats = {
        'Clients': Client.objects.filter(organization=org).count(),
        'Factures': Invoice.objects.filter(created_by__organization=org).count(),
        'Factures payées': Invoice.objects.filter(created_by__organization=org, status='paid').count(),
        'Lignes de factures': InvoiceItem.objects.filter(invoice__created_by__organization=org).count(),
        'Produits': Product.objects.filter(organization=org).count(),
        'Produits physiques': Product.objects.filter(organization=org, product_type='physical').count(),
        'Produits avec cost_price': Product.objects.filter(organization=org, cost_price__gt=0).count(),
        'Bons de commande': PurchaseOrder.objects.filter(created_by__organization=org).count(),
        'Fournisseurs': Supplier.objects.filter(organization=org).count(),
    }
    
    print("\n📊 Statistiques:")
    for key, value in stats.items():
        icon = "✅" if value > 0 else "⚠️ "
        print(f"   {icon} {key:30} {value:>5}")
    
    # Vérifications spécifiques
    print("\n🔍 Vérifications:")
    
    # Vérifier les factures récentes (30 derniers jours)
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)
    recent_invoices = Invoice.objects.filter(
        created_by__organization=org,
        created_at__gte=start_date,
        created_at__lte=end_date
    ).count()
    print(f"   {'✅' if recent_invoices > 0 else '⚠️ '} Factures des 30 derniers jours: {recent_invoices}")
    
    # Vérifier les clients avec factures
    clients_with_invoices = Client.objects.filter(
        organization=org,
        invoices__isnull=False
    ).distinct().count()
    print(f"   {'✅' if clients_with_invoices > 0 else '⚠️ '} Clients avec factures: {clients_with_invoices}")
    
    return stats


def main():
    print_header("🧪 TEST COMPLET DES WIDGETS DASHBOARD")
    
    # Récupérer l'utilisateur
    try:
        user = User.objects.filter(is_active=True).first()
        if not user:
            print("❌ ERREUR: Aucun utilisateur actif trouvé")
            sys.exit(1)
        
        print(f"\n✓ Utilisateur: {user.username}")
        if user.organization:
            print(f"✓ Organisation: {user.organization.name}")
        else:
            print("⚠️  ATTENTION: Utilisateur sans organisation")
        print()
    except Exception as e:
        print(f"❌ ERREUR lors de la récupération de l'utilisateur: {e}")
        sys.exit(1)
    
    # Vérifier l'état de la base de données
    db_stats = check_database_state(user)
    
    # Tester tous les widgets
    print_header("🧪 TEST DES WIDGETS")
    
    results = {
        'success': [],
        'warnings': [],
        'errors': []
    }
    
    for widget_code, widget_name, module in WIDGETS:
        success, data, issues = test_widget(user, widget_code, widget_name, module)
        
        if not success:
            results['errors'].append((widget_code, widget_name))
        elif issues:
            results['warnings'].append((widget_code, widget_name))
        else:
            results['success'].append((widget_code, widget_name))
    
    # Résumé final
    print_header("📊 RÉSUMÉ DES TESTS")
    
    print(f"\n✅ Widgets fonctionnels: {len(results['success'])}/{len(WIDGETS)}")
    for code, name in results['success']:
        print(f"   ✓ {name} ({code})")
    
    if results['warnings']:
        print(f"\n⚠️  Widgets avec avertissements: {len(results['warnings'])}")
        for code, name in results['warnings']:
            print(f"   ⚠️  {name} ({code})")
    
    if results['errors']:
        print(f"\n❌ Widgets en erreur: {len(results['errors'])}")
        for code, name in results['errors']:
            print(f"   ❌ {name} ({code})")
    
    # Recommandations
    print_header("💡 RECOMMANDATIONS")
    
    if db_stats['Factures'] == 0:
        print("\n⚠️  Vous n'avez aucune facture:")
        print("   → Créez au moins 2-3 factures avec différents statuts")
        print("   → Assurez-vous qu'au moins une est avec status='paid'")
    
    if db_stats['Lignes de factures'] == 0:
        print("\n⚠️  Vous n'avez aucune ligne de facture:")
        print("   → Ajoutez des produits à vos factures")
        print("   → C'est nécessaire pour 'top_selling_products'")
    
    if db_stats['Clients'] == 0:
        print("\n⚠️  Vous n'avez aucun client:")
        print("   → Créez au moins 3-5 clients")
        print("   → Associez-leur des factures")
    
    if db_stats['Produits avec cost_price'] == 0:
        print("\n⚠️  Aucun produit avec prix de revient:")
        print("   → Définissez un 'cost_price' > 0 pour vos produits")
        print("   → C'est nécessaire pour 'margin_analysis'")
    
    if db_stats['Bons de commande'] == 0:
        print("\n⚠️  Vous n'avez aucun bon de commande:")
        print("   → Créez des BCs pour tester les widgets de purchase_orders")
    
    print_separator()
    print("✅ Test terminé!")
    print_separator()


if __name__ == '__main__':
    main()

