/**
 * useSubscription Hook
 * Provides subscription status and checks if user should see ads
 */
import { useState, useEffect } from 'react';
import subscriptionAPI from '../services/subscriptionAPI';

const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const data = await subscriptionAPI.getStatus();
      setSubscription(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err);
      // If user not authenticated or no subscription, assume free plan
      setSubscription({
        subscription: {
          plan: {
            code: 'free',
            name: 'Free'
          }
        },
        features: {
          has_ads: true,
          has_ai_assistant: false,
          has_purchase_orders: false,
          has_suppliers: false,
          has_e_sourcing: false,
          has_contracts: false,
          has_analytics: false,
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const shouldShowAds = () => {
    if (!subscription) return true; // Show ads if subscription data not loaded yet
    return subscription.features?.has_ads === true;
  };

  const hasFeature = (featureName) => {
    if (!subscription) return false;
    return subscription.features?.[`has_${featureName}`] === true;
  };

  const getPlanCode = () => {
    return subscription?.subscription?.plan?.code || 'free';
  };

  const getPlanName = () => {
    return subscription?.subscription?.plan?.name || 'Free';
  };

  const isFreePlan = () => {
    return getPlanCode() === 'free';
  };

  const isPremiumPlan = () => {
    return getPlanCode() === 'premium';
  };

  const canUpgrade = () => {
    const plan = getPlanCode();
    return plan === 'free' || plan === 'standard';
  };

  return {
    subscription,
    loading,
    error,
    shouldShowAds,
    hasFeature,
    getPlanCode,
    getPlanName,
    isFreePlan,
    isPremiumPlan,
    canUpgrade,
    refresh: fetchSubscription,
  };
};

export default useSubscription;
