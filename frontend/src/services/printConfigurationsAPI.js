/**
 * API Service pour les configurations d'impression
 */
import api from './api';

export const printConfigurationsAPI = {
  /**
   * Récupère toutes les configurations d'impression de l'organisation
   */
  list: (params = {}) => api.get('/print-configurations/', { params }),

  /**
   * Récupère une configuration spécifique par ID
   */
  get: (id) => api.get(`/print-configurations/${id}/`),

  /**
   * Crée une nouvelle configuration d'impression
   */
  create: (data) => api.post('/print-configurations/', data),

  /**
   * Met à jour une configuration existante
   */
  update: (id, data) => api.patch(`/print-configurations/${id}/`, data),

  /**
   * Supprime une configuration
   */
  delete: (id) => api.delete(`/print-configurations/${id}/`),

  /**
   * Récupère la configuration par défaut
   */
  getDefault: () => api.get('/print-configurations/default/'),

  /**
   * Définit une configuration comme défaut
   */
  setDefault: (id) => api.post(`/print-configurations/${id}/set_default/`),
};

export default printConfigurationsAPI;
