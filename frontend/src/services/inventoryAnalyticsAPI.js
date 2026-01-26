import api from './api';

const inventoryAnalyticsAPI = {
  // Get reorder quantities
  getReorderQuantities: async () => {
    const response = await api.get('/analytics/inventory/reorder/');
    return response.data;
  },

  // Get stockout risk analysis
  getStockoutRisk: async () => {
    const response = await api.get('/analytics/inventory/stockout-risk/');
    return response.data;
  },

  // Get at-risk products
  getAtRiskProducts: async () => {
    const response = await api.get('/analytics/inventory/at-risk/');
    return response.data;
  },

  // Get movement analysis
  getMovements: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.movement_type) queryParams.append('movement_type', params.movement_type);
    if (params.product_id) queryParams.append('product_id', params.product_id);

    const response = await api.get(`/analytics/inventory/movements/?${queryParams.toString()}`);
    return response.data;
  },

  // Get dashboard summary stats
  getDashboardStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const response = await api.get(`/analytics/inventory/dashboard-stats/?${queryParams.toString()}`);
    return response.data;
  }
};

export default inventoryAnalyticsAPI;
