import api from './api';

export const analyticsAPI = {
  /**
   * Get dashboard statistics
   * @param params - period, compare, start_date, end_date
   */
  getStats: (params: {
    period?: string;
    compare?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return api.get('/api/analytics/stats/', { params });
  },

  /**
   * Export dashboard stats as PDF
   * @param params - period, compare, start_date, end_date
   */
  exportPDF: (params: {
    period?: string;
    compare?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return api.get('/api/analytics/export/pdf/', {
      params,
      responseType: 'blob',
    });
  },

  /**
   * Export dashboard stats as Excel
   * @param params - period, compare, start_date, end_date
   */
  exportExcel: (params: {
    period?: string;
    compare?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return api.get('/api/analytics/export/excel/', {
      params,
      responseType: 'blob',
    });
  },
};

export default analyticsAPI;
