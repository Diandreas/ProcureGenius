// Base de donnees locale SQLite (app native) pour le mode hors-ligne.
// Phase 1 : cache de lecture. Tables generiques extensibles (Phase 2/3 :
// table `mutations` pour la file de synchro).
//
// Web : pas de SQLite -> les fonctions no-op (offline = natif uniquement).

import { isNativePlatform } from '../../utils/platform';

const DB_NAME = 'procura_offline';
const DB_VERSION = 1;

let sqlite = null;        // connexion plugin
let db = null;            // handle base
let initPromise = null;   // garde-fou init unique

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
`;

/** Initialise la base (idempotent). Retourne true si la base est prete. */
export async function initOfflineDb() {
  if (!isNativePlatform()) return false;
  if (db) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
    sqlite = new SQLiteConnection(CapacitorSQLite);

    // Reutilise une connexion existante si presente (hot reload, navigation).
    const retCC = (await sqlite.checkConnectionsConsistency()).result;
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
    if (retCC && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    }
    await db.open();
    await db.execute(SCHEMA);
    return true;
  })().catch((e) => {
    console.warn('[offline] init DB echouee:', e?.message || e);
    db = null;
    return false;
  });

  return initPromise;
}

/** Handle base ; null si indisponible (web ou erreur). */
export async function getDb() {
  const ok = await initOfflineDb();
  return ok ? db : null;
}
