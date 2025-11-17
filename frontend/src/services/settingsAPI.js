/**
 * API Service pour les paramètres d'organisation
 */
import api from './api';

export const settingsAPI = {
  /**
   * Récupère tous les paramètres de l'organisation
   * GET /api/v1/settings/all/
   */
  getAll: () => api.get('/settings/all/'),

  /**
   * Met à jour les paramètres de l'organisation
   * PATCH /api/v1/settings/all/
   */
  updateAll: (data) => api.patch('/settings/all/', data),

  /**
   * Upload du logo de l'entreprise
   * POST /api/v1/settings/organization/upload_logo/
   */
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/organization/upload_logo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Supprime le logo de l'entreprise
   * DELETE /api/v1/settings/organization/delete_logo/
   */
  deleteLogo: () => api.delete('/settings/organization/delete_logo/'),
};

export default settingsAPI;
