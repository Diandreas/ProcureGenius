// Stockage local du mode hors ligne, derriere une interface unique :
// - app native : SQLite (db.js, inchange) ;
// - navigateur : IndexedDB (Dexie), une base par utilisateur pour ne jamais
//   melanger les donnees de deux comptes sur le meme poste.
//
// Tables : cache (un enregistrement par entite/id), meta (date de derniere
// synchro), mutations (file des ecritures faites hors ligne).

import { isNativePlatform } from '../../utils/platform';
import { getDb } from './db';

const SCOPE_KEY = 'procura_offline_scope';

// ── SQLite (natif) ───────────────────────────────────────────────────────

function sqliteStore(db) {
  const rows = async (sql, values = []) => (await db.query(sql, values)).values || [];
  const parse = (r) => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null });
  return {
    async cachePut(entity, items) {
      if (!items.length) return;
      await db.executeSet(items.map((it) => ({
        statement: 'INSERT OR REPLACE INTO cache (entity, id, payload, updated_at) VALUES (?, ?, ?, ?);',
        values: [entity, String(it.id), JSON.stringify(it), it.updated_at || null],
      })));
    },
    async cacheGet(entity, id) {
      const r = (await rows('SELECT payload FROM cache WHERE entity = ? AND id = ?;', [entity, String(id)]))[0];
      return r ? JSON.parse(r.payload) : null;
    },
    async cacheAll(entity) {
      return (await rows('SELECT payload FROM cache WHERE entity = ?;', [entity])).map((r) => JSON.parse(r.payload));
    },
    async cacheDel(entity, ids) {
      for (const id of ids) await db.run('DELETE FROM cache WHERE entity = ? AND id = ?;', [entity, String(id)]);
    },
    async metaGet(entity) {
      return (await rows('SELECT last_sync_at FROM sync_meta WHERE entity = ?;', [entity]))[0]?.last_sync_at || null;
    },
    async metaSet(entity, iso) {
      await db.run('INSERT OR REPLACE INTO sync_meta (entity, last_sync_at) VALUES (?, ?);', [entity, iso]);
    },
    async mutAdd(m) {
      await db.run(
        `INSERT INTO mutations (mutation_id, entity, op, record_id, payload, status, attempts, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, ?);`,
        [m.mutation_id, m.entity, m.op, m.record_id, m.payload ? JSON.stringify(m.payload) : null, m.created_at],
      );
    },
    async mutList(statuses) {
      const marks = statuses.map(() => '?').join(',');
      return (await rows(`SELECT * FROM mutations WHERE status IN (${marks}) ORDER BY created_at ASC;`, statuses)).map(parse);
    },
    async mutCount(statuses) {
      const marks = statuses.map(() => '?').join(',');
      return (await rows(`SELECT COUNT(*) AS n FROM mutations WHERE status IN (${marks});`, statuses))[0]?.n || 0;
    },
    async mutForRecord(entity, recordId) {
      return (await rows('SELECT * FROM mutations WHERE entity = ? AND record_id = ?;', [entity, String(recordId)])).map(parse);
    },
    async mutPatch(mutationId, fields) {
      const cols = Object.keys(fields);
      const values = cols.map((c) => (c === 'payload' && fields[c] ? JSON.stringify(fields[c]) : fields[c]));
      await db.run(`UPDATE mutations SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE mutation_id = ?;`, [...values, mutationId]);
    },
    async mutDel(ids) {
      for (const id of ids) await db.run('DELETE FROM mutations WHERE mutation_id = ?;', [id]);
    },
    async clear() {
      await db.executeSet([
        { statement: 'DELETE FROM cache;', values: [] },
        { statement: 'DELETE FROM sync_meta;', values: [] },
        { statement: 'DELETE FROM mutations;', values: [] },
      ]);
    },
  };
}

// ── IndexedDB (navigateur) ───────────────────────────────────────────────

