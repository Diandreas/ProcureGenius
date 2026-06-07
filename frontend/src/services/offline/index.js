// Point d'entree du module hors-ligne + helpers d'interception pour les thunks.

import { isNativePlatform } from '../../utils/platform';
import { cacheList, readList, cacheOne, readOne, getLastSync } from './cache';
import { initOfflineDb } from './db';

export { initOfflineDb, cacheList, readList, cacheOne, readOne, getLastSync };

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
