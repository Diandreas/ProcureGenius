"""
Registry of all available widgets
Fixed definitions - no database storage needed
"""

WIDGETS_REGISTRY = {
    # ========== GLOBAL WIDGETS ==========
    'financial_summary': {
        'code': 'financial_summary',
        'name': 'Vue Financière Globale',
        'description': 'Résumé des revenus, dépenses, profit net et marge',
        'module': 'global',
        'type': 'stats',
        'default_size': {'w': 3, 'h': 2},
        'icon': 'DollarSign',
        'component': 'FinancialSummaryWidget'
    },
    'recent_activity': {
        'code': 'recent_activity',
        'name': 'Activité Récente',
        'description': 'Feed des dernières activités',
        'module': 'global',
        'type': 'timeline',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'Activity',
        'component': 'RecentActivityWidget'
    },
    'alerts_notifications': {
        'code': 'alerts_notifications',
        'name': 'Alertes et Notifications',
        'description': 'Centre de notifications',
        'module': 'global',
        'type': 'alert',
        'default_size': {'w': 1, 'h': 2},
        'icon': 'Bell',
        'component': 'AlertsWidget'
    },
    'global_performance': {
        'code': 'global_performance',
        'name': 'Performance Globale',
        'description': 'KPIs globaux',
        'module': 'global',
        'type': 'stats',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'TrendingUp',
        'component': 'GlobalPerformanceWidget'
    },

    # ========== PRODUCTS WIDGETS ==========
    'products_overview': {
        'code': 'products_overview',
        'name': 'Aperçu Stock',
        'description': 'Statistiques générales des produits',
        'module': 'products',
        'type': 'stats',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'Package',
        'component': 'ProductsOverviewWidget'
    },
    'top_selling_products': {
        'code': 'top_selling_products',
        'name': 'Produits les Plus Vendus',
        'description': 'Top 5 des produits',
        'module': 'products',
        'type': 'table',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'TrendingUp',
        'component': 'TopSellingProductsWidget'
    },
    'stock_alerts': {
        'code': 'stock_alerts',
        'name': 'Alertes Stock',
        'description': 'Stock bas et ruptures',
        'module': 'products',
        'type': 'alert',
        'default_size': {'w': 1, 'h': 2},
        'icon': 'AlertTriangle',
        'component': 'StockAlertsWidget'
    },
    'margin_analysis': {
        'code': 'margin_analysis',
        'name': 'Analyse Marges',
        'description': 'Marges par catégorie',
        'module': 'products',
        'type': 'chart',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'BarChart3',
        'component': 'MarginAnalysisWidget'
    },
    'stock_movements': {
        'code': 'stock_movements',
        'name': 'Mouvements de Stock',
        'description': 'Derniers mouvements',
        'module': 'products',
        'type': 'timeline',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'ArrowRightLeft',
        'component': 'StockMovementsWidget'
    },

    # ========== CLIENTS WIDGETS ==========
    'clients_overview': {
        'code': 'clients_overview',
        'name': 'Aperçu Clients',
        'description': 'Stats clients',
        'module': 'clients',
        'type': 'stats',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'Users',
        'component': 'ClientsOverviewWidget'
    },
    'top_clients': {
        'code': 'top_clients',
        'name': 'Top Clients',
        'description': 'Meilleurs clients par CA',
        'module': 'clients',
        'type': 'table',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'Award',
        'component': 'TopClientsWidget'
    },
    'clients_at_risk': {
        'code': 'clients_at_risk',
        'name': 'Clients à Risque',
        'description': 'Clients avec retards',
        'module': 'clients',
        'type': 'alert',
        'default_size': {'w': 1, 'h': 2},
        'icon': 'AlertCircle',
        'component': 'ClientsAtRiskWidget'
    },
    'client_acquisition': {
        'code': 'client_acquisition',
        'name': 'Acquisition Clients',
        'description': 'Nouveaux clients',
        'module': 'clients',
        'type': 'chart',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'UserPlus',
        'component': 'ClientAcquisitionWidget'
    },
    'client_segmentation': {
        'code': 'client_segmentation',
        'name': 'Segmentation Clients',
        'description': 'Répartition clients',
        'module': 'clients',
        'type': 'chart',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'PieChart',
        'component': 'ClientSegmentationWidget'
    },

    # ========== INVOICES WIDGETS ==========
    'invoices_overview': {
        'code': 'invoices_overview',
        'name': 'Aperçu Factures',
        'description': 'Stats factures',
        'module': 'invoices',
        'type': 'stats',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'FileText',
        'component': 'InvoicesOverviewWidget'
    },
    'invoices_status': {
        'code': 'invoices_status',
        'name': 'Statut Factures',
        'description': 'Répartition par statut',
        'module': 'invoices',
        'type': 'chart',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'PieChart',
        'component': 'InvoicesStatusWidget'
    },
    'revenue_chart': {
        'code': 'revenue_chart',
        'name': 'Revenus',
        'description': 'Évolution des revenus',
        'module': 'invoices',
        'type': 'chart',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'TrendingUp',
        'component': 'RevenueChartWidget'
    },
    'overdue_invoices': {
        'code': 'overdue_invoices',
        'name': 'Factures en Retard',
        'description': 'Factures impayées',
        'module': 'invoices',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'AlertOctagon',
        'component': 'OverdueInvoicesWidget'
    },
    'payment_performance': {
        'code': 'payment_performance',
        'name': 'Performance Paiements',
        'description': 'Métriques de paiement',
        'module': 'invoices',
        'type': 'stats',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'Clock',
        'component': 'PaymentPerformanceWidget'
    },
    'recent_invoices': {
        'code': 'recent_invoices',
        'name': 'Factures Récentes',
        'description': 'Dernières factures',
        'module': 'invoices',
        'type': 'list',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'List',
        'component': 'RecentInvoicesWidget'
    },

    # ========== PURCHASE ORDERS WIDGETS ==========
    'po_overview': {
        'code': 'po_overview',
        'name': 'Aperçu Bons de Commande',
        'description': 'Stats BCs',
        'module': 'purchase_orders',
        'type': 'stats',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'ShoppingCart',
        'component': 'POOverviewWidget'
    },
    'po_status': {
        'code': 'po_status',
        'name': 'Statut Bons de Commande',
        'description': 'Répartition par statut',
        'module': 'purchase_orders',
        'type': 'chart',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'PieChart',
        'component': 'POStatusWidget'
    },
    'expenses_chart': {
        'code': 'expenses_chart',
        'name': 'Dépenses Achats',
        'description': 'Évolution dépenses',
        'module': 'purchase_orders',
        'type': 'chart',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'TrendingDown',
        'component': 'ExpensesChartWidget'
    },
    'overdue_po': {
        'code': 'overdue_po',
        'name': 'BCs en Retard',
        'description': 'BCs en retard de livraison',
        'module': 'purchase_orders',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'AlertTriangle',
        'component': 'OverduePOWidget'
    },
    'supplier_performance': {
        'code': 'supplier_performance',
        'name': 'Performance Fournisseurs',
        'description': 'Top fournisseurs',
        'module': 'purchase_orders',
        'type': 'table',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'Award',
        'component': 'SupplierPerformanceWidget'
    },
    'pending_approvals': {
        'code': 'pending_approvals',
        'name': 'Approbations en Attente',
        'description': 'BCs à approuver',
        'module': 'purchase_orders',
        'type': 'list',
        'default_size': {'w': 1, 'h': 2},
        'icon': 'CheckSquare',
        'component': 'PendingApprovalsWidget'
    },
    'budget_tracking': {
        'code': 'budget_tracking',
        'name': 'Suivi Budget',
        'description': 'Budget vs dépenses',
        'module': 'purchase_orders',
        'type': 'gauge',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'Target',
        'component': 'BudgetTrackingWidget'
    },

    # ========== AI WIDGETS ==========
    'ai_usage': {
        'code': 'ai_usage',
        'name': 'Utilisation IA',
        'description': 'Stats IA',
        'module': 'ai',
        'type': 'stats',
        'default_size': {'w': 1, 'h': 1},
        'icon': 'Bot',
        'component': 'AIUsageWidget'
    },
    'ai_documents': {
        'code': 'ai_documents',
        'name': 'Documents Traités',
        'description': 'Documents scannés',
        'module': 'ai',
        'type': 'list',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'FileSearch',
        'component': 'AIDocumentsWidget'
    },
    'ai_last_conversation': {
        'code': 'ai_last_conversation',
        'name': 'Dernière Conversation',
        'description': 'Actions récentes IA',
        'module': 'ai',
        'type': 'timeline',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'MessageSquare',
        'component': 'AILastConversationWidget'
    },
}


