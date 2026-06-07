// File des mutations hors-ligne (Phase 2). Chaque creation/modification/
// suppression faite sans reseau est empilee ici, puis rejouee par le
// syncEngine au retour du reseau.

import { getDb } from './db';

// Genere un UUID v4 (dispo nativement dans la webview Capacitor).
export const newUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Repli simple si randomUUID absent.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Empile une mutation. op: 'create'|'update'|'delete'. */
export async function enqueueMutation({ entity, op, recordId, payload }) {
  const db = await getDb();
  if (!db) return null;
  const id = newUuid();
  try {
    await db.run(
      `INSERT INTO mutations (mutation_id, entity, op, record_id, payload, status, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?);`,
      [id, entity, op, String(recordId), payload ? JSON.stringify(payload) : null, new Date().toISOString()]
    );
    return id;
  } catch (e) {
    console.warn('[offline] enqueueMutation', e?.message || e);
    return null;
  }
}

/** Liste les mutations en attente (ordre chronologique). */
export async function pendingMutations() {
  const db = await getDb();
  if (!db) return [];
  try {
    const res = await db.query(
      `SELECT * FROM mutations WHERE status != 'done' ORDER BY created_at ASC;`
    );
    return (res.values || []).map((r) => ({
      ...r,
      payload: r.payload ? JSON.parse(r.payload) : null,
    }));
  } catch (e) {
    console.warn('[offline] pendingMutations', e?.message || e);
    return [];
  }
}

/** Nombre de mutations en attente (pour l'indicateur UI). */
export async function pendingCount() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const res = await db.query(`SELECT COUNT(*) AS n FROM mutations WHERE status != 'done';`);
    return (res.values || [])[0]?.n || 0;
  } catch {
    return 0;
  }
}

/** Supprime une mutation (synchro reussie). */
export async function removeMutation(mutationId) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.run('DELETE FROM mutations WHERE mutation_id = ?;', [mutationId]);
  } catch (e) {
    console.warn('[offline] removeMutation', e?.message || e);
  }
}

/** Marque une mutation en erreur (incremente attempts). */
export async function markMutationError(mutationId, message) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.run(
      `UPDATE mutations SET status='error', attempts=attempts+1, last_error=? WHERE mutation_id=?;`,
      [String(message || '').slice(0, 500), mutationId]
    );
  } catch { /* ignore */ }
}
