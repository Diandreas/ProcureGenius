/**
 * Module configuration and constants
 * Keep in sync with backend apps/core/modules.py
 */

export const Modules = {
    DASHBOARD: 'dashboard',
    SUPPLIERS: 'suppliers',
    PURCHASE_ORDERS: 'purchase-orders',
    INVOICES: 'invoices',
    PRODUCTS: 'products',
    CLIENTS: 'clients',
    E_SOURCING: 'e-sourcing',
    CONTRACTS: 'contracts',
    ANALYTICS: 'analytics',

    // Always available to admins
    AI_ASSISTANT: 'ai-assistant',
    INTEGRATIONS: 'integrations',
    DATA_MIGRATION: 'data-migration',
};

// Chemins des icônes personnalisées PNG (taille recommandée: 24px pour menu, 20px pour petits boutons)
export const ModuleIconPaths = {
    [Modules.DASHBOARD]: '/icon/dashboard.png',
    [Modules.SUPPLIERS]: '/icon/supplier.png',
    [Modules.PURCHASE_ORDERS]: '/icon/purchase-order.png',
    [Modules.INVOICES]: '/icon/bill.png',
    [Modules.PRODUCTS]: '/icon/product.png',
    [Modules.CLIENTS]: '/icon/user.png',
    [Modules.E_SOURCING]: '/icon/market.png',
    [Modules.CONTRACTS]: '/icon/contract.png',
    [Modules.ANALYTICS]: '/icon/analysis.png',
    [Modules.AI_ASSISTANT]: '/icon/ai-assistant.png',
    [Modules.INTEGRATIONS]: '/icon/integration.png',
    [Modules.DATA_MIGRATION]: '/icon/migration.png',
    // Autres icônes disponibles:
    // - support.png (pour aide/support)
    // - logout.png (pour déconnexion)
    // - setting.png (pour paramètres)
};

// Icônes Material-UI (pour les modules sans icônes PNG personnalisées)
export const ModuleIcons = {
    [Modules.DASHBOARD]: 'DashboardIcon',
    [Modules.SUPPLIERS]: 'BusinessIcon',
    [Modules.PURCHASE_ORDERS]: 'ShoppingCartIcon',
    [Modules.INVOICES]: 'ReceiptIcon',
    [Modules.PRODUCTS]: 'InventoryIcon',
    [Modules.CLIENTS]: 'PeopleIcon',
    [Modules.E_SOURCING]: 'GavelIcon',
    [Modules.CONTRACTS]: 'DescriptionIcon',
    [Modules.ANALYTICS]: 'AnalyticsIcon',
    [Modules.AI_ASSISTANT]: 'SmartToyIcon',
    [Modules.INTEGRATIONS]: 'IntegrationInstructionsIcon',
    [Modules.DATA_MIGRATION]: 'CloudUploadIcon',
};

export const ModuleRoutes = {
    [Modules.DASHBOARD]: '/dashboard',
    [Modules.SUPPLIERS]: '/suppliers',
    [Modules.PURCHASE_ORDERS]: '/purchase-orders',
    [Modules.INVOICES]: '/invoices',
    [Modules.PRODUCTS]: '/products',
    [Modules.CLIENTS]: '/clients',
    [Modules.E_SOURCING]: '/e-sourcing/events',
    [Modules.CONTRACTS]: '/contracts',
    [Modules.ANALYTICS]: '/analytics',
    [Modules.AI_ASSISTANT]: '/ai-chat',
    [Modules.DATA_MIGRATION]: '/migration/jobs',
};

export const ProfileTypes = {
    FREE: 'free',
    BILLING: 'billing',
    PROCUREMENT: 'procurement',
    PROFESSIONAL: 'professional',
    STRATEGIC: 'strategic',
    ENTERPRISE: 'enterprise',
};

/**
 * Check if a route requires a specific module
 * @param {string} path - The route path
 * @returns {string|null} - Required module code or null
 */
export const getRequiredModuleForRoute = (path) => {
    if (path.startsWith('/suppliers')) return Modules.SUPPLIERS;
    if (path.startsWith('/purchase-orders')) return Modules.PURCHASE_ORDERS;
    if (path.startsWith('/invoices')) return Modules.INVOICES;
    if (path.startsWith('/products')) return Modules.PRODUCTS;
    if (path.startsWith('/clients')) return Modules.CLIENTS;
    if (path.startsWith('/e-sourcing')) return Modules.E_SOURCING;
    if (path.startsWith('/contracts')) return Modules.CONTRACTS;
    if (path.startsWith('/analytics')) return Modules.ANALYTICS;
    if (path.startsWith('/ai-chat')) return Modules.AI_ASSISTANT;
    if (path.startsWith('/migration')) return Modules.DATA_MIGRATION;
    return null;
};

/**
 * Filter menu items based on available modules
 * @param {Array} menuItems - Array of menu items
 * @param {Function} hasModule - Function to check module access
 * @returns {Array} - Filtered menu items
 */
export const filterMenuByModules = (menuItems, hasModule) => {
    return menuItems.filter(item => {
        // If item has no required module, include it
        if (!item.requiredModule) return true;

        // Check if user has access to required module
        return hasModule(item.requiredModule);
    }).map(item => {
        // Recursively filter submenus
        if (item.submenu) {
            return {
                ...item,
                submenu: filterMenuByModules(item.submenu, hasModule)
            };
        }
        return item;
    });
};

export default Modules;


