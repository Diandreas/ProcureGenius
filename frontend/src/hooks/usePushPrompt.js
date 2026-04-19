/**
 * usePushPrompt — Demande la permission push au bon moment.
 *
 * Règle : on demande APRÈS que l'utilisateur a créé sa première facture
 * (localStorage flag 'push_permission_asked' absent + 'first_invoice_created' présent).
 * On ne demande jamais au login ni à l'ouverture de l'app.
 */
import { useEffect } from 'react';
import usePushNotifications from './usePushNotifications';

export default function usePushPrompt() {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!isSupported) return;
    if (permission === 'granted' && isSubscribed) return;
    if (permission === 'denied') return;
    if (localStorage.getItem('push_permission_asked')) return;

    const trySubscribe = async () => {
      localStorage.setItem('push_permission_asked', 'true');
      await subscribe();
    };

    // Écouter l'événement émis après création d'une facture
    const handler = () => trySubscribe();
    window.addEventListener('first-invoice-created', handler);

    // Aussi écouter si l'utilisateur revient J+2 sans avoir activé
    const daysSinceSignup = () => {
      const signupDate = localStorage.getItem('signup_date');
      if (!signupDate) return 0;
      return (Date.now() - parseInt(signupDate)) / (1000 * 60 * 60 * 24);
    };

    if (daysSinceSignup() >= 2 && localStorage.getItem('first_invoice_created')) {
      trySubscribe();
    }

    return () => window.removeEventListener('first-invoice-created', handler);
  }, [isSupported, permission, isSubscribed, subscribe]);
}
