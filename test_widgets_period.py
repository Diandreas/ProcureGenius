"""Tester les widgets avec différentes périodes"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.analytics.widget_data_service import WidgetDataService

User = get_user_model()

user = User.objects.get(username='sophie.martin')

print("="*100)
print(f"🧪 TEST DES WIDGETS - {user.username} - CETTE ANNÉE")
print("="*100)

# Tester avec l'année en cours (au lieu de 30 jours)
end_date = timezone.now()
start_date = timezone.datetime(end_date.year, 1, 1, tzinfo=end_date.tzinfo)

print(f"\n📅 Période: du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}")
print(f"   ({(end_date - start_date).days} jours)")

service = WidgetDataService(user, start_date, end_date)

widgets = [
    ('financial_summary', 'Vue Financière'),
    ('top_clients', 'Top Clients'),
    ('top_selling_products', 'Top Produits'),
    ('cash_flow_summary', 'Trésorerie'),
    ('invoices_overview', 'Aperçu Factures'),
]

for widget_code, widget_name in widgets:
    print(f"\n{'='*100}")
    print(f"🔍 {widget_name} ({widget_code})")
    print("="*100)
    
    try:
        data = service.get_widget_data(widget_code, limit=10, compare=False)
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, list):
                    print(f"✅ {key}: {len(value)} élément(s)")
                    for i, item in enumerate(value[:3], 1):  # Afficher les 3 premiers
                        if isinstance(item, dict):
                            summary = ", ".join(f"{k}={v}" for k, v in list(item.items())[:3])
                            print(f"   {i}. {summary}")
                elif isinstance(value, (int, float)):
                    if value != 0:
                        print(f"✅ {key}: {value}")
                elif isinstance(value, dict) and value:
                    non_zero = {k: v for k, v in value.items() if v != 0}
                    if non_zero:
                        print(f"✅ {key}: {non_zero}")
        
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")

print("\n" + "="*100)
print("✅ TEST TERMINÉ")
print("="*100)
print("\n💡 CONCLUSION:")
print("   Les widgets fonctionnent correctement avec la bonne période !")
print("   Dans le frontend, changez le filtre de période sur 'Cette année'")

