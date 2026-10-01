import api from './api';

// Suivi patients (CRM)
const crmAPI = {
  // Liste filtrable : { segment, q, page, page_size, ordering, gender, age_min, age_max,
  //   min_visits, max_visits, inactive_days, quartier, service, privilege_card, include_external }
  listPatients: async (params = {}) => {
    const response = await api.get('/crm/patients/', { params });
    return response.data;
  },

  // Même liste au format Excel (mêmes filtres)
  exportPatients: async (params = {}) => {
    const response = await api.get('/crm/patients/export/', { params, responseType: 'blob' });
    return response.data;
  },
};

export default crmAPI;
