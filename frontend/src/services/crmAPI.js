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
  saveProvenanceAfterCreate: async (patientId, valeur, campagne, extra = {}) => {
    const complements = Object.fromEntries(Object.entries(extra).filter(([, v]) => v));
    if (!patientId || (!valeur && !campagne && !Object.keys(complements).length)) return;
    const corps = { ...complements };
    if (valeur === 'unknown') corps.unknown = true;
    else if (valeur) corps.origin_id = valeur;
    if (campagne) corps.campaign_id = campagne;
    try {
      await api.patch(`/crm/patients/${patientId}/profile/`, corps);
    } catch (e) {
      // La fiche est créée ; la provenance pourra être complétée plus tard.
    }
  },

  // Campagnes : actives seulement (pastilles) ou toutes avec leurs compteurs (écran)
  listCampaigns: async (params = {}) => (await api.get('/crm/campaigns/', { params })).data,
  createCampaign: async (data) => (await api.post('/crm/campaigns/', data)).data,
  updateCampaign: async (id, data) => (await api.patch(`/crm/campaigns/${id}/`, data)).data,
  deleteCampaign: async (id) => (await api.delete(`/crm/campaigns/${id}/`)).data,

  // Motifs de relance (pastilles) et réglage (administrateurs)
  listReasons: async () => (await api.get('/crm/reasons/')).data.results || [],
  listReasonSettings: async () => (await api.get('/crm/settings/reasons/')).data.results || [],
  createReason: async (data) => (await api.post('/crm/settings/reasons/', data)).data,
  updateReason: async (id, data) => (await api.patch(`/crm/settings/reasons/${id}/`, data)).data,
  deleteReason: async (id) => (await api.delete(`/crm/settings/reasons/${id}/`)).data,
  listOriginSettings: async () => (await api.get('/crm/settings/origins/')).data.results || [],
  createOrigin: async (data) => (await api.post('/crm/settings/origins/', data)).data,
  updateOrigin: async (id, data) => (await api.patch(`/crm/settings/origins/${id}/`, data)).data,
  deleteOrigin: async (id) => (await api.delete(`/crm/settings/origins/${id}/`)).data,

  // Relances : { patient, pending }
  listContacts: async (params) => (await api.get('/crm/contacts/', { params })).data.results || [],
  // { patient_id, channel, reason_id, campaign_id, outcome, note, do_not_contact }
  createContact: async (data) => (await api.post('/crm/contacts/', data)).data,
  updateContact: async (id, data) => (await api.patch(`/crm/contacts/${id}/`, data)).data,
  deleteContact: async (id) => (await api.delete(`/crm/contacts/${id}/`)).data,

  // Montée en gamme sur une facture : { upsold, came_for, planned_amount, note }
  getInvoiceInfo: async (invoiceId) => (await api.get(`/crm/invoices/${invoiceId}/info/`)).data,
  saveInvoiceInfo: async (invoiceId, data) => (await api.put(`/crm/invoices/${invoiceId}/info/`, data)).data,
  // Après création d'une facture : n'empêche jamais la facture si l'enregistrement échoue.
  saveInvoiceInfoAfterCreate: async (invoiceId, data) => {
    if (!invoiceId || !data) return;
    try {
      await api.put(`/crm/invoices/${invoiceId}/info/`, data);
    } catch (e) {
      // la facture est créée ; l'info pourra être ajoutée depuis son détail
    }
  },
  linkContactToInvoice: async (contactId, invoiceId) => {
    if (!contactId || !invoiceId) return;
    try {
      await api.patch(`/crm/contacts/${contactId}/`, { came_invoice_id: invoiceId });
    } catch (e) {
      // sans gravité : la détection automatique prend le relais
    }
  },

  // Quartiers proposés en pastilles, et recherche du patient qui en a envoyé un autre
  listQuartiers: async () => (await api.get('/crm/quartiers/')).data.results || [],
  searchReferrers: async (q) => (await api.get('/crm/referrers/search/', { params: { q } })).data.results || [],

  // Chiffres clés et étiquettes d'un patient (fiche)
  getPatientSummary: async (patientId) => (await api.get(`/crm/patients/${patientId}/summary/`)).data,

  // Statistiques : { start, end } (AAAA-MM-JJ)
  getStats: async (params) => (await api.get('/crm/stats/', { params })).data,

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
