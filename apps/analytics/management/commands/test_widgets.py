"""
Management command to test all dashboard widgets
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.analytics.widget_data_service import WidgetDataService
import json

User = get_user_model()

# Liste des 16 widgets actifs
WIDGETS = [
    # Global (3)
    'financial_summary',
    'alerts_notifications',
    'cash_flow_summary',
    # Clients (3)
    'top_clients',
    'clients_at_risk',
    'pareto_clients',
    # Products (3)
    'top_selling_products',
    'stock_alerts',
    'margin_analysis',
    # Invoices (2)
    'invoices_overview',
    'overdue_invoices',
    # Purchase Orders (4)
    'po_overview',
    'overdue_po',
    'supplier_performance',
    'pending_approvals',
    # AI (1)
    'ai_suggestions',
]


class Command(BaseCommand):
    help = 'Test tous les widgets du dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--widget',
            type=str,
            help='Tester un widget spécifique',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Afficher les données détaillées',
        )

    def handle(self, *args, **options):
        widget_code = options.get('widget')
        verbose = options.get('verbose')

        self.stdout.write("=" * 80)
        self.stdout.write(self.style.SUCCESS("TEST DES WIDGETS DU DASHBOARD"))
        self.stdout.write("=" * 80)

        # Récupérer un utilisateur de test
        try:
            user = User.objects.filter(is_active=True).first()
            if not user:
                self.stdout.write(self.style.ERROR("❌ Aucun utilisateur actif trouvé"))
                return

            self.stdout.write(f"✓ Utilisateur: {user.username}")
            if user.organization:
                self.stdout.write(f"✓ Organisation: {user.organization.name}")
            self.stdout.write("")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur: {e}"))
            return

        # Test d'un widget spécifique ou de tous
        if widget_code:
            self.test_widget(user, widget_code, verbose)
        else:
            self.test_all_widgets(user, verbose)

    def test_widget(self, user, widget_code, verbose):
        """Test un widget spécifique"""
        self.stdout.write(f"\n🔍 TEST: {widget_code}")
        self.stdout.write("-" * 80)

        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
            
            service = WidgetDataService(user, start_date, end_date)
            data = service.get_widget_data(widget_code, limit=5, compare=False)

            self.stdout.write(self.style.SUCCESS(f"✓ Widget OK"))
            
            if verbose:
                self.stdout.write("\n📄 Données retournées:")
                self.stdout.write(json.dumps(data, indent=2, default=str))
            else:
                # Afficher un résumé
                if isinstance(data, dict):
                    keys = list(data.keys())
                    self.stdout.write(f"   Clés: {', '.join(keys)}")
                    
                    # Compter les éléments dans les listes
                    for key, value in data.items():
                        if isinstance(value, list):
                            self.stdout.write(f"   - {key}: {len(value)} élément(s)")
                        elif isinstance(value, (int, float)):
                            self.stdout.write(f"   - {key}: {value}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur: {str(e)}"))
            if verbose:
                import traceback
                self.stdout.write(traceback.format_exc())

    def test_all_widgets(self, user, verbose):
        """Test tous les widgets"""
        self.stdout.write(f"\n📅 PÉRIODE: last_30_days")
        self.stdout.write("-" * 80)

        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        self.stdout.write(f"Du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}\n")

        service = WidgetDataService(user, start_date, end_date)

        success_count = 0
        error_count = 0

        for widget_code in WIDGETS:
            try:
                data = service.get_widget_data(widget_code, limit=5, compare=False)
                
                # Résumé
                summary = []
                if isinstance(data, dict):
                    for key, value in data.items():
                        if isinstance(value, list):
                            summary.append(f"{key}:{len(value)}")
                        elif isinstance(value, (int, float)):
                            summary.append(f"{key}:{value}")
                
                self.stdout.write(self.style.SUCCESS(f"✓ {widget_code:25} {' '.join(summary[:3])}"))
                success_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ {widget_code:25} {str(e)[:50]}"))
                error_count += 1

        self.stdout.write("\n" + "-" * 80)
        self.stdout.write(f"📊 Résultats: {success_count}/{len(WIDGETS)} widgets OK")
        if error_count > 0:
            self.stdout.write(self.style.WARNING(f"⚠️  Erreurs: {error_count} widgets en erreur"))
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("TEST TERMINÉ"))
        self.stdout.write("=" * 80)

