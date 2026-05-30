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

  // Vues sauvegardées
  getSavedViews: () => api.get('/analytics/saved-views/'),
  createSavedView: (data) => api.post('/analytics/saved-views/', data),
  deleteSavedView: (id) => api.delete(`/analytics/saved-views/${id}/`),

  // AI Greeting
  getAiGreeting: () => api.get('/analytics/ai-greeting/'),

  // Marges & bénéfice brut par produit (consultation, sans compta)
  getProductMargins: (params) => api.get('/analytics/product-margins/', { params }),

  // Restockage prédictif (Premium)
  getRestockForecast: (params) => api.get('/analytics/restock-forecast/', { params }),
  };

export default analyticsAPI;
