"""
Module configuration and access control for ProcureGenius
Defines available modules, profile types, and access helpers
"""

from django.utils.translation import gettext_lazy as _


# Module Constants
class Modules:
    """Available modules in the system"""
    DASHBOARD = 'dashboard'
    SUPPLIERS = 'suppliers'
    PURCHASE_ORDERS = 'purchase-orders'
    INVOICES = 'invoices'
    PRODUCTS = 'products'
    CLIENTS = 'clients'
    # E_SOURCING = 'e-sourcing'  # Removed
    # CONTRACTS = 'contracts'    # Removed
    ANALYTICS = 'analytics'
    
    # Healthcare modules
    PATIENTS = 'patients'
    CONSULTATIONS = 'consultations'
    LABORATORY = 'laboratory'
    PHARMACY = 'pharmacy'
    
    # Always available to admins (not controllable by profiles)
    AI_ASSISTANT = 'ai-assistant'
    INTEGRATIONS = 'integrations'
    DATA_MIGRATION = 'data-migration'


# Module Metadata
MODULE_METADATA = {
    Modules.DASHBOARD: {
        'name': _('Tableau de bord'),
        'description': _('Vue d\'ensemble et statistiques'),
        'icon': 'dashboard',
        'always_enabled': False,
    },
    Modules.SUPPLIERS: {
        'name': _('Fournisseurs'),
        'description': _('Gestion des fournisseurs'),
        'icon': 'business',
        'always_enabled': False,
    },
    Modules.PURCHASE_ORDERS: {
        'name': _('Bons de commande'),
        'description': _('Création et suivi des commandes'),
        'icon': 'shopping_cart',
        'always_enabled': False,
    },
    Modules.INVOICES: {
        'name': _('Factures'),
        'description': _('Gestion de la facturation'),
        'icon': 'receipt',
        'always_enabled': False,
    },
    Modules.PRODUCTS: {
        'name': _('Produits'),
        'description': _('Catalogue produits'),
        'icon': 'inventory',
        'always_enabled': False,
    },
    Modules.CLIENTS: {
        'name': _('Clients'),
        'description': _('Gestion des clients'),
        'icon': 'people',
        'always_enabled': False,
    },
    # Modules.E_SOURCING: {
    #     'name': _('E-Sourcing'),
    #     'description': _('Appels d\'offres et enchères'),
    #     'icon': 'gavel',
    #     'always_enabled': False,
    # },
    # Modules.CONTRACTS: {
    #     'name': _('Contrats'),
    #     'description': _('Gestion des contrats'),
    #     'icon': 'description',
    #     'always_enabled': False,
    # },
    Modules.ANALYTICS: {
        'name': _('Analytics'),
        'description': _('Rapports et analyses'),
        'icon': 'analytics',
        'always_enabled': False,
    },
    # Healthcare modules
    Modules.PATIENTS: {
        'name': _('Patients'),
        'description': _('Gestion des patients'),
        'icon': 'person',
        'always_enabled': False,
    },
    Modules.CONSULTATIONS: {
        'name': _('Consultations'),
        'description': _('Consultations médicales'),
        'icon': 'medical_services',
        'always_enabled': False,
    },
    Modules.LABORATORY: {
        'name': _('Laboratoire'),
        'description': _('Gestion LIMS'),
        'icon': 'science',
        'always_enabled': False,
    },
    Modules.PHARMACY: {
        'name': _('Pharmacie'),
        'description': _('Dispensation de médicaments'),
        'icon': 'local_pharmacy',
        'always_enabled': False,
    },
}

# Admin-only modules (always available)
ADMIN_MODULES = [
    Modules.AI_ASSISTANT,
    Modules.INTEGRATIONS,
    Modules.DATA_MIGRATION,
]


# Profile Type Definitions
class ProfileTypes:
    """Subscription profile types"""
    FREE = 'free'
    BILLING = 'billing'
    PROCUREMENT = 'procurement'
    PROFESSIONAL = 'professional'
    STRATEGIC = 'strategic'
    ENTERPRISE = 'enterprise'
    HEALTHCARE = 'healthcare'  # New healthcare profile


# Profile to Module Mapping
PROFILE_MODULES = {
    ProfileTypes.FREE: [
        Modules.DASHBOARD,
        Modules.PRODUCTS,
        Modules.CLIENTS,
    ],
    ProfileTypes.BILLING: [
        Modules.DASHBOARD,
        Modules.INVOICES,
        Modules.CLIENTS,
        Modules.PRODUCTS,
    ],
    ProfileTypes.PROCUREMENT: [
        Modules.DASHBOARD,
        Modules.SUPPLIERS,
        Modules.PURCHASE_ORDERS,
        Modules.PRODUCTS,
    ],
    ProfileTypes.PROFESSIONAL: [
        Modules.DASHBOARD,
        Modules.SUPPLIERS,
        Modules.PURCHASE_ORDERS,
        Modules.INVOICES,
        Modules.PRODUCTS,
        Modules.CLIENTS,
    ],
    ProfileTypes.STRATEGIC: [
        Modules.DASHBOARD,
        Modules.SUPPLIERS,
        Modules.PURCHASE_ORDERS,
        Modules.PRODUCTS,
        # Modules.E_SOURCING,
        # Modules.CONTRACTS,
        Modules.ANALYTICS,
    ],
    ProfileTypes.ENTERPRISE: [
        Modules.DASHBOARD,
        Modules.SUPPLIERS,
        Modules.PURCHASE_ORDERS,
        Modules.INVOICES,
        Modules.PRODUCTS,
        Modules.CLIENTS,
        # Modules.E_SOURCING,
        # Modules.CONTRACTS,
        Modules.ANALYTICS,
    ],
    ProfileTypes.HEALTHCARE: [
        Modules.DASHBOARD,
        Modules.PATIENTS,
        Modules.CLIENTS,  # Nécessaire pour la facturation des patients
        Modules.CONSULTATIONS,
        Modules.LABORATORY,
        Modules.PHARMACY,
        Modules.PRODUCTS,
        Modules.INVOICES,
        Modules.ANALYTICS,
    ],
}

