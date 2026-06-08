// Point d'entree du module hors-ligne + helpers d'interception pour les thunks.

import { isNativePlatform } from '../../utils/platform';
import { cacheList, readList, cacheOne, readOne, getLastSync } from './cache';
import { initOfflineDb, getDb } from './db';
import { enqueueMutation, newUuid, pendingCount } from './mutationQueue';
import { getOffline } from './connectivity';

export { initOfflineDb, cacheList, readList, cacheOne, readOne, getLastSync };
export { newUuid, pendingCount } from './mutationQueue';
export { getOnline, getOffline, onConnectivityChange, checkConnectivity, startConnectivityWatch } from './connectivity';

// Supprime un enregistrement du cache local (ex. delete offline).
async function removeFromCache(entity, id) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.run('DELETE FROM cache WHERE entity = ? AND id = ?;', [entity, String(id)]);
  } catch { /* ignore */ }
}

/** Vrai si on est hors-ligne. Detection fiable (ping backend), pas seulement
 *  navigator.onLine qui ment sur certains appareils (wifi sans internet, etc.). */
export const isOffline = () => getOffline();

/**
 * Lecture d'une LISTE avec repli hors-ligne.
 * - online : execute `apiCall()`, met le resultat en cache, le retourne.
 * - offline (ou erreur reseau en natif) : retourne la liste cachee.
 *
 * @param {string} entity       cle de cache (ex. 'clients')
 * @param {() => Promise<any>} apiCall  appel API renvoyant {data}
 * @param {(data:any)=>any[]} pick  extrait le tableau d'items de la reponse
 * @returns {Promise<any>} la reponse d'origine (online) ou un objet { results }
 */
export async function readListWithCache(entity, apiCall, pick = (d) => d?.results || d) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    const items = await readList(entity);
    console.log(`[offline] OFFLINE read ${entity}: ${items.length} en cache`);
    return { results: items, count: items.length, __offline: true };
  }

  try {
    const res = await apiCall();
    if (native) {
      const items = pick(res.data);
      console.log(`[offline] ONLINE ${entity}: ${Array.isArray(items) ? items.length : 'non-array'} a cacher`);
      if (Array.isArray(items)) await cacheList(entity, items);
    }
    return res.data;
  } catch (e) {
    // En natif, repli sur le cache si le reseau echoue.
    if (native) {
      const items = await readList(entity);
      if (items.length) return { results: items, count: items.length, __offline: true };
    }
    throw e;
  }
}

/**
 * Lecture d'un DETAIL avec repli hors-ligne.
 * @param {string} entity
 * @param {string|number} id
 * @param {() => Promise<any>} apiCall
 */
export async function readOneWithCache(entity, id, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    return await readOne(entity, id);
  }
  try {
    const res = await apiCall();
    if (native && res?.data) cacheOne(entity, res.data);
    return res.data;
  } catch (e) {
    if (native) {
      const cached = await readOne(entity, id);
      if (cached) return cached;
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// ECRITURE avec file hors-ligne (Phase 2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Creation avec repli hors-ligne.
 * - online : appelle l'API, met le resultat en cache, le retourne.
 * - offline (natif) : genere un UUID client, ecrit l'objet en cache (visible
 *   immediatement, marque _offline), empile une mutation 'create'.
 *
 * @param {string} entity
 * @param {object} data        corps de creation
 * @param {(d)=>Promise<any>} apiCall  fonction (data) -> {data}
 */
// Vrai si l'erreur est un probleme reseau (pas une erreur applicative 4xx).
// Couvre le cas "wifi sans internet" : navigator.onLine ment, l'appel jette.
const isNetworkError = (e) => {
  if (!e) return false;
  if (e.response) return false;            // le serveur a repondu (4xx/5xx applicatif)
  const msg = (e.message || '').toLowerCase();
  return e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED'
    || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout');
};

async function queueCreate(entity, data) {
  const id = data.id || newUuid();
  const record = { ...data, id, _offline: true, _pending: 'create', updated_at: new Date().toISOString() };
  await cacheOne(entity, record);
  await enqueueMutation({ entity, op: 'create', recordId: id, payload: record });
  return record;
}

export async function createWithQueue(entity, data, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    return await queueCreate(entity, data);
  }

  try {
    const res = await apiCall(data);
    if (native && res?.data) cacheOne(entity, res.data);
    return res.data;
  } catch (e) {
    // Wifi sans internet : on bascule en file offline plutot que d'echouer.
    if (native && isNetworkError(e)) {
      return await queueCreate(entity, data);
    }
    throw e;
  }
}

/**
 * Mise a jour avec repli hors-ligne.
 * @param {string} entity
 * @param {string|number} id
 * @param {object} data
 * @param {(id,data)=>Promise<any>} apiCall
 */
async function queueUpdate(entity, id, data) {
  const prev = (await readOne(entity, id)) || {};
  const record = { ...prev, ...data, id, _offline: true, _pending: 'update', updated_at: new Date().toISOString() };
  await cacheOne(entity, record);
  await enqueueMutation({ entity, op: 'update', recordId: id, payload: record });
  return record;
}

export async function updateWithQueue(entity, id, data, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    return await queueUpdate(entity, id, data);
  }

  try {
    const res = await apiCall(id, data);
    if (native && res?.data) cacheOne(entity, res.data);
    return res.data;
  } catch (e) {
    if (native && isNetworkError(e)) {
      return await queueUpdate(entity, id, data);
    }
    throw e;
  }
}

/**
 * Suppression avec repli hors-ligne.
 * @param {string} entity
 * @param {string|number} id
 * @param {(id)=>Promise<any>} apiCall
 */
async function queueDelete(entity, id) {
  await removeFromCache(entity, id);
  await enqueueMutation({ entity, op: 'delete', recordId: id, payload: null });
  return id;
}

export async function deleteWithQueue(entity, id, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    return await queueDelete(entity, id);
  }

  try {
    await apiCall(id);
    if (native) await removeFromCache(entity, id);
    return id;
  } catch (e) {
    if (native && isNetworkError(e)) {
      return await queueDelete(entity, id);
    }
    throw e;
  }
}
