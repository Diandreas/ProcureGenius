"""
Registry of all available widgets - 15 widgets essentiels
Optimisé pour un dashboard focalisé et actionnable
"""

WIDGETS_REGISTRY = {
    # ========== GLOBAL WIDGETS (3) ==========
    'financial_summary': {
        'code': 'financial_summary',
        'name': 'Vue Financière Globale',
        'description': 'Résumé des revenus, dépenses, profit net et marge',
        'module': 'global',
        'type': 'stats',
        'default_size': {'w': 4, 'h': 2},
        'icon': 'DollarSign',
        'component': 'FinancialSummaryWidget'
    },
    'alerts_notifications': {
        'code': 'alerts_notifications',
        'name': 'Alertes et Notifications',
        'description': 'Centre des alertes critiques',
        'module': 'global',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'Bell',
        'component': 'AlertsWidget'
    },
    'cash_flow_summary': {
        'code': 'cash_flow_summary',
        'name': 'Trésorerie',
        'description': 'Balance: montant à recevoir vs à payer',
        'module': 'global',
        'type': 'stats',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'Scale',
        'component': 'CashFlowSummaryWidget'
    },

    # ========== CLIENTS WIDGETS (3) ==========
    'top_clients': {
        'code': 'top_clients',
        'name': 'Top Clients',
        'description': 'Meilleurs clients par chiffre d\'affaires',
        'module': 'clients',
        'type': 'table',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'Award',
        'component': 'TopClientsWidget'
    },
    'clients_at_risk': {
        'code': 'clients_at_risk',
        'name': 'Clients à Risque',
        'description': 'Clients avec factures en retard de paiement',
        'module': 'clients',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'AlertCircle',
        'component': 'ClientsAtRiskWidget'
    },
    'pareto_clients': {
        'code': 'pareto_clients',
        'name': 'Analyse Pareto 80/20',
        'description': 'Concentration du CA: X% clients = Y% revenus',
        'module': 'clients',
        'type': 'chart',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'TrendingUp',
        'component': 'ParetoClientsWidget'
    },

    # ========== PRODUCTS WIDGETS (3) ==========
    'top_selling_products': {
        'code': 'top_selling_products',
        'name': 'Produits les Plus Vendus',
        'description': 'Top 5 des produits par volume de ventes',
        'module': 'products',
        'type': 'table',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'TrendingUp',
        'component': 'TopSellingProductsWidget'
    },
    'stock_alerts': {
        'code': 'stock_alerts',
        'name': 'Alertes Stock',
        'description': 'Produits en rupture ou stock bas',
        'module': 'products',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'AlertTriangle',
        'component': 'StockAlertsWidget'
    },
    'margin_analysis': {
        'code': 'margin_analysis',
        'name': 'Analyse Marges',
        'description': 'Marges bénéficiaires par catégorie de produit',
        'module': 'products',
        'type': 'chart',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'BarChart3',
        'component': 'MarginAnalysisWidget'
    },

    # ========== INVOICES WIDGETS (2) ==========
    'invoices_overview': {
        'code': 'invoices_overview',
        'name': 'Vue Factures',
        'description': 'Répartition complète des factures par statut avec montants',
        'module': 'invoices',
        'type': 'stats',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'FileText',
        'component': 'InvoicesOverviewWidget'
    },
    'overdue_invoices': {
        'code': 'overdue_invoices',
        'name': 'Factures en Retard',
        'description': 'Liste détaillée des factures impayées à recouvrer',
        'module': 'invoices',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'AlertOctagon',
        'component': 'OverdueInvoicesWidget'
    },

    # ========== PURCHASE ORDERS WIDGETS (4) ==========
    'po_overview': {
        'code': 'po_overview',
        'name': 'Vue Bons de Commande',
        'description': 'Répartition complète des BCs par statut avec montants',
        'module': 'purchase_orders',
        'type': 'stats',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'ShoppingCart',
        'component': 'POOverviewWidget'
    },
    'overdue_po': {
        'code': 'overdue_po',
        'name': 'BCs en Retard',
        'description': 'Bons de commande en retard de livraison',
        'module': 'purchase_orders',
        'type': 'alert',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'AlertTriangle',
        'component': 'OverduePOWidget'
    },
    'supplier_performance': {
        'code': 'supplier_performance',
        'name': 'Top Fournisseurs',
        'description': 'Classement des fournisseurs par volume d\'achats',
        'module': 'purchase_orders',
        'type': 'table',
        'default_size': {'w': 2, 'h': 2},
        'icon': 'Award',
        'component': 'SupplierPerformanceWidget'
    },
    'pending_approvals': {
        'code': 'pending_approvals',
        'name': 'Approbations en Attente',
        'description': 'Bons de commande nécessitant une approbation',
        'module': 'purchase_orders',
        'type': 'list',
        'default_size': {'w': 2, 'h': 1},
        'icon': 'CheckSquare',
        'component': 'PendingApprovalsWidget'
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


# Default layout for new users - 6 widgets essentiels
DEFAULT_LAYOUT = [
    {'i': 'financial_summary', 'x': 0, 'y': 0, 'w': 4, 'h': 2},
    {'i': 'alerts_notifications', 'x': 0, 'y': 2, 'w': 2, 'h': 2},
    {'i': 'cash_flow_summary', 'x': 2, 'y': 2, 'w': 2, 'h': 2},
    {'i': 'invoices_overview', 'x': 0, 'y': 4, 'w': 2, 'h': 2},
    {'i': 'po_overview', 'x': 2, 'y': 4, 'w': 2, 'h': 2},
    {'i': 'top_clients', 'x': 0, 'y': 6, 'w': 2, 'h': 2},
]
