import { useEffect } from 'react';

/**
 * Hook that listens for 'module-data-changed' events and triggers a callback
 * when the specified module has new data.
 *
 * @param {string} moduleId - The module to listen for (e.g. 'consultations', 'laboratory')
 * @param {Function} fetchCallback - Function to call when new data is detected
 */
export default function useAutoRefresh(moduleId, fetchCallback) {
  useEffect(() => {
    if (!moduleId || !fetchCallback) return;

    const handler = (event) => {
      if (event.detail?.moduleId === moduleId) {
        fetchCallback();
      }
    };

    window.addEventListener('module-data-changed', handler);
    return () => window.removeEventListener('module-data-changed', handler);
  }, [moduleId, fetchCallback]);
}
