import api from './api';

/**
 * Widgets API Service
 * Handles all widget and dashboard layout operations
 */

// ========== WIDGETS ==========

/**
 * Get all available widgets (grouped by module)
 */
export const getAvailableWidgets = async () => {
  try {
    const response = await api.get('/analytics/widgets/');
    return response.data;
  } catch (error) {
    console.error('Error fetching available widgets:', error);
    throw error;
  }
};

/**
 * Get widgets for a specific module
 */
export const getWidgetsByModule = async (module) => {
  try {
    const response = await api.get('/analytics/widgets/', {
      params: { module }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching widgets for module ${module}:`, error);
    throw error;
  }
};

/**
 * Get data for a specific widget
 * @param {string} widgetCode - The widget code (e.g., 'financial_summary')
 * @param {object} params - Query parameters (period, start_date, end_date, limit, compare)
 */
export const getWidgetData = async (widgetCode, params = {}) => {
  try {
    const response = await api.get(`/analytics/widget-data/${widgetCode}/`, {
      params: {
        period: params.period || 'last_30_days',
        limit: params.limit || 10,
        compare: params.compare !== undefined ? params.compare : false,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data for widget ${widgetCode}:`, error);
    throw error;
  }
};

// ========== DASHBOARD LAYOUTS ==========

/**
 * Get all dashboard layouts for current user
 */
export const getLayouts = async () => {
  try {
    const response = await api.get('/analytics/layouts/');
    return response.data;
  } catch (error) {
    console.error('Error fetching layouts:', error);
    throw error;
  }
};

/**
 * Get the default dashboard layout
 */
export const getDefaultLayout = async () => {
  try {
    const response = await api.get('/analytics/layouts/default/');
    return response.data;
  } catch (error) {
    console.error('Error fetching default layout:', error);
    throw error;
  }
};

/**
 * Get a specific layout by ID
 */
export const getLayout = async (layoutId) => {
  try {
    const response = await api.get(`/analytics/layouts/${layoutId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching layout ${layoutId}:`, error);
    throw error;
  }
};

/**
 * Create a new dashboard layout
 * @param {object} layoutData - { name, description, layout: [...], global_config: {}, is_default }
 */
export const createLayout = async (layoutData) => {
  try {
    const response = await api.post('/analytics/layouts/', layoutData);
    return response.data;
  } catch (error) {
    console.error('Error creating layout:', error);
    throw error;
  }
};

/**
 * Update an existing layout
 */
export const updateLayout = async (layoutId, layoutData) => {
  try {
    const response = await api.put(`/analytics/layouts/${layoutId}/`, layoutData);
    return response.data;
  } catch (error) {
    console.error(`Error updating layout ${layoutId}:`, error);
    throw error;
  }
};

/**
 * Partially update a layout (PATCH)
 */
export const patchLayout = async (layoutId, layoutData) => {
  try {
    const response = await api.patch(`/analytics/layouts/${layoutId}/`, layoutData);
    return response.data;
  } catch (error) {
    console.error(`Error patching layout ${layoutId}:`, error);
    throw error;
  }
};

/**
 * Delete a layout
 */
export const deleteLayout = async (layoutId) => {
  try {
    const response = await api.delete(`/analytics/layouts/${layoutId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting layout ${layoutId}:`, error);
    throw error;
  }
};

/**
 * Set a layout as default
 */
export const setDefaultLayout = async (layoutId) => {
  try {
    const response = await api.post(`/analytics/layouts/${layoutId}/set_default/`);
    return response.data;
  } catch (error) {
    console.error(`Error setting layout ${layoutId} as default:`, error);
    throw error;
  }
};

/**
 * Duplicate a layout
 */
export const duplicateLayout = async (layoutId) => {
  try {
    const response = await api.post(`/analytics/layouts/${layoutId}/duplicate/`);
    return response.data;
  } catch (error) {
    console.error(`Error duplicating layout ${layoutId}:`, error);
    throw error;
  }
};

// ========== DASHBOARD STATS (existing) ==========

/**
 * Get dashboard stats (reusing existing endpoint)
 */
export const getDashboardStats = async (params = {}) => {
  try {
    const response = await api.get('/analytics/stats/', {
      params: {
        period: params.period || 'last_30_days',
        compare: params.compare !== undefined ? params.compare : true,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

export default {
  getAvailableWidgets,
  getWidgetsByModule,
  getWidgetData,
  getLayouts,
  getDefaultLayout,
  getLayout,
  createLayout,
  updateLayout,
  patchLayout,
  deleteLayout,
  setDefaultLayout,
  duplicateLayout,
  getDashboardStats
};
