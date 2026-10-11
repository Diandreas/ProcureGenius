// Cache de lecture hors ligne. En ligne : on appelle l'API puis on met en
// cache ; hors ligne : on lit le cache. Stockage : store.js (SQLite en natif,
// IndexedDB dans le navigateur).

import { getStore } from './store';

const idOf = (it) => String(it?.id ?? it?.pk ?? '');

/**
 * Met en cache une liste recue du serveur (ajout / mise a jour).
 * `complete` : la liste contient TOUS les enregistrements (ni filtre ni page
 * suivante) -> on retire aussi ceux que le serveur n'a plus, sauf ceux crees
 * ou modifies hors ligne et pas encore synchronises.
 */
export async function cacheList(entity, items, { complete = false } = {}) {
  if (!Array.isArray(items)) return;
  const store = await getStore();
  if (!store) return;
  try {
    const valid = items.filter((it) => idOf(it)).map((it) => ({ ...it, id: it.id ?? it.pk }));
    await store.cachePut(entity, valid);
    if (complete) {
      const keep = new Set(valid.map(idOf));
      const gone = (await store.cacheAll(entity)).filter((it) => !keep.has(idOf(it)) && !it._pending).map(idOf);
      if (gone.length) await store.cacheDel(entity, gone);
    }
    await store.metaSet(entity, new Date().toISOString());
  } catch (e) {
    console.warn('[offline] cacheList', entity, e?.message || e);
  }
}

/** Met en cache un seul enregistrement (ex. vue detail). */
export async function cacheOne(entity, item) {
  if (!item || !idOf(item)) return;
  const store = await getStore();
  if (!store) return;
  try {
    await store.cachePut(entity, [{ ...item, id: item.id ?? item.pk }]);
  } catch (e) {
    console.warn('[offline] cacheOne', entity, e?.message || e);
  }
}

/** Lit la liste cachee d'une entite (les plus recents d'abord, vide si rien). */
export async function readList(entity) {
  const store = await getStore();
  if (!store) return [];
  try {
    const items = await store.cacheAll(entity);
    const when = (it) => it.created_at || it.updated_at || '';
    return items.sort((a, b) => (when(a) < when(b) ? 1 : when(a) > when(b) ? -1 : 0));
  } catch (e) {
    console.warn('[offline] readList', entity, e?.message || e);
    return [];
  }
}

/** Lit un enregistrement cache par id (ou null). */
export async function readOne(entity, id) {
  const store = await getStore();
  if (!store) return null;
  try {
    return await store.cacheGet(entity, id);
  } catch (e) {
    console.warn('[offline] readOne', entity, e?.message || e);
    return null;
  }
}

/** Retire un enregistrement du cache. */
export async function removeFromCache(entity, id) {
  const store = await getStore();
  if (!store) return;
  try { await store.cacheDel(entity, [id]); } catch { /* ignore */ }
}

/** Date ISO de derniere synchro d'une entite (ou null). */
export async function getLastSync(entity) {
  const store = await getStore();
  if (!store) return null;
  try { return await store.metaGet(entity); } catch { return null; }
}
