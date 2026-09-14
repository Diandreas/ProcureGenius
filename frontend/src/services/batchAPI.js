import api from './api';

const batchAPI = {
  // Get batches for a product
  getProductBatches: async (productId) => {
    const response = await api.get(`/products/${productId}/batches/`);
    return response.data;
  },

  // Create a new batch for a product
  createBatch: async (productId, data) => {
    const response = await api.post(`/products/${productId}/batches/`, data);
    return response.data;
  },

  // Update a batch
  updateBatch: async (batchId, data) => {
    const response = await api.patch(`/batches/${batchId}/`, data);
    return response.data;
  },

  // Ouvrir un lot. La date d'ouverture est saisie et obligatoire :
  // { opened_at: 'AAAA-MM-JJ', shelf_life_after_opening_days, save_as_product_default, storage_conditions }
  openBatch: async (batchId, data) => {
    const response = await api.post(`/batches/${batchId}/open/`, data);
    return response.data;
  },

  // Clôturer un lot : { reason: 'depleted'|'expired'|'contaminated'|'qc_failed'|'other', notes }
  closeBatch: async (batchId, data) => {
    const response = await api.post(`/batches/${batchId}/close/`, data);
    return response.data;
  },

  // Étiquette d'ouverture (PDF) à coller sur le flacon
  getOpeningLabel: async (batchId) => {
    const response = await api.get(`/batches/${batchId}/opening-label/`, { responseType: 'blob' });
    return response.data;
  },

  // Examens sans réactif rattaché, les plus pratiqués d'abord
  getTestsWithoutReagents: async (days = 30) => {
    const response = await api.get('/healthcare/laboratory/reagents/tests-without-consumables/', { params: { days } });
    return response.data;
  },

  // Rattacher un réactif à un examen
  addTestConsumable: async (testId, data) => {
    const response = await api.post(`/healthcare/laboratory/tests/${testId}/consumables/`, data);
    return response.data;
  },

  // Get expiring batches
  getExpiringBatches: async (days = 30) => {
    const response = await api.get(`/batches/expiring/?days=${days}`);
    return response.data;
  },

  // Get opened reagents
  getOpenedReagents: async (showAll = false) => {
    const response = await api.get(`/batches/opened-reagents/?all=${showAll}`);
    return response.data;
  },

  // Delete a batch (only within 30 minutes of creation)
  deleteBatch: async (batchId) => {
    const response = await api.delete(`/batches/${batchId}/delete/`);
    return response.data;
  },
};

export default batchAPI;
