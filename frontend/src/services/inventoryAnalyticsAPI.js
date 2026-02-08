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
    const startDate = params.start_date ? (typeof params.start_date === 'string' ? params.start_date : params.start_date.format?.('YYYY-MM-DD')) : null;
    const endDate = params.end_date ? (typeof params.end_date === 'string' ? params.end_date : params.end_date.format?.('YYYY-MM-DD')) : null;
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.movement_type) queryParams.append('movement_type', params.movement_type);
    if (params.product_id) queryParams.append('product_id', params.product_id);

    const response = await api.get(`/analytics/inventory/movements/?${queryParams.toString()}`);
    return response.data;
  },

  // Get stock value analytics
  getStockValue: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.product_type) queryParams.append('product_type', params.product_type);
    if (params.search) queryParams.append('search', params.search);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.warehouse_id) queryParams.append('warehouse_id', params.warehouse_id);

    const response = await api.get(`/analytics/inventory/stock-value/?${queryParams.toString()}`);
    return response.data;
  },

  // Wilson EOQ analysis
  getWilsonEOQ: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.product_id) queryParams.append('product_id', params.product_id);
    const response = await api.get(`/analytics/inventory/wilson-eoq/?${queryParams.toString()}`);
    return response.data;
  },

  // Product scores
  getProductScores: async () => {
    const response = await api.get('/analytics/inventory/product-scores/');
    return response.data;
  },

  // EOQ Dashboard
  getEOQDashboard: async () => {
    const response = await api.get('/analytics/inventory/eoq-dashboard/');
    return response.data;
  },

  // Predictive restock
  getPredictiveRestock: async () => {
    const response = await api.get('/analytics/inventory/predictive-restock/');
    return response.data;
  },

  // Consumption stats
  getConsumptionStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.product_id) queryParams.append('product_id', params.product_id);
    if (params.period) queryParams.append('period', params.period);
    const response = await api.get(`/analytics/inventory/consumption-stats/?${queryParams.toString()}`);
    return response.data;
  },

  // Get dashboard summary stats
  getDashboardStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    const startDate = params.start_date ? (typeof params.start_date === 'string' ? params.start_date : params.start_date.format?.('YYYY-MM-DD')) : null;
    const endDate = params.end_date ? (typeof params.end_date === 'string' ? params.end_date : params.end_date.format?.('YYYY-MM-DD')) : null;
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const response = await api.get(`/analytics/inventory/dashboard-stats/?${queryParams.toString()}`);
    return response.data;
  }
};

export default inventoryAnalyticsAPI;
