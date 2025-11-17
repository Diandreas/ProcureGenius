/**
 * API Service pour les templates d'impression (en-têtes/pieds de page)
 */
import api from './api';

export const printTemplatesAPI = {
  /**
   * Liste tous les templates d'impression
   */
  list: (params = {}) => api.get('/print-templates/', { params }),

  /**
   * Récupère un template spécifique
   */
  get: (id) => api.get(`/print-templates/${id}/`),

  /**
   * Crée un nouveau template
   */
  create: (data) => api.post('/print-templates/', data),

  /**
   * Met à jour un template
   */
  update: (id, data) => api.patch(`/print-templates/${id}/`, data),

  /**
   * Supprime un template
   */
  delete: (id) => api.delete(`/print-templates/${id}/`),

  /**
   * Définit un template comme défaut
   */
  setDefault: (id) => api.post(`/print-templates/${id}/set_default/`),

  /**
   * Récupère le template par défaut
   */
  getDefault: () => api.get('/print-templates/default/'),

  /**
   * Upload du logo d'en-tête
   */
  uploadHeader: (id, file) => {
    const formData = new FormData();
    formData.append('header_image', file);
    return api.post(`/print-templates/${id}/upload_header/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Upload du logo pour le template
   */
  uploadLogo: (id, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post(`/print-templates/${id}/upload_logo/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default printTemplatesAPI;
