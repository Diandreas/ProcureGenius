/**
 * usePushNotifications — Gère la souscription aux push notifications natives.
 *
 * Usage:
 *   const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PUSH_API_BASE = '/ai/push';

// Convertit une clé base64url en Uint8Array (requis par pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function usePushNotifications() {
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : 'denied'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  // Charger la clé VAPID publique depuis le backend
  useEffect(() => {
    if (!isSupported) return;
    api.get(`${PUSH_API_BASE}/vapid-key/`)
      .then((r) => setVapidPublicKey(r.data.vapid_public_key))
      .catch(() => {});
  }, [isSupported]);

  // Vérifier si déjà souscrit au chargement
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  // Écouter les messages du service worker (navigation après clic sur notif)
  useEffect(() => {
    if (!isSupported) return;
    const handler = (event) => {
      if (event.data?.type === 'PUSH_NAVIGATE' && event.data.url) {
        window.location.href = event.data.url;
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidPublicKey) return false;
    setIsLoading(true);
    try {
      // Demander la permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJson = sub.toJSON();
      await api.post(`${PUSH_API_BASE}/subscribe/`, {
        endpoint: sub.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Erreur souscription push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post(`${PUSH_API_BASE}/unsubscribe/`, { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Erreur désinscription push:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
