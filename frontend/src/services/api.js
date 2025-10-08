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
  quickCreate: (data) => api.post('/quick-create/supplier/', data),
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
  quickCreate: (data) => api.post('/quick-create/product/', data),
};

// Clients API
export const clientsAPI = {
  list: (params) => api.get('/clients/', { params }),
  get: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.patch(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
  quickCreate: (data) => api.post('/quick-create/client/', data),
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
  getQuickActions: (category = null) => {
    const params = category ? { category } : {};
    return api.get('/ai/quick-actions/', { params });
  },
};

// Contracts API
export const contractsAPI = {
  list: (params) => api.get('/contracts/contracts/', { params }),
  get: (id) => api.get(`/contracts/contracts/${id}/`),
  create: (data) => api.post('/contracts/contracts/', data),
  update: (id, data) => api.patch(`/contracts/contracts/${id}/`, data),
  delete: (id) => api.delete(`/contracts/contracts/${id}/`),
  approve: (id, notes) => api.post(`/contracts/contracts/${id}/approve/`, { notes }),
  activate: (id) => api.post(`/contracts/contracts/${id}/activate/`),
  terminate: (id) => api.post(`/contracts/contracts/${id}/terminate/`),
  renew: (id, data) => api.post(`/contracts/contracts/${id}/renew/`, data),
  extractClauses: (id, contractText, language = 'fr') =>
    api.post(`/contracts/contracts/${id}/extract_clauses/`, {
      contract_text: contractText,
      language,
    }),
  statistics: () => api.get('/contracts/contracts/statistics/'),

  // Clauses
  clauses: {
    list: (params) => api.get('/contracts/clauses/', { params }),
    get: (id) => api.get(`/contracts/clauses/${id}/`),
    create: (data) => api.post('/contracts/clauses/', data),
    update: (id, data) => api.patch(`/contracts/clauses/${id}/`, data),
    delete: (id) => api.delete(`/contracts/clauses/${id}/`),
    verify: (id) => api.post(`/contracts/clauses/${id}/verify/`),
    analyzeRisk: (id, language = 'fr') =>
      api.post(`/contracts/clauses/${id}/analyze_risk/`, { language }),
  },

  // Milestones
  milestones: {
    list: (params) => api.get('/contracts/milestones/', { params }),
    get: (id) => api.get(`/contracts/milestones/${id}/`),
    create: (data) => api.post('/contracts/milestones/', data),
    update: (id, data) => api.patch(`/contracts/milestones/${id}/`, data),
    delete: (id) => api.delete(`/contracts/milestones/${id}/`),
    complete: (id) => api.post(`/contracts/milestones/${id}/complete/`),
  },

  // Documents
  documents: {
    list: (params) => api.get('/contracts/documents/', { params }),
    get: (id) => api.get(`/contracts/documents/${id}/`),
    create: (data) => {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
      return api.post('/contracts/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    delete: (id) => api.delete(`/contracts/documents/${id}/`),
  },
};

// E-Sourcing API
export const eSourcingAPI = {
  // Sourcing Events
  events: {
    list: (params) => api.get('/e-sourcing/events/', { params }),
    get: (id) => api.get(`/e-sourcing/events/${id}/`),
    create: (data) => api.post('/e-sourcing/events/', data),
    update: (id, data) => api.patch(`/e-sourcing/events/${id}/`, data),
    delete: (id) => api.delete(`/e-sourcing/events/${id}/`),
    publish: (id) => api.post(`/e-sourcing/events/${id}/publish/`),
    close: (id) => api.post(`/e-sourcing/events/${id}/close/`),
    cancel: (id) => api.post(`/e-sourcing/events/${id}/cancel/`),
    compareBids: (id) => api.get(`/e-sourcing/events/${id}/compare_bids/`),
    statistics: (id) => api.get(`/e-sourcing/events/${id}/statistics/`),
  },

  // Supplier Bids
  bids: {
    list: (params) => api.get('/e-sourcing/bids/', { params }),
    get: (id) => api.get(`/e-sourcing/bids/${id}/`),
    create: (data) => api.post('/e-sourcing/bids/', data),
    update: (id, data) => api.patch(`/e-sourcing/bids/${id}/`, data),
    delete: (id) => api.delete(`/e-sourcing/bids/${id}/`),
    submit: (id) => api.post(`/e-sourcing/bids/${id}/submit/`),
    withdraw: (id) => api.post(`/e-sourcing/bids/${id}/withdraw/`),
    evaluate: (id, data) => api.post(`/e-sourcing/bids/${id}/evaluate/`, data),
    award: (id) => api.post(`/e-sourcing/bids/${id}/award/`),
  },

  // Supplier Invitations
  invitations: {
    list: (params) => api.get('/e-sourcing/invitations/', { params }),
    get: (id) => api.get(`/e-sourcing/invitations/${id}/`),
    create: (data) => api.post('/e-sourcing/invitations/', data),
    delete: (id) => api.delete(`/e-sourcing/invitations/${id}/`),
    send: (id) => api.post(`/e-sourcing/invitations/${id}/send/`),
    markViewed: (id) => api.post(`/e-sourcing/invitations/${id}/mark_viewed/`),
    decline: (id, reason) => api.post(`/e-sourcing/invitations/${id}/decline/`, { decline_reason: reason }),
  },

  // Bid Items
  bidItems: {
    list: (params) => api.get('/e-sourcing/bid-items/', { params }),
    get: (id) => api.get(`/e-sourcing/bid-items/${id}/`),
    create: (data) => api.post('/e-sourcing/bid-items/', data),
    update: (id, data) => api.patch(`/e-sourcing/bid-items/${id}/`, data),
    delete: (id) => api.delete(`/e-sourcing/bid-items/${id}/`),
  },
};

// Data Migration API
export const migrationAPI = {
  list: (params) => api.get('/migration/jobs/', { params }),
  get: (id) => api.get(`/migration/jobs/${id}/`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });
    return api.post('/migration/jobs/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  preview: (id) => api.post(`/migration/jobs/${id}/preview/`),
  configure: (id, config) => api.post(`/migration/jobs/${id}/configure/`, config),
  start: (id) => api.post(`/migration/jobs/${id}/start/`),
  cancel: (id) => api.post(`/migration/jobs/${id}/cancel/`),
  logs: (id) => api.get(`/migration/jobs/${id}/logs/`),
};

// QuickBooks API
export const quickbooksAPI = {
  getAuthUrl: () => api.get('/migration/quickbooks/auth-url/'),
  getStatus: () => api.get('/migration/quickbooks/status/'),
  disconnect: () => api.post('/migration/quickbooks/disconnect/'),
  testConnection: () => api.post('/migration/quickbooks/test/'),
  previewData: (entityType) => api.get('/migration/quickbooks/preview/', {
    params: { entity_type: entityType }
  }),
};

export default api;