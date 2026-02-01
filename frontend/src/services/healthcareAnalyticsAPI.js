import api from './api';

// Helper to format date params (handles both dayjs objects and strings)
const formatDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string') return date;
  if (date.format) return date.format('YYYY-MM-DD');
  return null;
};

const healthcareAnalyticsAPI = {
  // Get exam status by patient
  getExamStatus: async (params = {}) => {
    const queryParams = new URLSearchParams();
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.patient_id) queryParams.append('patient_id', params.patient_id);
    if (params.status) queryParams.append('status', params.status);

    const response = await api.get(`/analytics/healthcare/exam-status/?${queryParams.toString()}`);
    return response.data;
  },

  // Get exam types by time period
  getExamTypes: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.patient_id) queryParams.append('patient_id', params.patient_id);

    const response = await api.get(`/analytics/healthcare/exam-types/?${queryParams.toString()}`);
    return response.data;
  },

  // Get demographic analysis
  getDemographics: async (params = {}) => {
    const queryParams = new URLSearchParams();
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.group_by) queryParams.append('group_by', params.group_by);

    const response = await api.get(`/analytics/healthcare/demographics/?${queryParams.toString()}`);
    return response.data;
  },

  // Get revenue analytics
  getRevenue: async (params = {}) => {
    const queryParams = new URLSearchParams();
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.group_by) queryParams.append('group_by', params.group_by);

    const response = await api.get(`/analytics/healthcare/revenue/?${queryParams.toString()}`);
    return response.data;
  },

  // Get dashboard summary stats
  getDashboardStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const response = await api.get(`/analytics/healthcare/dashboard-stats/?${queryParams.toString()}`);
    return response.data;
  },

  // Get activity indicators (consultations, patients, medical acts, wait times, revenue)
  getActivityIndicators: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const response = await api.get(`/analytics/healthcare/activity-indicators/?${queryParams.toString()}`);
    return response.data;
  },

  // Get enhanced revenue analytics
  getEnhancedRevenue: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.invoice_type) queryParams.append('invoice_type', params.invoice_type);

    const response = await api.get(`/analytics/healthcare/revenue-enhanced/?${queryParams.toString()}`);
    return response.data;
  },

  // Get service revenue analytics (new)
  getServiceRevenue: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    const startDate = formatDate(params.start_date);
    const endDate = formatDate(params.end_date);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (params.service_id) queryParams.append('service_id', params.service_id);
    if (params.category_id) queryParams.append('category_id', params.category_id);

    const response = await api.get(`/analytics/healthcare/service-revenue/?${queryParams.toString()}`);
    return response.data;
  }
};

export default healthcareAnalyticsAPI;
