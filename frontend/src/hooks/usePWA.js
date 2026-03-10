import { useState, useEffect } from 'react';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Écouter les changements de connexion
    const handleOnline = () => {
      setIsOffline(false);
      // Déclencher la synchronisation des données en attente
      import('../services/syncEngine').then(({ syncEngine, startPeriodicSync }) => {
        syncEngine.sync();
        startPeriodicSync();
      });
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les messages du Service Worker (ex: TRIGGER_SYNC depuis background sync)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'TRIGGER_SYNC') {
        import('../services/syncEngine').then(({ syncEngine }) => syncEngine.sync());
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Démarrer la sync périodique si déjà en ligne
    if (navigator.onLine) {
      import('../services/syncEngine').then(({ syncEngine, startPeriodicSync }) => {
        syncEngine.sync();
        startPeriodicSync();
      });
    }

    // Enregistrer le Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker enregistré:', registration);

          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
              }
            });
          });
        })
        .catch((error) => {
          console.error('Erreur Service Worker:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      import('../services/syncEngine').then(({ stopPeriodicSync }) => stopPeriodicSync());
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  const updatePWA = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOffline,
    installPWA,
    updatePWA,
  };
}