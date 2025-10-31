import api from './api';

// Analytics API - Dashboard complet avec statistiques avancées
export const analyticsAPI = {
  // Récupérer les statistiques avec filtres
  getStats: (params) => api.get('/analytics/stats/', { params }),

  // Exporter en PDF
  exportPDF: (params) => api.post('/analytics/export/',
    { ...params, format: 'pdf' },
    { responseType: 'blob' }
  ),

  // Exporter en Excel
  exportExcel: (params) => api.post('/analytics/export/',
    { ...params, format: 'excel' },
    { responseType: 'blob' }
  ),

  // Configuration utilisateur
  getConfig: () => api.get('/analytics/config/'),
  updateConfig: (data) => api.put('/analytics/config/', data),

  // Vues sauvegard\u00e9es
  getSavedViews: () => api.get('/analytics/saved-views/'),
  createSavedView: (data) => api.post('/analytics/saved-views/', data),
  deleteSavedView: (id) => api.delete(`/analytics/saved-views/${id}/`),
};

export default analyticsAPI;
