"""
Vues pour le système d'onboarding et de vérification des actions guidées
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q
from apps.core.modules import get_user_accessible_modules, Modules
from apps.core.models import OrganizationSettings


class OnboardingActionsCheckView(APIView):
    """
    Vérifie l'état de complétion des actions guidées pour l'onboarding
    
    GET /api/v1/onboarding/check-actions/
    
    Retourne un objet avec l'état de chaque action possible selon les modules activés
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        organization = getattr(user, 'organization', None)

        if not organization:
            return Response(
                {'error': 'No organization assigned to user'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Récupérer les modules accessibles
        user_modules = get_user_accessible_modules(user)
        
        # Initialiser le résultat
        actions_status = {}
        
        # Action générale : Compléter le profil entreprise
        try:
            org_settings = OrganizationSettings.objects.filter(organization=organization).first()
            has_logo = org_settings and org_settings.company_logo and org_settings.company_logo.name
            has_company_name = org_settings and org_settings.company_name and org_settings.company_name.strip()
            
            actions_status['complete_profile'] = {
                'completed': bool(has_logo and has_company_name),
                'value': {
                    'has_logo': bool(has_logo),
                    'has_company_name': bool(has_company_name),
                },
                'message': 'Profil entreprise complété' if (has_logo and has_company_name) else 
                          ('Logo manquant' if not has_logo else 'Nom entreprise manquant'),
                'check_type': 'profile_complete'
            }
        except Exception as e:
            actions_status['complete_profile'] = {
                'completed': False,
                'value': None,
                'message': f'Erreur lors de la vérification: {str(e)}',
                'check_type': 'profile_complete'
            }

        # Actions selon les modules activés
        if Modules.SUPPLIERS in user_modules:
            try:
                from apps.suppliers.models import Supplier
                suppliers_count = Supplier.objects.filter(organization=organization).count()
                
                actions_status['add_first_supplier'] = {
                    'completed': suppliers_count >= 1,
                    'value': suppliers_count,
                    'message': f'{suppliers_count} fournisseur{"s" if suppliers_count > 1 else ""} créé{"s" if suppliers_count > 1 else ""}' if suppliers_count > 0 else 'Aucun fournisseur créé',
                    'check_type': 'count'
                }
            except Exception as e:
                actions_status['add_first_supplier'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count'
                }

        if Modules.CLIENTS in user_modules:
            try:
                from apps.accounts.models import Client
                clients_count = Client.objects.filter(organization=organization).count()
                
                actions_status['add_first_client'] = {
                    'completed': clients_count >= 1,
                    'value': clients_count,
                    'message': f'{clients_count} client{"s" if clients_count > 1 else ""} créé{"s" if clients_count > 1 else ""}' if clients_count > 0 else 'Aucun client créé',
                    'check_type': 'count'
                }
            except Exception as e:
                actions_status['add_first_client'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count'
                }

        if Modules.PURCHASE_ORDERS in user_modules:
            try:
                from apps.purchase_orders.models import PurchaseOrder
                po_count = PurchaseOrder.objects.filter(created_by__organization=organization).count()
                
                # Vérifier si un fournisseur existe (dépendance)
                has_supplier = False
                if Modules.SUPPLIERS in user_modules:
                    from apps.suppliers.models import Supplier
                    has_supplier = Supplier.objects.filter(organization=organization).exists()
                
                actions_status['create_first_po'] = {
                    'completed': po_count >= 1,
                    'value': po_count,
                    'message': f'{po_count} bon{"s" if po_count > 1 else ""} de commande créé{"s" if po_count > 1 else ""}' if po_count > 0 else 'Aucun bon de commande créé',
                    'check_type': 'count',
                    'blocked': not has_supplier and po_count == 0,
                    'blocked_by': ['add_first_supplier'] if not has_supplier else []
                }
            except Exception as e:
                actions_status['create_first_po'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count',
                    'blocked': False,
                    'blocked_by': []
                }

        if Modules.INVOICES in user_modules:
            try:
                from apps.invoicing.models import Invoice
                invoices_count = Invoice.objects.filter(created_by__organization=organization).count()
                
                actions_status['create_first_invoice'] = {
                    'completed': invoices_count >= 1,
                    'value': invoices_count,
                    'message': f'{invoices_count} facture{"s" if invoices_count > 1 else ""} créée{"s" if invoices_count > 1 else ""}' if invoices_count > 0 else 'Aucune facture créée',
                    'check_type': 'count'
                }
            except Exception as e:
                actions_status['create_first_invoice'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count'
                }

        if Modules.PRODUCTS in user_modules:
            try:
                from apps.invoicing.models import Product
                products_count = Product.objects.filter(organization=organization).count()
                
                actions_status['add_first_product'] = {
                    'completed': products_count >= 1,
                    'value': products_count,
                    'message': f'{products_count} produit{"s" if products_count > 1 else ""} créé{"s" if products_count > 1 else ""}' if products_count > 0 else 'Aucun produit créé',
                    'check_type': 'count'
                }
            except Exception as e:
                actions_status['add_first_product'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count'
                }

        # Vérifier e-sourcing (peut être 'e-sourcing' ou Modules.E_SOURCING qui vaut 'e-sourcing')
        has_e_sourcing = (
            'e-sourcing' in user_modules or 
            Modules.E_SOURCING in user_modules or
            any(m.replace('-', '_') == 'e_sourcing' for m in user_modules if isinstance(m, str))
        )
        
        if has_e_sourcing:
            try:
                from apps.e_sourcing.models import SourcingEvent
                events_count = SourcingEvent.objects.filter(created_by__organization=organization).count()
                
                actions_status['create_first_rfq'] = {
                    'completed': events_count >= 1,
                    'value': events_count,
                    'message': f'{events_count} appel{"s" if events_count > 1 else ""} d\'offres créé{"s" if events_count > 1 else ""}' if events_count > 0 else 'Aucun appel d\'offres créé',
                    'check_type': 'count'
                }
            except Exception as e:
                actions_status['create_first_rfq'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count'
                }

        if Modules.CONTRACTS in user_modules:
            try:
                from apps.contracts.models import Contract
                contracts_count = Contract.objects.filter(created_by__organization=organization).count()
                
                actions_status['create_first_contract'] = {
                    'completed': contracts_count >= 1,
                    'value': contracts_count,
                    'message': f'{contracts_count} contrat{"s" if contracts_count > 1 else ""} créé{"s" if contracts_count > 1 else ""}' if contracts_count > 0 else 'Aucun contrat créé',
                    'check_type': 'count'
                }
            except Exception as e:
                actions_status['create_first_contract'] = {
                    'completed': False,
                    'value': 0,
                    'message': f'Erreur: {str(e)}',
                    'check_type': 'count'
                }

        # Calculer le résumé
        total_actions = len(actions_status)
        completed_actions = sum(1 for action in actions_status.values() if action.get('completed', False))
        remaining_actions = total_actions - completed_actions
        progress_percent = (completed_actions / total_actions * 100) if total_actions > 0 else 0

        return Response({
            'actions': actions_status,
            'summary': {
                'total_actions': total_actions,
                'completed_actions': completed_actions,
                'remaining_actions': remaining_actions,
                'progress_percent': round(progress_percent, 1)
            },
            'enabled_modules': user_modules
        })

