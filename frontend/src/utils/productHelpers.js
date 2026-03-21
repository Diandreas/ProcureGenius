/**
 * Utilitaires pour les produits
 */

/**
 * Retourne l'icône correspondant au type de produit
 * @param {string} productType - Type du produit (physical, service, digital)
 * @returns {string} Emoji correspondant
 */
export const getProductTypeIcon = (productType) => {
  const icons = {
    physical: '📦',
    service: '🔧',
    digital: '💾',
  };
  return icons[productType] || '📦';
};

/**
 * Retourne le label traduit du type de produit
 * @param {string} productType - Type du produit
 * @returns {string} Label en français
 */
export const getProductTypeLabel = (productType) => {
  const labels = {
    physical: 'Produit physique',
    service: 'Service',
    digital: 'Produit numérique',
  };
  return labels[productType] || 'Produit';
};

/**
 * Retourne la couleur correspondant au statut du stock
 * @param {string} stockStatus - Statut (good, low, out, unlimited)
 * @returns {string} Couleur MUI
 */
export const getStockStatusColor = (stockStatus) => {
  const colors = {
    good: 'success',
    low: 'warning',
    out: 'error',
    unlimited: 'info',
  };
  return colors[stockStatus] || 'default';
};

/**
 * Retourne le label du statut du stock
 * @param {string} stockStatus - Statut du stock
 * @param {number} stockQuantity - Quantité en stock
 * @returns {string} Label à afficher
 */
export const getStockStatusLabel = (stockStatus, stockQuantity) => {
  if (stockStatus === 'unlimited') return 'Illimité';
  if (stockStatus === 'out') return 'Rupture de stock';
  if (stockStatus === 'low') return `Stock bas (${stockQuantity})`;
  return `Stock: ${stockQuantity}`;
};

/**
 * Vérifie si un produit peut être ajouté à une facture
 * @param {object} product - Objet produit
 * @param {number} requestedQuantity - Quantité demandée
 * @param {object} [batch] - Objet lot sélectionné (optionnel)
 * @returns {object} { canAdd: boolean, reason: string }
 */
export const canAddProductToInvoice = (product, requestedQuantity, batch = null) => {
  // Les services et produits digitaux sont toujours disponibles
  if (product.product_type === 'service' || product.product_type === 'digital') {
    return { canAdd: true, reason: '' };
  }

  // Pour les produits physiques, vérifier le stock
  if (product.product_type === 'physical') {
    if (batch) {
      if (batch.current_quantity === 0) {
        return { canAdd: false, reason: `Le lot ${batch.batch_number} est en rupture de stock` };
      }
      if (batch.current_quantity < requestedQuantity) {
        return {
          canAdd: false,
          reason: `Stock insuffisant dans le lot ${batch.batch_number}. Disponible: ${batch.current_quantity}`,
        };
      }
    } else {
      if (product.stock_quantity === 0) {
        return { canAdd: false, reason: 'Produit en rupture de stock' };
      }
      if (product.stock_quantity < requestedQuantity) {
        return {
          canAdd: false,
          reason: `Stock insuffisant. Disponible: ${product.stock_quantity}`,
        };
      }
    }
  }

  return { canAdd: true, reason: '' };
};

/**
 * Filtre les produits par type
 * @param {array} products - Liste des produits
 * @param {string} type - Type à filtrer (physical, service, digital, ou 'all')
 * @returns {array} Produits filtrés
 */
export const filterProductsByType = (products, type) => {
  if (!type || type === 'all') return products;
  return products.filter((p) => p.product_type === type);
};

/**
 * Sépare les produits par catégorie (produits vs services/digital)
 * @param {array} products - Liste des produits
 * @returns {object} { physicalProducts: [], servicesAndDigital: [] }
 */
export const separateProductsByCategory = (products) => {
  const physicalProducts = products.filter((p) => p.product_type === 'physical');
  const servicesAndDigital = products.filter(
    (p) => p.product_type === 'service' || p.product_type === 'digital'
  );

  return { physicalProducts, servicesAndDigital };
};
