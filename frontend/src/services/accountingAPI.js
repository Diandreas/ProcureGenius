import api from './api';

const BASE = '/accounting';

const accountingAPI = {
  // ── Plan Comptable ──────────────────────────────────────────────
  getAccounts: (params = {}) => api.get(`${BASE}/accounts/`, { params }),
  getAccount: (id) => api.get(`${BASE}/accounts/${id}/`),
  createAccount: (data) => api.post(`${BASE}/accounts/`, data),
  updateAccount: (id, data) => api.patch(`${BASE}/accounts/${id}/`, data),
  deleteAccount: (id) => api.delete(`${BASE}/accounts/${id}/`),

  // ── Journaux ────────────────────────────────────────────────────
  getJournals: () => api.get(`${BASE}/journals/`),
  createJournal: (data) => api.post(`${BASE}/journals/`, data),

  // ── Écritures ───────────────────────────────────────────────────
  getEntries: (params = {}) => api.get(`${BASE}/entries/`, { params }),
  getEntry: (id) => api.get(`${BASE}/entries/${id}/`),
  createEntry: (data) => api.post(`${BASE}/entries/`, data),
  updateEntry: (id, data) => api.patch(`${BASE}/entries/${id}/`, data),
  deleteEntry: (id) => api.delete(`${BASE}/entries/${id}/`),
  postEntry: (id) => api.post(`${BASE}/entries/${id}/post/`),
  cancelEntry: (id) => api.post(`${BASE}/entries/${id}/cancel/`),

  // ── Rapports ────────────────────────────────────────────────────
  getTrialBalance: (params = {}) => api.get(`${BASE}/reports/trial-balance/`, { params }),
  getGeneralLedger: (params = {}) => api.get(`${BASE}/reports/general-ledger/`, { params }),
  getIncomeStatement: (params = {}) => api.get(`${BASE}/reports/income-statement/`, { params }),
  getBalanceSheet: (params = {}) => api.get(`${BASE}/reports/balance-sheet/`, { params }),
  getSIG: (params = {}) => api.get(`${BASE}/reports/sig/`, { params }),

  // ── Dashboard ───────────────────────────────────────────────────
  getDashboard: () => api.get(`${BASE}/dashboard/`),

  // ── Sync facture ────────────────────────────────────────────────
  syncInvoice: (invoiceId) => api.post(`${BASE}/sync-invoice/${invoiceId}/`),

  // ── Setup plan comptable ─────────────────────────────────────────
  checkSetup: () => api.get(`${BASE}/setup/`),
  initSetup: () => api.post(`${BASE}/setup/`),
};

export default accountingAPI;
