import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
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
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/token/', credentials),
  logout: () => {
    localStorage.removeItem('authToken');
    return Promise.resolve();
  },
  getProfile: () => api.get('/auth/profile/'),
};

// Suppliers API
export const suppliersAPI = {
  list: (params) => api.get('/suppliers/', { params }),
  get: (id) => api.get(`/suppliers/${id}/`),
  create: (data) => api.post('/suppliers/', data),
  update: (id, data) => api.patch(`/suppliers/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/${id}/`),
  toggleStatus: (id) => api.post(`/suppliers/${id}/toggle_status/`),
  getStatistics: (id) => api.get(`/suppliers/${id}/statistics/`),
  exportCSV: () => api.get('/suppliers/export_csv/', { responseType: 'blob' }),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  list: (params) => api.get('/purchase-orders/', { params }),
  get: (id) => api.get(`/purchase-orders/${id}/`),
  create: (data) => api.post('/purchase-orders/', data),
  update: (id, data) => api.patch(`/purchase-orders/${id}/`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}/`),
  addItem: (id, item) => api.post(`/purchase-orders/${id}/add_item/`, item),
  approve: (id) => api.post(`/purchase-orders/${id}/approve/`),
  printPDF: (id) => api.get(`/purchase-orders/${id}/print_pdf/`, { responseType: 'blob' }),
};

// Invoices API
export const invoicesAPI = {
  list: (params) => api.get('/invoices/', { params }),
  get: (id) => api.get(`/invoices/${id}/`),
  create: (data) => api.post('/invoices/', data),
  update: (id, data) => api.patch(`/invoices/${id}/`, data),
  delete: (id) => api.delete(`/invoices/${id}/`),
  addItem: (id, item) => api.post(`/invoices/${id}/add_item/`, item),
  send: (id) => api.post(`/invoices/${id}/send/`),
  markPaid: (id, data) => api.post(`/invoices/${id}/mark_paid/`, data),
};

// Products API
export const productsAPI = {
  list: (params) => api.get('/products/', { params }),
  get: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.patch(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
  lowStock: () => api.get('/products/low_stock/'),
};

// Clients API
export const clientsAPI = {
  list: (params) => api.get('/clients/', { params }),
  get: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.patch(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
  getRecentActivity: () => api.get('/dashboard/recent/'),
};

// AI Chat API
export const aiChatAPI = {
  sendMessage: (data) => api.post('/ai/chat/', data),
  getHistory: () => api.get('/ai/conversations/'),
  getConversation: (id) => api.get(`/ai/conversations/${id}/`),
  deleteConversation: (id) => api.delete(`/ai/conversations/${id}/`),
  analyzeDocument: (data) => api.post('/ai/analyze-document/', data),
  getQuickActions: () => api.get('/ai/quick-actions/'),
};

export default api;