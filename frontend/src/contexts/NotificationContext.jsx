import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const NotificationContext = createContext({
  counts: null,
  getModuleCount: () => 0,
  hasNewItems: () => false,
});

export const useNotification = () => useContext(NotificationContext);

const POLL_INTERVAL = 20000; // 20 seconds

const MODULE_MESSAGES = {
  'laboratory.pending': 'Nouveau prelevement en attente au laboratoire',
  'consultations.waiting': 'Nouveau patient en salle d\'attente',
  'pharmacy.pending': 'Nouvelle dispensation en attente',
  'reception.waiting': 'Nouveau patient a la reception',
};

function getCountValue(counts, path) {
  const [module, key] = path.split('.');
  return counts?.[module]?.[key] || 0;
}

function sendDesktopNotification(message) {
  if (Notification.permission === 'granted') {
    try {
      new Notification('ProcureGenius', {
        body: message,
        icon: '/main.png',
        tag: message, // prevent duplicates
      });
    } catch (e) {
      // Silent fail (e.g. in non-secure context)
    }
  }
}

export function NotificationProvider({ children }) {
  const [counts, setCounts] = useState(null);
  const previousCountsRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchCounts = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await fetch('/api/v1/core/module-counts/', {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) return;

      const data = await response.json();
      const prev = previousCountsRef.current;

      // Detect increases and fire events / desktop notifications
      if (prev) {
        for (const path of Object.keys(MODULE_MESSAGES)) {
          const oldVal = getCountValue(prev, path);
          const newVal = getCountValue(data, path);
          if (newVal > oldVal) {
            const moduleId = path.split('.')[0];
            window.dispatchEvent(
              new CustomEvent('module-data-changed', { detail: { moduleId } })
            );
            sendDesktopNotification(MODULE_MESSAGES[path]);
          }
        }
      }

      previousCountsRef.current = data;
      setCounts(data);
    } catch (e) {
      // Network error - silently ignore
    }
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Start polling
  useEffect(() => {
    fetchCounts();
    intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchCounts]);

  const getModuleCount = useCallback((moduleId) => {
    if (!counts?.[moduleId]) return 0;
    const moduleData = counts[moduleId];
    // Return the primary "action needed" count
    switch (moduleId) {
      case 'consultations': return moduleData.waiting || 0;
      case 'laboratory': return moduleData.pending || 0;
      case 'pharmacy': return moduleData.pending || 0;
      case 'reception': return moduleData.waiting || 0;
      default: return 0;
    }
  }, [counts]);

  const hasNewItems = useCallback((moduleId) => {
    return getModuleCount(moduleId) > 0;
  }, [getModuleCount]);

  return (
    <NotificationContext.Provider value={{ counts, getModuleCount, hasNewItems }}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
