import api from './api';

// Download PDF file
export const downloadPDF = (blob, filename) => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

// Open PDF in new tab
export const openPDFInNewTab = (blob) => {
  try {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Note: URL is not revoked here as the new tab needs it
  } catch (error) {
    console.error('Error opening PDF in new tab:', error);
    throw error;
  }
};

/**
 * Service pour générer et télécharger les rapports PDF
 * Utilise le même pattern que pdfService.js pour cohérence
 */
class PDFReportService {
  /**
   * Générer un rapport PDF pour un fournisseur
   * @param {Object} supplier - Données du fournisseur
   * @returns {Promise<Blob>}
   */
  async generateSupplierReport(supplier) {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

      const response = await fetch(`${baseUrl}/suppliers/${supplier.id}/pdf-report/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport fournisseur:', error);
      throw error;
    }
  }

  /**
   * Télécharger un rapport PDF pour un fournisseur
   * @param {string|number} supplierId - ID du fournisseur
   * @returns {Promise<Blob>}
   */
  async downloadSupplierReport(supplierId) {
    try {
      const supplier = { id: supplierId };
      const blob = await this.generateSupplierReport(supplier);
      downloadPDF(blob, `rapport-fournisseur-${supplierId}.pdf`);
      return blob;
    } catch (error) {
      console.error('Erreur lors du téléchargement du rapport fournisseur:', error);
      throw error;
    }
  }

  /**
   * Générer un rapport PDF pour un client
   * @param {Object} client - Données du client
   * @returns {Promise<Blob>}
   */
  async generateClientReport(client) {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

      const response = await fetch(`${baseUrl}/clients/${client.id}/pdf-report/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport client:', error);
      throw error;
    }
  }

  /**
   * Télécharger un rapport PDF pour un client
   * @param {string|number} clientId - ID du client
   * @returns {Promise<Blob>}
   */
  async downloadClientReport(clientId) {
    try {
      const client = { id: clientId };
      const blob = await this.generateClientReport(client);
      downloadPDF(blob, `rapport-client-${clientId}.pdf`);
      return blob;
    } catch (error) {
      console.error('Erreur lors du téléchargement du rapport client:', error);
      throw error;
    }
  }

