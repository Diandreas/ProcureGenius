/**
 * Subscription API Service
 * Handles all subscription-related API calls
 */
import api from './api';

const subscriptionAPI = {
  /**
   * Get all available subscription plans (public endpoint)
   */
  getPlans: async () => {
    const response = await api.get('/subscriptions/plans/');
    return response.data;
  },

  /**
   * Get current subscription status including quotas and features
   */
  getStatus: async () => {
    const response = await api.get('/subscriptions/status/');
    return response.data;
  },

  /**
   * Get quota status only (lighter endpoint)
   */
  getQuotas: async () => {
    const response = await api.get('/subscriptions/quotas/');
    return response.data;
  },

  /**
   * Subscribe to a plan
   * @param {Object} data - Subscription data
   * @param {string} data.plan_code - Plan code (free, standard, premium)
   * @param {string} data.billing_period - Billing period (monthly, yearly)
   * @param {string} data.payment_method - Payment method (paypal, credit_card, etc.)
   * @param {string} data.paypal_subscription_id - PayPal subscription ID (optional)
   */
  subscribe: async (data) => {
    const response = await api.post('/subscriptions/subscribe/', data);
    return response.data;
  },

  /**
   * Change subscription plan
   * @param {Object} data - Change plan data
   * @param {string} data.new_plan_code - New plan code
   * @param {string} data.billing_period - Billing period (optional)
   * @param {boolean} data.immediately - Change immediately or at end of period
   */
  changePlan: async (data) => {
    const response = await api.post('/subscriptions/change-plan/', data);
    return response.data;
  },

  /**
   * Cancel subscription
   * @param {Object} data - Cancellation data
   * @param {boolean} data.immediately - Cancel immediately or at end of period
   * @param {string} data.reason - Cancellation reason (optional)
   */
  cancel: async (data) => {
    const response = await api.post('/subscriptions/cancel/', data);
    return response.data;
  },

  /**
   * Get payment history
   */
  getPaymentHistory: async () => {
    const response = await api.get('/subscriptions/payments/');
    return response.data;
  },

  /**
   * Check if organization has access to a specific feature
   * @param {string} featureName - Feature name (ai_assistant, e_sourcing, etc.)
   */
  checkFeatureAccess: async (featureName) => {
    const response = await api.get(`/subscriptions/features/${featureName}/`);
    return response.data;
  },
};

export default subscriptionAPI;
