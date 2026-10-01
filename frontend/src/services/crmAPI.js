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

  // Provenance (comment le patient a connu le centre)
  listOrigins: async () => {
    const response = await api.get('/crm/origins/');
    return response.data.results || [];
  },

  getProfile: async (patientId) => {
    const response = await api.get(`/crm/patients/${patientId}/profile/`);
    return response.data;
  },

  // { origin_id | unknown: true, detail, do_not_contact }
  saveProfile: async (patientId, data) => {
    const response = await api.patch(`/crm/patients/${patientId}/profile/`, data);
    return response.data;
  },

  // Après création d'un patient : enregistre la provenance choisie sans jamais gêner la création.
  saveProvenanceAfterCreate: async (patientId, valeur) => {
    if (!patientId || !valeur) return;
    try {
      await api.patch(`/crm/patients/${patientId}/profile/`,
        valeur === 'unknown' ? { unknown: true } : { origin_id: valeur });
    } catch (e) {
      // La fiche est créée ; la provenance pourra être complétée plus tard.
    }
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

  // Rapport mensuel « patients financiers » (administrateurs) : fichier Excel du mois AAAA-MM
  downloadFinancialReport: async (month) => {
    const response = await api.get('/crm/reports/financial-patients/', { params: { month }, responseType: 'blob' });
    return response.data;
  },
  getSpendingProfile: async (month) => (await api.get('/crm/reports/spending-profile/', { params: { month } })).data,
  getReportSchedule: async () => (await api.get('/crm/reports/schedule/')).data,
  saveReportSchedule: async (data) => (await api.put('/crm/reports/schedule/', data)).data,
};

export default crmAPI;