  /**
   * Générer un rapport PDF pour un produit
   * @param {Object} product - Données du produit
   * @returns {Promise<Blob>}
   */
  async generateProductReport(product) {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

      const response = await fetch(`${baseUrl}/products/${product.id}/pdf-report/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport produit:', error);
      throw error;
    }
  }

  /**
   * Télécharger un rapport PDF pour un produit
   * @param {string|number} productId - ID du produit
   * @returns {Promise<Blob>}
   */
  async downloadProductReport(productId) {
    try {
      const product = { id: productId };
      const blob = await this.generateProductReport(product);
      downloadPDF(blob, `rapport-produit-${productId}.pdf`);
      return blob;
    } catch (error) {
      console.error('Erreur lors du téléchargement du rapport produit:', error);
      throw error;
    }
  }

  /**
   * Visualiser un rapport PDF dans un nouvel onglet
   * @param {string|number} entityId - ID de l'entité
   * @param {string} entityType - Type d'entité (supplier, client, product)
   * @returns {Promise<void>}
   */
  async viewReport(entityId, entityType) {
    try {
      let endpoint = '';
      switch (entityType) {
        case 'supplier':
          endpoint = `/suppliers/${entityId}/pdf-report/`;
          break;
        case 'client':
          endpoint = `/clients/${entityId}/pdf-report/`;
          break;
        case 'product':
          endpoint = `/products/${entityId}/pdf-report/`;
          break;
        default:
          throw new Error(`Type d'entité non supporté: ${entityType}`);
      }

      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Nettoyer l'URL après un délai
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la visualisation du rapport:', error);
      throw error;
    }
  }

  /**
   * Générique pour télécharger n'importe quel rapport
   * @param {string|number} entityId - ID de l'entité
   * @param {string} entityType - Type d'entité (supplier, client, product)
   * @returns {Promise<Blob>}
   */
  async downloadReport(entityId, entityType) {
    switch (entityType) {
      case 'supplier':
        return this.downloadSupplierReport(entityId);
      case 'client':
        return this.downloadClientReport(entityId);
      case 'product':
        return this.downloadProductReport(entityId);
      default:
        throw new Error(`Type d'entité non supporté: ${entityType}`);
    }
  }

  /**
   * Télécharger un rapport PDF groupé pour plusieurs factures
   * @param {Object} filters - Filtres (itemIds, dateStart, dateEnd, status, client_id)
   * @returns {Promise<Blob>}
   */
  async generateInvoicesBulkReport(filters = {}) {
    try {
      const payload = {};
      
      // Ne pas envoyer invoice_ids si undefined ou vide
      if (filters.itemIds && filters.itemIds.length > 0) {
        payload.invoice_ids = filters.itemIds;
      }
      
      if (filters.dateStart) {
        payload.date_start = filters.dateStart;
      }
      
      if (filters.dateEnd) {
        payload.date_end = filters.dateEnd;
      }
      
      if (filters.status) {
        payload.status = filters.status;
      }
      
      if (filters.clientId) {
        payload.client_id = filters.clientId;
      }

      const response = await api.post('/invoices/bulk-pdf-report/', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de factures:', error);
      throw error;
    }
  }

  async downloadInvoicesBulkReport(filters = {}) {
    const blob = await this.generateInvoicesBulkReport(filters);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-factures-${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return blob;
  }

  /**
   * Télécharger un rapport PDF groupé pour plusieurs bons de commande
   * @param {Object} filters - Filtres (itemIds, dateStart, dateEnd, status, supplier_id)
   * @returns {Promise<Blob>}
   */
  async generatePurchaseOrdersBulkReport(filters = {}) {
    try {
      const payload = {};
      
      // Ne pas envoyer po_ids si undefined ou vide
      if (filters.itemIds && filters.itemIds.length > 0) {
        payload.po_ids = filters.itemIds;
      }
      
      if (filters.dateStart) {
        payload.date_start = filters.dateStart;
      }
      
      if (filters.dateEnd) {
        payload.date_end = filters.dateEnd;
      }
      
      if (filters.status) {
        payload.status = filters.status;
      }
      
      if (filters.supplierId) {
        payload.supplier_id = filters.supplierId;
      }

      const response = await api.post('/purchase-orders/bulk-pdf-report/', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de bons de commande:', error);
      throw error;
    }
  }

  async downloadPurchaseOrdersBulkReport(filters = {}) {
    const blob = await this.generatePurchaseOrdersBulkReport(filters);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-bons-commande-${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return blob;
  }

  /**
   * Générer un rapport PDF groupé pour plusieurs clients
   * @param {Object} filters - Filtres (itemIds, dateStart, dateEnd, status)
   * @returns {Promise<Blob>}
   */
  async generateClientsBulkReport(filters = {}) {
    try {
      const payload = {};
      
      if (filters.itemIds && filters.itemIds.length > 0) {
        payload.client_ids = filters.itemIds;
      }
      
      if (filters.dateStart) {
        payload.date_start = filters.dateStart;
      }
      
      if (filters.dateEnd) {
        payload.date_end = filters.dateEnd;
      }
      
      if (filters.status) {
        payload.status = filters.status;
      }

      const response = await api.post('/clients/bulk-pdf-report/', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de clients:', error);
      throw error;
    }
  }

  /**
   * Générer un rapport PDF groupé pour plusieurs produits
   * @param {Object} filters - Filtres (itemIds, dateStart, dateEnd, category)
   * @returns {Promise<Blob>}
   */
  async generateProductsBulkReport(filters = {}) {
    try {
      const payload = {};
      
      if (filters.itemIds && filters.itemIds.length > 0) {
        payload.product_ids = filters.itemIds;
      }
      
      if (filters.dateStart) {
        payload.date_start = filters.dateStart;
      }
      
      if (filters.dateEnd) {
        payload.date_end = filters.dateEnd;
      }
      
      if (filters.category) {
        payload.category = filters.category;
      }

      const response = await api.post('/products/bulk-pdf-report/', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de produits:', error);
      throw error;
    }
  }
}

// Instance singleton
const pdfReportService = new PDFReportService();

export default pdfReportService;

// Export functions
export const generateSupplierReportPDF = (supplier) => pdfReportService.generateSupplierReport(supplier);
export const generateClientReportPDF = (client) => pdfReportService.generateClientReport(client);
export const generateProductReportPDF = (product) => pdfReportService.generateProductReport(product);

// Export des fonctions individuelles pour plus de flexibilité
export const {
  downloadSupplierReport,
  downloadClientReport,
  downloadProductReport,
  viewReport,
  downloadReport,
  generateInvoicesBulkReport,
  downloadInvoicesBulkReport,
  generatePurchaseOrdersBulkReport,
  downloadPurchaseOrdersBulkReport,
  generateClientsBulkReport,
  generateProductsBulkReport,
} = pdfReportService;

