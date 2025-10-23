import axios from 'axios';

const API_URL = 'http://localhost:8000/api/reports';

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Token ${token}` } : {};
};

export const reportsAPI = {
  // Lister les rapports
  list: (params = {}) =>
    axios.get(`${API_URL}/`, {
      params,
      headers: getAuthHeaders(),
    }),

  // Obtenir un rapport
  get: (id) =>
    axios.get(`${API_URL}/${id}/`, {
      headers: getAuthHeaders(),
    }),

  // Télécharger un rapport
  download: (id) =>
    axios.get(`${API_URL}/${id}/download/`, {
      headers: getAuthHeaders(),
      responseType: 'blob',
    }),

  // Générer un rapport fournisseur
  generateSupplierReport: (supplierId, format = 'pdf', dateStart = null, dateEnd = null) =>
    axios.post(
      `${API_URL}/generate_supplier/`,
      {
        supplier_id: supplierId,
        format,
        date_start: dateStart,
        date_end: dateEnd,
      },
      {
        headers: getAuthHeaders(),
      }
    ),

  // Mes rapports récents
  myReports: () =>
    axios.get(`${API_URL}/my_reports/`, {
      headers: getAuthHeaders(),
    }),

  // Templates
  listTemplates: (params = {}) =>
    axios.get(`${API_URL}/templates/`, {
      params,
      headers: getAuthHeaders(),
    }),

  getTemplate: (id) =>
    axios.get(`${API_URL}/templates/${id}/`, {
      headers: getAuthHeaders(),
    }),
};

export default reportsAPI;