# Profile Metadata
PROFILE_METADATA = {
    ProfileTypes.FREE: {
        'name': _('Gratuit'),
        'description': _('Pour démarrer - Gestion basique'),
        'features': [
            _('Catalogue produits'),
            _('Gestion clients'),
            _('Tableau de bord'),
        ],
    },
    ProfileTypes.BILLING: {
        'name': _('Facturation'),
        'description': _('Focalisé sur la facturation'),
        'features': [
            _('Gestion des factures'),
            _('Clients et produits'),
            _('Rapports financiers'),
        ],
    },
    ProfileTypes.PROCUREMENT: {
        'name': _('Achats'),
        'description': _('Gestion des achats'),
        'features': [
            _('Fournisseurs'),
            _('Bons de commande'),
            _('Catalogue produits'),
        ],
    },
    ProfileTypes.PROFESSIONAL: {
        'name': _('Professionnel'),
        'description': _('Opérations complètes'),
        'features': [
            _('Tous les modules opérationnels'),
            _('Achats et facturation'),
            _('Gestion complète'),
        ],
    },
    ProfileTypes.STRATEGIC: {
        'name': _('Stratégique'),
        'description': _('Sourcing stratégique'),
        'features': [
            # _('E-Sourcing avancé'),
            # _('Gestion des contrats'),
            _('Analytics et rapports'),
        ],
    },
    ProfileTypes.ENTERPRISE: {
        'name': _('Entreprise'),
        'description': _('Plateforme complète'),
        'features': [
            _('Tous les modules'),
            _('Fonctionnalités avancées'),
            _('Support prioritaire'),
        ],
    },
    ProfileTypes.HEALTHCARE: {
        'name': _('Santé'),
        'description': _('Solution LIMS + HMS + Pharmacie'),
        'features': [
            _('Gestion des patients'),
            _('Laboratoire (LIMS)'),
            _('Pharmacie'),
            _('Consultations médicales'),
            _('Facturation patients'),
        ],
    },
}


# Module Dependencies (if module A requires module B to be enabled)
MODULE_DEPENDENCIES = {
    Modules.PURCHASE_ORDERS: [Modules.SUPPLIERS],
    # Modules.E_SOURCING: [Modules.SUPPLIERS],
    # Modules.CONTRACTS: [Modules.SUPPLIERS],
}


def get_modules_for_profile(profile_type):
    """Get list of modules available for a profile type"""
    return PROFILE_MODULES.get(profile_type, [Modules.DASHBOARD])


def get_all_controllable_modules():
    """Get all modules that can be controlled by profiles"""
    return [module for module in MODULE_METADATA.keys()]


def get_module_metadata(module_code):
    """Get metadata for a specific module"""
    return MODULE_METADATA.get(module_code, {})


def validate_module_dependencies(enabled_modules):
    """
    Validate that all dependencies are met for enabled modules
    Returns tuple (is_valid, missing_dependencies)
    """
    missing = []
    for module in enabled_modules:
        if module in MODULE_DEPENDENCIES:
            required = MODULE_DEPENDENCIES[module]
            for req in required:
                if req not in enabled_modules:
                    missing.append({
                        'module': module,
                        'requires': req,
                    })
    
    return len(missing) == 0, missing


def get_user_accessible_modules(user):
    """
    Get modules accessible to a user based on:
    1. Organization's enabled modules
    2. User's individual module access (from permissions)
    3. User's role
    """
    if not user or not user.is_authenticated:
        return []
    
    # Superusers get everything
    if user.is_superuser:
        return get_all_controllable_modules() + ADMIN_MODULES
    
    # Start with organization's modules
    if user.organization:
        org_modules = user.organization.enabled_modules or []
    else:
        org_modules = [Modules.DASHBOARD]
    
    # Filter by user's individual permissions
    try:
        user_permissions = user.permissions
        user_modules = user_permissions.module_access or []

        # Si l'utilisateur n'a pas de restrictions individuelles (liste vide),
        # utiliser tous les modules de l'organisation
        if not user_modules:
            accessible = org_modules
        else:
            # Sinon, faire l'intersection (restriction)
            accessible = list(set(org_modules) & set(user_modules))
    except:
        # If no permissions set, use org modules
        accessible = org_modules
    
    # Admins get admin modules
    if user.role == 'admin':
        accessible.extend(ADMIN_MODULES)
    
    # Always include dashboard
    # if Modules.DASHBOARD not in accessible:
    #     accessible.append(Modules.DASHBOARD)
    
    return list(set(accessible))


def user_has_module_access(user, module_code):
    """Check if user has access to a specific module"""
    accessible_modules = get_user_accessible_modules(user)
    return module_code in accessible_modules


