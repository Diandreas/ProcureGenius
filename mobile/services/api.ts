import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get API URL from environment or use default
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    } catch (error) {
      console.error('Error reading token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth data if unauthorized
      try {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('user');
        // Navigation will be handled by auth state change
      } catch (e) {
        console.error('Error clearing auth data:', e);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/token/', credentials),
  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('user');
  },
  getProfile: () => api.get('/auth/profile/'),
  register: (data: any) => api.post('/auth/register/', data),
  googleAuth: (token: string) => api.post('/auth/google/', { token }),
};

// Suppliers API
export const suppliersAPI = {
  list: (params?: any) => api.get('/suppliers/', { params }),
  get: (id: number) => api.get(`/suppliers/${id}/`),
  create: (data: any) => api.post('/suppliers/', data),
  update: (id: number, data: any) => api.patch(`/suppliers/${id}/`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}/`),
  toggleStatus: (id: number) => api.post(`/suppliers/${id}/toggle_status/`),
  getStatistics: (id: number) => api.get(`/suppliers/${id}/statistics/`),
  exportCSV: () => api.get('/suppliers/export_csv/', { responseType: 'blob' }),
  quickCreate: (data: any) => api.post('/quick-create/supplier/', data),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  list: (params?: any) => api.get('/purchase-orders/', { params }),
  get: (id: number) => api.get(`/purchase-orders/${id}/`),
  create: (data: any) => api.post('/purchase-orders/', data),
  update: (id: number, data: any) => api.patch(`/purchase-orders/${id}/`, data),
  delete: (id: number) => api.delete(`/purchase-orders/${id}/`),
  addItem: (id: number, item: any) => api.post(`/purchase-orders/${id}/add_item/`, item),
  approve: (id: number) => api.post(`/purchase-orders/${id}/approve/`),
  receive: (id: number) => api.post(`/purchase-orders/${id}/receive/`),
  printPDF: (id: number) => api.get(`/purchase-orders/${id}/print_pdf/`, { responseType: 'blob' }),
};

// Invoices API
export const invoicesAPI = {
  list: (params?: any) => api.get('/invoices/', { params }),
  get: (id: number) => api.get(`/invoices/${id}/`),
  create: (data: any) => api.post('/invoices/', data),
  update: (id: number, data: any) => api.patch(`/invoices/${id}/`, data),
  delete: (id: number) => api.delete(`/invoices/${id}/`),
  addItem: (id: number, item: any) => api.post(`/invoices/${id}/add_item/`, item),
  send: (id: number) => api.post(`/invoices/${id}/send/`),
  markPaid: (id: number, data: any) => api.post(`/invoices/${id}/mark_paid/`, data),
};

// Products API
export const productsAPI = {
  list: (params?: any) => api.get('/products/', { params }),
  get: (id: number) => api.get(`/products/${id}/`),
  create: (data: any) => api.post('/products/', data),
  update: (id: number, data: any) => api.patch(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  lowStock: () => api.get('/products/low_stock/'),
  stockAlerts: () => api.get('/products/stock_alerts/'),
  stockMovements: (id: number, params?: any) => api.get(`/products/${id}/stock_movements/`, { params }),
  adjustStock: (id: number, data: any) => api.post(`/products/${id}/adjust_stock/`, data),
  reportLoss: (id: number, data: any) => api.post(`/products/${id}/report_loss/`, data),
  getStatistics: (id: number) => api.get(`/products/${id}/statistics/`),
  quickCreate: (data: any) => api.post('/quick-create/product/', data),
};

// Product Categories API
export const productCategoriesAPI = {
  list: () => api.get('/product-categories/'),
  create: (data: any) => api.post('/product-categories/', data),
};

// Warehouses API
export const warehousesAPI = {
  list: () => api.get('/warehouses/'),
  create: (data: any) => api.post('/warehouses/', data),
};

// Clients API
export const clientsAPI = {
  list: (params?: any) => api.get('/clients/', { params }),
  get: (id: number) => api.get(`/clients/${id}/`),
  create: (data: any) => api.post('/clients/', data),
  update: (id: number, data: any) => api.patch(`/clients/${id}/`, data),
  delete: (id: number) => api.delete(`/clients/${id}/`),
  getStatistics: (id: number) => api.get(`/clients/${id}/statistics/`),
  quickCreate: (data: any) => api.post('/quick-create/client/', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
  getRecentActivity: () => api.get('/dashboard/recent-activity/'),
};

// AI Chat API
export const aiChatAPI = {
  sendMessage: (data: { message: string; conversation_id?: number }) =>
    api.post('/ai/chat/', data),
  getHistory: () => api.get('/ai/conversations/'),
  getConversation: (id: number) => api.get(`/ai/conversations/${id}/`),
  deleteConversation: (id: number) => api.delete(`/ai/conversations/${id}/`),
  analyzeDocument: (formData: FormData) =>
    api.post('/ai/analyze-document/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getQuickActions: () => api.get('/ai/quick-actions/'),
};

// Contracts API
export const contractsAPI = {
  list: (params?: any) => api.get('/contracts/', { params }),
  get: (id: number) => api.get(`/contracts/${id}/`),
  create: (data: any) => api.post('/contracts/', data),
  update: (id: number, data: any) => api.patch(`/contracts/${id}/`, data),
  delete: (id: number) => api.delete(`/contracts/${id}/`),
  approve: (id: number, data: any) => api.post(`/contracts/${id}/approve/`, data),
  activate: (id: number) => api.post(`/contracts/${id}/activate/`),
  terminate: (id: number, data: any) => api.post(`/contracts/${id}/terminate/`, data),
  renew: (id: number, data: any) => api.post(`/contracts/${id}/renew/`, data),
  extractClauses: (id: number) => api.post(`/contracts/${id}/extract_clauses/`),
  getStatistics: (id: number) => api.get(`/contracts/${id}/statistics/`),
  createClause: (contractId: number, data: any) =>
    api.post(`/contracts/${contractId}/clauses/`, data),
  updateClause: (contractId: number, clauseId: number, data: any) =>
    api.patch(`/contracts/${contractId}/clauses/${clauseId}/`, data),
  deleteClause: (contractId: number, clauseId: number) =>
    api.delete(`/contracts/${contractId}/clauses/${clauseId}/`),
  createMilestone: (contractId: number, data: any) =>
    api.post(`/contracts/${contractId}/milestones/`, data),
  completeMilestone: (contractId: number, milestoneId: number) =>
    api.post(`/contracts/${contractId}/milestones/${milestoneId}/complete/`),
};

// E-Sourcing API
export const eSourcingAPI = {
  listEvents: (params?: any) => api.get('/e-sourcing/events/', { params }),
  getEvent: (id: number) => api.get(`/e-sourcing/events/${id}/`),
  createEvent: (data: any) => api.post('/e-sourcing/events/', data),
  updateEvent: (id: number, data: any) => api.patch(`/e-sourcing/events/${id}/`, data),
  deleteEvent: (id: number) => api.delete(`/e-sourcing/events/${id}/`),
  publishEvent: (id: number) => api.post(`/e-sourcing/events/${id}/publish/`),
  closeEvent: (id: number) => api.post(`/e-sourcing/events/${id}/close/`),
  cancelEvent: (id: number, data: any) => api.post(`/e-sourcing/events/${id}/cancel/`, data),
  compareBids: (id: number) => api.get(`/e-sourcing/events/${id}/compare_bids/`),
  getEventStatistics: (id: number) => api.get(`/e-sourcing/events/${id}/statistics/`),
  listBids: (params?: any) => api.get('/e-sourcing/bids/', { params }),
  getBid: (id: number) => api.get(`/e-sourcing/bids/${id}/`),
  submitBid: (data: any) => api.post('/e-sourcing/bids/', data),
  withdrawBid: (id: number) => api.post(`/e-sourcing/bids/${id}/withdraw/`),
  evaluateBid: (id: number, data: any) => api.post(`/e-sourcing/bids/${id}/evaluate/`, data),
  awardBid: (id: number) => api.post(`/e-sourcing/bids/${id}/award/`),
};

// Migration API
export const migrationAPI = {
  list: () => api.get('/migration/jobs/'),
  get: (id: number) => api.get(`/migration/jobs/${id}/`),
  create: (data: any) => api.post('/migration/jobs/', data),
  preview: (id: number) => api.get(`/migration/jobs/${id}/preview/`),
  configure: (id: number, data: any) => api.patch(`/migration/jobs/${id}/configure/`, data),
  start: (id: number) => api.post(`/migration/jobs/${id}/start/`),
  cancel: (id: number) => api.post(`/migration/jobs/${id}/cancel/`),
  getLogs: (id: number) => api.get(`/migration/jobs/${id}/logs/`),
};

// Subscription API
export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans/'),
  getStatus: () => api.get('/subscriptions/status/'),
  getQuotas: () => api.get('/subscriptions/quotas/'),
  subscribe: (data: any) => api.post('/subscriptions/subscribe/', data),
  changePlan: (data: any) => api.post('/subscriptions/change-plan/', data),
  cancel: (data: any) => api.post('/subscriptions/cancel/', data),
  getPaymentHistory: () => api.get('/subscriptions/payment-history/'),
  checkFeatureAccess: (featureName: string) =>
    api.get(`/subscriptions/check-feature/${featureName}/`),
};

export default api;
