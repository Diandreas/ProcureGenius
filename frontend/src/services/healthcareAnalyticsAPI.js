import api from './api';

const healthcareAnalyticsAPI = {
  // Get exam status by patient
  getExamStatus: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.patient_id) queryParams.append('patient_id', params.patient_id);
    if (params.status) queryParams.append('status', params.status);

    const response = await api.get(`/analytics/healthcare/exam-status/?${queryParams.toString()}`);
    return response.data;
  },

  // Get exam types by time period
  getExamTypes: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.patient_id) queryParams.append('patient_id', params.patient_id);

    const response = await api.get(`/analytics/healthcare/exam-types/?${queryParams.toString()}`);
    return response.data;
  },

  // Get demographic analysis
  getDemographics: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.group_by) queryParams.append('group_by', params.group_by);

    const response = await api.get(`/analytics/healthcare/demographics/?${queryParams.toString()}`);
    return response.data;
  },

  // Get revenue analytics
  getRevenue: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.group_by) queryParams.append('group_by', params.group_by);

    const response = await api.get(`/analytics/healthcare/revenue/?${queryParams.toString()}`);
    return response.data;
  },

  // Get dashboard summary stats
  getDashboardStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const response = await api.get(`/analytics/healthcare/dashboard-stats/?${queryParams.toString()}`);
    return response.data;
  },

  // Get activity indicators (consultations, patients, medical acts, wait times, revenue)
  getActivityIndicators: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const response = await api.get(`/analytics/healthcare/activity-indicators/?${queryParams.toString()}`);
    return response.data;
  }
};

export default healthcareAnalyticsAPI;
