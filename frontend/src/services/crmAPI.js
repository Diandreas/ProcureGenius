import api from './api';

// Suivi patients (CRM)
const crmAPI = {
  // Liste filtrable : { segment, q, page, page_size, ordering, gender, age_min, age_max,
  //   min_visits, max_visits, inactive_days, quartier, service, privilege_card, include_external }
  listPatients: async (params = {}) => {
    const response = await api.get('/crm/patients/', { params });
    return response.data;
  },

  // Recherche rapide d'un patient (nom, téléphone ou numéro) — 2 lettres minimum
  searchPatients: async (q) => {
    const response = await api.get('/crm/patients/search/', { params: { q } });
    return response.data.results || [];
  },

  // Passages : { days, reason, patient, page, page_size }
  listPassages: async (params = {}) => {
    const response = await api.get('/crm/passages/', { params });
    return response.data;
  },

  // { patient_id | person_name + person_phone, reason, text }
  createPassage: async (data) => {
    const response = await api.post('/crm/passages/', data);
    return response.data;
  },

  deletePassage: async (id) => {
    await api.delete(`/crm/passages/${id}/`);
  },

  // Même liste au format Excel (mêmes filtres)
  exportPatients: async (params = {}) => {
    const response = await api.get('/crm/patients/export/', { params, responseType: 'blob' });
    return response.data;
  },
};

export default crmAPI;
