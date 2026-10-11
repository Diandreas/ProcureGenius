// Base de donnees locale SQLite (app native) pour le mode hors-ligne.
// Phase 1 : cache de lecture. Tables generiques extensibles (Phase 2/3 :
// table `mutations` pour la file de synchro).
//
// Web : pas de SQLite (le navigateur utilise IndexedDB, voir store.js).
// Une base par utilisateur : deux comptes sur le meme telephone ne voient
// jamais les donnees l'un de l'autre.

import { isNativePlatform } from '../../utils/platform';

const DB_NAME = 'procura_offline';
const DB_VERSION = 2;

let sqlite = null;        // connexion plugin
let db = null;            // handle base ouverte
let dbName = null;        // nom de la base ouverte
let initPromise = null;   // garde-fou init unique (par nom)

// Schema initial : un cache generique (une ligne par enregistrement d'entite)
// + une table de meta (date de derniere synchro par entite).
const SCHEMA = `
CREATE TABLE IF NOT EXISTS cache (
  entity     TEXT NOT NULL,
  id         TEXT NOT NULL,
  payload    TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (entity, id)
);
CREATE INDEX IF NOT EXISTS idx_cache_entity ON cache (entity);

CREATE TABLE IF NOT EXISTS sync_meta (
  entity        TEXT PRIMARY KEY,
  last_sync_at  TEXT
);

-- File des mutations faites hors-ligne, a rejouer au retour du reseau.
CREATE TABLE IF NOT EXISTS mutations (
  mutation_id TEXT PRIMARY KEY,   -- uuid de la mutation
  entity      TEXT NOT NULL,      -- 'clients', 'products', ...
  op          TEXT NOT NULL,      -- 'create' | 'update' | 'delete'
  record_id   TEXT NOT NULL,      -- uuid de l'enregistrement vise
  payload     TEXT,               -- JSON du corps (create/update)
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | error
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mutations_status ON mutations (status, created_at);
`;

/** Initialise la base de l'utilisateur (idempotent). Retourne true si la base est prete. */
export async function initOfflineDb(scope) {
  if (!isNativePlatform()) return false;
  if (!scope) return false;
  const name = `${DB_NAME}_${scope}`;
  if (db && dbName === name) return true;
  if (initPromise && initPromise.name === name) return initPromise.promise;

  const promise = (async () => {
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
    if (!sqlite) sqlite = new SQLiteConnection(CapacitorSQLite);
    // Changement d'utilisateur : on ferme la base du precedent
    if (db && dbName !== name) {
      try { await sqlite.closeConnection(dbName, false); } catch { /* ignore */ }
      db = null;
    }
    // Reutilise une connexion existante si presente (hot reload, navigation).
    const retCC = (await sqlite.checkConnectionsConsistency()).result;
    const isConn = (await sqlite.isConnection(name, false)).result;
    const conn = (retCC && isConn)
      ? await sqlite.retrieveConnection(name, false)
      : await sqlite.createConnection(name, false, 'no-encryption', DB_VERSION, false);
    await conn.open();
    await conn.execute(SCHEMA);
    db = conn;
    dbName = name;
    return true;
  })().catch((e) => {
    console.warn('[offline] init DB echouee:', e?.message || e);
    db = null;
    dbName = null;
    return false;
  }).finally(() => { initPromise = null; });

  initPromise = { name, promise };
  return promise;
}

/** Handle base de l'utilisateur ; null si indisponible (web ou erreur). */
export async function getDb(scope) {
  const ok = await initOfflineDb(scope);
  return ok ? db : null;
}
