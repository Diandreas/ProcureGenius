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

  // Open a batch
  openBatch: async (batchId) => {
    const response = await api.post(`/batches/${batchId}/open/`);
    return response.data;
  },

  // Get expiring batches
  getExpiringBatches: async (days = 30) => {
    const response = await api.get(`/batches/expiring/?days=${days}`);
    return response.data;
  }
};

export default batchAPI;
