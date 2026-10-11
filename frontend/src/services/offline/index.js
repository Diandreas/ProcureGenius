// Point d'entree du module hors ligne + helpers utilises par les slices et
// les formulaires. Fonctionne dans l'app native (SQLite) et dans le
// navigateur (IndexedDB) : voir store.js.

import { cacheList, readList, cacheOne, readOne, getLastSync, removeFromCache } from './cache';
import { initOfflineDb } from './db';
import { getStore } from './store';
import { enqueueMutation, newUuid, cancelPendingCreate } from './mutationQueue';
import { getOffline } from './connectivity';

export { initOfflineDb, cacheList, readList, cacheOne, readOne, getLastSync };
export { newUuid, pendingCount } from './mutationQueue';
export { getOnline, getOffline, onConnectivityChange, checkConnectivity, startConnectivityWatch } from './connectivity';

/** Vrai si on est hors ligne. Detection fiable (ping backend), pas seulement
 *  navigator.onLine qui ment sur certains appareils (wifi sans internet, etc.). */
export const isOffline = () => getOffline();

/** Vrai si l'enregistrement n'existe encore que sur cet appareil. */
export const isLocalOnly = (record) => Boolean(record?._offline);

// Vrai si l'erreur vient du reseau ou d'un serveur injoignable, et non d'une
// erreur applicative (4xx). Couvre le cas « wifi sans internet ».
export const isNetworkError = (e) => {
  if (!e) return false;
  const st = e.response?.status;
  if (st) return st === 502 || st === 503 || st === 504;
  const msg = (e.message || '').toLowerCase();
  return e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED'
    || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout');
};

const PAGING_PARAMS = ['page', 'page_size', 'ordering'];
const isFiltered = (params) => Object.entries(params || {})
  .some(([k, v]) => !PAGING_PARAMS.includes(k) && v !== '' && v != null);

// Les alias (id provisoire -> id serveur) ne sont pas des enregistrements.
const visible = (items) => items.filter((it) => !it._movedTo);

const offlineList = (items) => ({ results: items, count: items.length, __offline: true });

// Recherche simple dans le cache (hors ligne, les filtres serveur ne sont pas dispo).
const searchLocal = (items, params) => {
  const q = String(params?.search || '').trim().toLowerCase();
  return q ? items.filter((it) => JSON.stringify(it).toLowerCase().includes(q)) : items;
};

// ─────────────────────────────────────────────────────────────────────────
// LECTURE avec cache
// ─────────────────────────────────────────────────────────────────────────

/**
 * Lecture d'une LISTE avec repli hors ligne.
 * - en ligne : appelle l'API, met le resultat en cache, le retourne (avec, en
 *   tete, ce qui a ete cree sur cet appareil et pas encore synchronise) ;
 * - hors ligne, ou reseau en echec : retourne la liste cachee.
 *
 * @param {string} entity       cle de cache (ex. 'clients')
 * @param {() => Promise<any>} apiCall  appel API renvoyant {data}
 * @param {(data:any)=>any[]} pick  extrait le tableau d'items de la reponse
 * @param {{params?: object}} opts  parametres de l'appel (filtres, page)
 */
export async function readListWithCache(entity, apiCall, pick = (d) => d?.results || d, opts = {}) {
  if (isOffline()) return offlineList(searchLocal(visible(await readList(entity)), opts.params));

  try {
    const res = await apiCall();
    const items = pick(res.data);
    if (!Array.isArray(items)) return res.data;
    const filtered = isFiltered(opts.params);
    const complete = !filtered && Array.isArray(res.data) || (!filtered && !res.data?.next && !res.data?.previous);
    cacheList(entity, items, { complete });
    if (filtered || opts.params?.page > 1) return res.data;
    // Ajoute les creations locales pas encore synchronisees
    const known = new Set(items.map((it) => String(it.id)));
    const local = visible(await readList(entity)).filter((it) => it._pending === 'create' && !known.has(String(it.id)));
    if (!local.length) return res.data;
    if (Array.isArray(res.data)) return [...local, ...res.data];
    return { ...res.data, results: [...local, ...items], count: (res.data.count || items.length) + local.length };
  } catch (e) {
    if (isNetworkError(e)) {
      const items = searchLocal(visible(await readList(entity)), opts.params);
      if (items.length) return offlineList(items);
    }
    throw e;
  }
}

// Suit un alias laisse par la synchro (id provisoire remplace par l'id serveur).
async function resolveId(entity, id) {
  const cached = await readOne(entity, id);
  return cached?._movedTo || id;
}

/**
 * Lecture d'un DETAIL avec repli hors ligne.
 * @param {string} entity
 * @param {string|number} id
 * @param {(id) => Promise<any>} apiCall  recoit l'id (eventuellement remplace par l'id serveur)
 */
