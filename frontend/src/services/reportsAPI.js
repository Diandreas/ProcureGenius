import api from './api';

// Reports API using centralized axios instance
export const reportsAPI = {
  // Lister les rapports
  list: (params = {}) => api.get('/reports/', { params }),

  // Obtenir un rapport
  get: (id) => api.get(`/reports/${id}/`),

  // Télécharger un rapport
  download: (id) =>
    api.get(`/reports/${id}/download/`, {
      responseType: 'blob',
    }),

  // Générer un rapport fournisseur
  generateSupplierReport: (supplierId, format = 'pdf', dateStart = null, dateEnd = null) =>
    api.post('/reports/generate_supplier/', {
      supplier_id: supplierId,
      format,
      date_start: dateStart,
      date_end: dateEnd,
    }),

  // Mes rapports récents
  myReports: () => api.get('/reports/my_reports/'),

  // Templates
  listTemplates: (params = {}) => api.get('/reports/templates/', { params }),

  getTemplate: (id) => api.get(`/reports/templates/${id}/`),

  createTemplate: (data) => api.post('/reports/templates/', data),

  updateTemplate: (id, data) => api.patch(`/reports/templates/${id}/`, data),

  deleteTemplate: (id) => api.delete(`/reports/templates/${id}/`),
};

export default reportsAPI;
