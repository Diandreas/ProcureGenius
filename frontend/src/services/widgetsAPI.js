import api from './api';

const WIDGET_ENDPOINTS = {
    lab_orders_status: '/analytics/healthcare/lab-orders-status/',
};

/**
 * Fetch widget data for a given widget name.
 * @param {string} widgetName - e.g. 'lab_orders_status'
 * @param {object} params     - e.g. { period: 'last_30_days', compare: true }
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getWidgetData(widgetName, params = {}) {
    const endpoint = WIDGET_ENDPOINTS[widgetName];
    if (!endpoint) {
        console.warn(`widgetsAPI: unknown widget "${widgetName}"`);
        return { success: false, data: {} };
    }

    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.compare) queryParams.append('compare', params.compare);

    const response = await api.get(`${endpoint}?${queryParams.toString()}`);
    return response.data;
}

const widgetsAPI = { getWidgetData };
export default widgetsAPI;
