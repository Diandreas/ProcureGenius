import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../utils/currency';

/**
 * Hook pour gérer la devise de l'organisation
 * Récupère automatiquement la devise depuis les paramètres
 */
export const useCurrency = () => {
  const [currency, setCurrency] = useState('CAD'); // Devise par défaut
  const [loading, setLoading] = useState(true);

  const loadCurrency = useCallback(async () => {
    try {
      const response = await api.get('/accounts/organization/settings/');
      // Support both camelCase and snake_case formats
      const defaultCurrency = response.data.defaultCurrency || response.data.default_currency || 'CAD';
      
      if (defaultCurrency) {
        setCurrency(prevCurrency => {
          if (prevCurrency !== defaultCurrency) {
            console.log('💰 Devise chargée depuis l\'organisation:', defaultCurrency);
            return defaultCurrency;
          }
          return prevCurrency;
        });
      } else {
        console.warn('⚠️ Aucune devise trouvée dans les paramètres, utilisation de CAD par défaut');
        setCurrency('CAD');
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de la devise, utilisation de CAD par défaut:', error);
      setCurrency('CAD');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrency();

    // Écouter les changements de devise depuis les paramètres
    const handleCurrencyChange = () => {
      console.log('🔄 Changement de devise détecté, rechargement...');
      loadCurrency();
    };

    // Écouter l'événement personnalisé pour le changement de devise
    window.addEventListener('currency-changed', handleCurrencyChange);

    // Rafraîchir périodiquement (toutes les 30 secondes) pour s'assurer que la devise est à jour
    const interval = setInterval(() => {
      loadCurrency();
    }, 30000);

    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
      clearInterval(interval);
    };
  }, [loadCurrency]);


  /**
   * Formate un montant avec la devise de l'organisation
   */
  const format = (amount, decimals = 2) => {
    return formatCurrency(amount, currency, decimals);
  };

  /**
   * Formate un montant de manière compacte (K, M)
   */
  const formatCompact = (amount) => {
    return formatCurrencyCompact(amount, currency);
  };

  /**
   * Récupère juste le symbole
   */
  const symbol = getCurrencySymbol(currency);

  return {
    currency,
    symbol,
    format,
    formatCompact,
    loading,
  };
};

export default useCurrency;
