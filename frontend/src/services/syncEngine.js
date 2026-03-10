import axios from 'axios';
import {
  db,
  getPendingGroups,
  getGroupRows,
  storeIdMap,
  getIdMap,
  markRowDone,
  markRowFailed,
  markRowProcessing,
  incrementRetry,
  invalidateCache,
} from '../db/offlineDb';

const API_BASE_URL = (() => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  return backendUrl ? `${backendUrl}/api/v1` : '/api/v1';
})();

// Correspondance entityType → préfixe de cache à invalider après sync
const CACHE_PREFIXES = {
  consultation: '/healthcare/consultations',
  prescription: '/healthcare/consultations/prescriptions',
  complete: '/healthcare/consultations',
  invoice: '/invoices',
  labOrder: '/laboratory/orders',
};

// ─────────────────────────────────────────────
// Helper : est-ce une erreur réseau ?
// ─────────────────────────────────────────────
export function isOfflineError(error) {
  return (
    !error.response &&
    (error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      error.code === 'ECONNABORTED')
  );
}

// ─────────────────────────────────────────────
// Résolution des dépendances tempId → URL/data réels
// ─────────────────────────────────────────────
async function resolveRow(row) {
  let { url, data } = row;

  if (!row.dependsOnTempId) {
    return { url, data };
  }

  const realId = await getIdMap(row.dependsOnTempId);
  if (realId === null) {
    return null; // parent pas encore synchronisé
  }

  const placeholder = row.idPlaceholder; // ex: "{uuid-123}"

  // Résoudre l'URL via urlTemplate si disponible
  if (row.urlTemplate) {
    url = row.urlTemplate.replace(placeholder, realId);
  }

  // Résoudre les placeholders dans le body (JSON)
  if (data && placeholder) {
    const dataStr = JSON.stringify(data).replaceAll(placeholder, String(realId));
    data = JSON.parse(dataStr);
  }

  return { url, data };
}

// ─────────────────────────────────────────────
// Traitement d'un groupe séquentiellement
// ─────────────────────────────────────────────
async function processGroup(groupId) {
  const rows = await getGroupRows(groupId);
  const doneEntities = new Set();

  for (const row of rows) {
    if (row.status === 'done') continue;

    // Résoudre les dépendances
    const resolved = await resolveRow(row);
    if (resolved === null) {
      // Parent pas encore sync → arrêt du groupe, on réessaiera au prochain cycle
      break;
    }

    const { url, data } = resolved;

    await markRowProcessing(row.id);

    try {
      const response = await axios({
        method: row.method,
        url: `${API_BASE_URL}${url}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...row.headers,
        },
      });

      // Stocker le realId si la réponse contient un id
      if (response.data && response.data.id !== undefined) {
        await storeIdMap(row.tempId, response.data.id);
      }

      await markRowDone(row.id);
      doneEntities.add(row.entityType);
    } catch (error) {
      if (isOfflineError(error)) {
        // Erreur réseau → réessayer plus tard
        await incrementRetry(row.id, row.retryCount, row.maxRetries);
        break; // arrêt du groupe
      }

      // Erreur HTTP (4xx/5xx) → last-write-wins : on réessaie quand même pour 5xx
      if (error.response && error.response.status >= 500) {
        await incrementRetry(row.id, row.retryCount, row.maxRetries);
        break;
      }

      // 4xx (sauf 409 conflict) → erreur permanente
      const errMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      await markRowFailed(row.id, errMsg);
      break; // arrêt du groupe, les étapes suivantes ne peuvent pas s'exécuter
    }
  }

  // Invalider le cache pour les entités synchronisées avec succès
  for (const entityType of doneEntities) {
    const prefix = CACHE_PREFIXES[entityType];
    if (prefix) {
      await invalidateCache(prefix);
    }
  }
}

// ─────────────────────────────────────────────
// Moteur de synchronisation principal
// ─────────────────────────────────────────────
let _isSyncing = false;

export const syncEngine = {
  get isSyncing() {
    return _isSyncing;
  },

  async sync() {
    if (_isSyncing) return;
    if (!navigator.onLine) return;

    _isSyncing = true;
    dispatchSyncEvent(true);

    try {
      const pendingGroups = await getPendingGroups();

      for (const groupId of pendingGroups) {
        if (!navigator.onLine) break;
        await processGroup(groupId);
      }

      // Notifier les composants (ConsultationList) de rafraîchir leurs données
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
    } catch (error) {
      console.error('[SyncEngine] Erreur de synchronisation:', error);
    } finally {
      _isSyncing = false;
      dispatchSyncEvent(false);
    }
  },
};

function dispatchSyncEvent(isSyncing) {
  window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { isSyncing } }));
}

// Synchronisation périodique toutes les 30s quand en ligne
let _syncInterval = null;

export function startPeriodicSync() {
  if (_syncInterval) return;
  _syncInterval = setInterval(() => {
    if (navigator.onLine) {
      syncEngine.sync();
    }
  }, 30000);
}

export function stopPeriodicSync() {
  if (_syncInterval) {
    clearInterval(_syncInterval);
    _syncInterval = null;
  }
}
