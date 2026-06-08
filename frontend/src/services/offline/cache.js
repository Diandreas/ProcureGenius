// Cache de lecture hors-ligne (Phase 1). S'appuie sur la base SQLite locale.
// online : on appelle l'API puis on met en cache ; offline : on lit le cache.
// Web : no-op (les fonctions retournent des valeurs neutres).

import { getDb } from './db';

/** Remplace le cache d'une entite (liste complete). */
export async function cacheList(entity, items) {
  if (!Array.isArray(items)) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute('BEGIN TRANSACTION;');
    await db.run('DELETE FROM cache WHERE entity = ?;', [entity]);
    for (const it of items) {
      const id = String(it?.id ?? it?.pk ?? '');
      if (!id) continue;
      await db.run(
        'INSERT OR REPLACE INTO cache (entity, id, payload, updated_at) VALUES (?, ?, ?, ?);',
        [entity, id, JSON.stringify(it), it?.updated_at || null]
      );
    }
    await db.run(
      'INSERT OR REPLACE INTO sync_meta (entity, last_sync_at) VALUES (?, ?);',
      [entity, new Date().toISOString()]
    );
    await db.execute('COMMIT;');
    console.log(`[offline] cacheList OK ${entity}: ${items.length} ecrits`);
  } catch (e) {
    try { await db.execute('ROLLBACK;'); } catch { /* ignore */ }
    console.warn('[offline] cacheList ERREUR', entity, e?.message || e);
  }
}

/** Met en cache un seul enregistrement (ex. vue detail). */
export async function cacheOne(entity, item) {
  const db = await getDb();
  if (!db || !item) return;
  const id = String(item?.id ?? item?.pk ?? '');
  if (!id) return;
  try {
    await db.run(
      'INSERT OR REPLACE INTO cache (entity, id, payload, updated_at) VALUES (?, ?, ?, ?);',
      [entity, id, JSON.stringify(item), item?.updated_at || null]
    );
  } catch (e) {
    console.warn('[offline] cacheOne', entity, e?.message || e);
  }
}

/** Lit la liste cachee d'une entite (tableau, vide si rien). */
export async function readList(entity) {
  const db = await getDb();
  if (!db) return [];
  try {
    const res = await db.query('SELECT payload FROM cache WHERE entity = ?;', [entity]);
    return (res.values || []).map((r) => JSON.parse(r.payload));
  } catch (e) {
    console.warn('[offline] readList', entity, e?.message || e);
    return [];
  }
}

/** Lit un enregistrement cache par id (ou null). */
export async function readOne(entity, id) {
  const db = await getDb();
  if (!db) return null;
  try {
    const res = await db.query(
      'SELECT payload FROM cache WHERE entity = ? AND id = ?;',
      [entity, String(id)]
    );
    const row = (res.values || [])[0];
    return row ? JSON.parse(row.payload) : null;
  } catch (e) {
    console.warn('[offline] readOne', entity, e?.message || e);
    return null;
  }
}

/** Date ISO de derniere synchro d'une entite (ou null). */
export async function getLastSync(entity) {
  const db = await getDb();
  if (!db) return null;
  try {
    const res = await db.query('SELECT last_sync_at FROM sync_meta WHERE entity = ?;', [entity]);
    return (res.values || [])[0]?.last_sync_at || null;
  } catch {
    return null;
  }
}