def get_all_widgets():
    """Return all widgets definitions"""
    return WIDGETS_REGISTRY


def get_widget(code):
    """Get a specific widget by code"""
    return WIDGETS_REGISTRY.get(code)


def get_widgets_by_module(module):
    """Get all widgets for a specific module"""
    return {k: v for k, v in WIDGETS_REGISTRY.items() if v['module'] == module}


def get_modules():
    """Get list of all modules"""
    modules = set(w['module'] for w in WIDGETS_REGISTRY.values())
    return list(modules)


# Default layout for new users
DEFAULT_LAYOUT = [
    {'i': 'financial_summary', 'x': 0, 'y': 0, 'w': 3, 'h': 2},
    {'i': 'alerts_notifications', 'x': 3, 'y': 0, 'w': 1, 'h': 2},
    {'i': 'revenue_chart', 'x': 0, 'y': 2, 'w': 2, 'h': 1},
    {'i': 'expenses_chart', 'x': 2, 'y': 2, 'w': 2, 'h': 1},
    {'i': 'invoices_overview', 'x': 0, 'y': 3, 'w': 1, 'h': 1},
    {'i': 'po_overview', 'x': 1, 'y': 3, 'w': 1, 'h': 1},
    {'i': 'products_overview', 'x': 2, 'y': 3, 'w': 1, 'h': 1},
    {'i': 'clients_overview', 'x': 3, 'y': 3, 'w': 1, 'h': 1},
]