function dexieStore(d) {
  return {
    async cachePut(entity, items) {
      if (!items.length) return;
      await d.cache.bulkPut(items.map((it) => ({ entity, id: String(it.id), payload: it })));
    },
    async cacheGet(entity, id) {
      return (await d.cache.get([entity, String(id)]))?.payload || null;
    },
    async cacheAll(entity) {
      return (await d.cache.where('entity').equals(entity).toArray()).map((r) => r.payload);
    },
    async cacheDel(entity, ids) {
      await d.cache.bulkDelete(ids.map((id) => [entity, String(id)]));
    },
    async metaGet(entity) {
      return (await d.meta.get(entity))?.last_sync_at || null;
    },
    async metaSet(entity, iso) {
      await d.meta.put({ entity, last_sync_at: iso });
    },
    async mutAdd(m) {
      await d.mutations.add({ ...m, status: 'pending', attempts: 0, last_error: null });
    },
    async mutList(statuses) {
      return d.mutations.where('status').anyOf(statuses).sortBy('created_at');
    },
    async mutCount(statuses) {
      return d.mutations.where('status').anyOf(statuses).count();
    },
    async mutForRecord(entity, recordId) {
      return d.mutations.where('[entity+record_id]').equals([entity, String(recordId)]).toArray();
    },
    async mutPatch(mutationId, fields) {
      await d.mutations.update(mutationId, fields);
    },
    async mutDel(ids) {
      await d.mutations.bulkDelete(ids);
    },
    async clear() {
      await Promise.all([d.cache.clear(), d.meta.clear(), d.mutations.clear()]);
    },
  };
}

// Identifiant de l'utilisateur connecte (memorise pour fonctionner hors ligne).
async function currentScope() {
  let scope = null;
  try { scope = localStorage.getItem(SCOPE_KEY); } catch { /* stockage bloque */ }
  if (scope) return scope;
  try {
    if (!localStorage.getItem('authToken')) return null;
    const { authAPI } = await import('../api');
    const id = (await authAPI.getProfile())?.data?.id;
    if (!id) return null;
    localStorage.setItem(SCOPE_KEY, String(id));
    return String(id);
  } catch {
    return null;
  }
}

let opened = null; // { scope, store }
let opening = null;

/** Stockage pret a l'emploi, ou null (pas d'utilisateur connu, IndexedDB bloque...). */
export async function getStore() {
  if (isNativePlatform()) {
    if (opened) return opened.store;
    const db = await getDb();
    if (!db) return null;
    opened = { scope: 'native', store: sqliteStore(db) };
    return opened.store;
  }
  if (typeof indexedDB === 'undefined') return null;
  const scope = await currentScope();
  if (!scope) return null;
  if (opened?.scope === scope) return opened.store;
  if (opening?.scope === scope) return opening.promise;
  const promise = (async () => {
    try {
      const { default: Dexie } = await import('dexie');
      const d = new Dexie(`procura_offline_${scope}`);
      d.version(1).stores({
        cache: '[entity+id], entity',
        meta: 'entity',
        mutations: 'mutation_id, status, created_at, [entity+record_id]',
      });
      await d.open();
      opened = { scope, store: dexieStore(d) };
      return opened.store;
    } catch (e) {
      console.warn('[offline] IndexedDB indisponible :', e?.message || e);
      return null;
    } finally {
      opening = null;
    }
  })();
  opening = { scope, promise };
  return promise;
}

/** A la deconnexion : on oublie l'utilisateur (ses donnees restent pour son retour). */
export function forgetOfflineUser() {
  try { localStorage.removeItem(SCOPE_KEY); } catch { /* ignore */ }
  opened = isNativePlatform() ? opened : null;
}

/** Memorise l'utilisateur connecte (appele quand le profil est connu). */
export function rememberOfflineUser(userId) {
  if (!userId) return;
  try { localStorage.setItem(SCOPE_KEY, String(userId)); } catch { /* ignore */ }
}