export async function readOneWithCache(entity, id, apiCall) {
  const realId = await resolveId(entity, id);
  const cached = await readOne(entity, realId);
  if (isOffline() || cached?._pending === 'create') {
    if (cached) return cached;
    if (isOffline()) throw Object.assign(new Error('Pas disponible hors ligne'), { code: 'ERR_NETWORK', offline: true });
  }
  try {
    const res = await apiCall(realId);
    if (res?.data) cacheOne(entity, res.data);
    return res.data;
  } catch (e) {
    if (isNetworkError(e) && cached) return cached;
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// ECRITURE avec file hors ligne
// ─────────────────────────────────────────────────────────────────────────

// Pour l'affichage local : le client / fournisseur reference par son id est
// remplace par sa fiche en cache (le serveur, lui, recoit toujours l'id).
const LINKS = { invoices: ['client', 'clients'], purchaseOrders: ['supplier', 'suppliers'] };
async function forDisplay(entity, record) {
  const link = LINKS[entity];
  if (!link) return record;
  const [field, linked] = link;
  const ref = record[field];
  if (!ref || typeof ref === 'object') return record;
  const full = await readOne(linked, ref);
  return full ? { ...record, [field]: full, [`${field}_name`]: full.name } : record;
}

async function queueCreate(entity, data, key) {
  const id = data.id || newUuid();
  const now = new Date().toISOString();
  const record = { ...data, id, _offline: true, _pending: 'create', created_at: now, updated_at: now };
  const shown = await forDisplay(entity, record);
  await cacheOne(entity, shown);
  await enqueueMutation({ entity, op: 'create', recordId: id, payload: record, mutationId: key });
  return shown;
}

/**
 * Creation avec repli hors ligne.
 * - en ligne : appelle l'API (avec une cle d'idempotence), met en cache ;
 * - hors ligne, ou reseau coupe pendant l'envoi : l'objet est enregistre sur
 *   l'appareil (marque _offline) et la creation part a la synchro. La meme cle
 *   est reutilisee : si le serveur avait recu la premiere tentative, il ne
 *   cree pas de doublon.
 *
 * @param {string} entity
 * @param {object} data        corps de creation
 * @param {(d, config)=>Promise<any>} apiCall  (data, config axios) -> {data}
 */
export async function createWithQueue(entity, data, apiCall) {
  const key = newUuid();
  if (!(await getStore())) {
    const res = await apiCall(data, { headers: { 'Idempotency-Key': key } });
    return res.data;
  }
  if (isOffline()) return queueCreate(entity, data, key);
  try {
    const res = await apiCall(data, { headers: { 'Idempotency-Key': key } });
    if (res?.data) cacheOne(entity, res.data);
    return res.data;
  } catch (e) {
    if (isNetworkError(e)) return queueCreate(entity, data, key);
    throw e;
  }
}

async function queueUpdate(entity, id, data) {
  const store = await getStore();
  const prev = (await readOne(entity, id)) || {};
  const record = await forDisplay(entity, { ...prev, ...data, id, _offline: true, _pending: prev._pending || 'update', updated_at: new Date().toISOString() });
  await cacheOne(entity, record);
  // Enregistrement cree hors ligne et pas encore envoye : on complete sa creation
  const create = (await store.mutForRecord(entity, id)).find((m) => m.op === 'create' && m.status !== 'failed');
  if (create) {
    await store.mutPatch(create.mutation_id, { payload: { ...create.payload, ...data, id } });
  } else {
    await enqueueMutation({ entity, op: 'update', recordId: id, payload: { ...data, id } });
  }
  return record;
}

/**
 * Mise a jour avec repli hors ligne. Seuls les champs modifies partent au serveur.
 * @param {(id, data)=>Promise<any>} apiCall
 */
export async function updateWithQueue(entity, id, data, apiCall) {
  const store = await getStore();
  const cached = store ? await readOne(entity, id) : null;
  if (store && (isOffline() || cached?._pending === 'create')) return queueUpdate(entity, id, data);
  try {
    const res = await apiCall(id, data);
    if (store && res?.data) cacheOne(entity, res.data);
    return res.data;
  } catch (e) {
    if (store && isNetworkError(e)) return queueUpdate(entity, id, data);
    throw e;
  }
}

async function queueDelete(entity, id) {
  await removeFromCache(entity, id);
  // Cree hors ligne et jamais synchronise : annuler sa creation suffit.
  const localOnly = await cancelPendingCreate(entity, id);
  if (!localOnly) await enqueueMutation({ entity, op: 'delete', recordId: id, payload: null });
  return id;
}

/** Suppression avec repli hors ligne. */
export async function deleteWithQueue(entity, id, apiCall) {
  const store = await getStore();
  const cached = store ? await readOne(entity, id) : null;
  if (store && (isOffline() || cached?._pending === 'create')) return queueDelete(entity, id);
  try {
    await apiCall(id);
    if (store) await removeFromCache(entity, id);
    return id;
  } catch (e) {
    if (store && isNetworkError(e)) return queueDelete(entity, id);
    throw e;
  }
}

/**
 * Facture encaissee au comptant pendant qu'on est hors ligne : a la synchro,
 * on enregistre le paiement du reste a payer (rien si deja reglee).
 */
export async function queueSettleInvoice(invoiceId, { payment_date, payment_method }) {
  return enqueueMutation({ entity: 'invoices', op: 'settle', recordId: invoiceId, payload: { payment_date, payment_method } });
}
