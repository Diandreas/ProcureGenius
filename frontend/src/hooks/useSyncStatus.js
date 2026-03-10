import { useState, useEffect } from 'react';
import { usePWA } from './usePWA';
import { syncEngine } from '../services/syncEngine';

/**
 * Hook exposant l'état de synchronisation offline.
 * Returns: { isOffline, isSyncing }
 */
export function useSyncStatus() {
  const { isOffline } = usePWA();
  const [isSyncing, setIsSyncing] = useState(syncEngine.isSyncing);

  useEffect(() => {
    const handleSyncStatus = (event) => {
      setIsSyncing(event.detail?.isSyncing ?? false);
    };

    window.addEventListener('sync-status-changed', handleSyncStatus);
    return () => window.removeEventListener('sync-status-changed', handleSyncStatus);
  }, []);

  return { isOffline, isSyncing };
}
