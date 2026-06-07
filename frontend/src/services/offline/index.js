// Point d'entree du module hors-ligne + helpers d'interception pour les thunks.

import { isNativePlatform } from '../../utils/platform';
import { cacheList, readList, cacheOne, readOne, getLastSync } from './cache';
import { initOfflineDb, getDb } from './db';
import { enqueueMutation, newUuid, pendingCount } from './mutationQueue';

export { initOfflineDb, cacheList, readList, cacheOne, readOne, getLastSync };
export { newUuid, pendingCount } from './mutationQueue';

// Supprime un enregistrement du cache local (ex. delete offline).
async function removeFromCache(entity, id) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.run('DELETE FROM cache WHERE entity = ? AND id = ?;', [entity, String(id)]);
  } catch { /* ignore */ }
}

/** Vrai si on est hors-ligne (navigateur). */
export const isOffline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

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
    return { results: items, count: items.length, __offline: true };
  }

  try {
    const res = await apiCall();
    if (native) {
      const items = pick(res.data);
      if (Array.isArray(items)) cacheList(entity, items); // fire-and-forget
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
export async function createWithQueue(entity, data, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    const id = data.id || newUuid();
    const record = { ...data, id, _offline: true, _pending: 'create', updated_at: new Date().toISOString() };
    await cacheOne(entity, record);
    await enqueueMutation({ entity, op: 'create', recordId: id, payload: record });
    return record;
  }

  const res = await apiCall(data);
  if (native && res?.data) cacheOne(entity, res.data);
  return res.data;
}

/**
 * Mise a jour avec repli hors-ligne.
 * @param {string} entity
 * @param {string|number} id
 * @param {object} data
 * @param {(id,data)=>Promise<any>} apiCall
 */
export async function updateWithQueue(entity, id, data, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    const prev = (await readOne(entity, id)) || {};
    const record = { ...prev, ...data, id, _offline: true, _pending: 'update', updated_at: new Date().toISOString() };
    await cacheOne(entity, record);
    await enqueueMutation({ entity, op: 'update', recordId: id, payload: record });
    return record;
  }

  const res = await apiCall(id, data);
  if (native && res?.data) cacheOne(entity, res.data);
  return res.data;
}

/**
 * Suppression avec repli hors-ligne.
 * @param {string} entity
 * @param {string|number} id
 * @param {(id)=>Promise<any>} apiCall
 */
export async function deleteWithQueue(entity, id, apiCall) {
  const native = isNativePlatform();

  if (native && isOffline()) {
    await removeFromCache(entity, id);
    await enqueueMutation({ entity, op: 'delete', recordId: id, payload: null });
    return id;
  }

  await apiCall(id);
  if (native) await removeFromCache(entity, id);
  return id;
}
