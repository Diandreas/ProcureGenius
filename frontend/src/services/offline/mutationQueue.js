// File des mutations hors ligne. Chaque creation/modification/suppression
// faite sans reseau est empilee ici, puis rejouee par le syncEngine au retour
// du reseau. L'identifiant de la mutation sert aussi de cle d'idempotence
// cote serveur : une creation rejouee deux fois ne cree jamais de doublon.

import { getStore } from './store';

// Genere un UUID v4.
export const newUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const OPEN = ['pending', 'error'];

// Au-dela de ce nombre d'echecs applicatifs (4xx), la mutation passe en
// 'failed' : plus retentee, mais toujours visible pour l'utilisateur.
export const MAX_ATTEMPTS = 5;

/** Empile une mutation. op: 'create'|'update'|'delete'|'settle'. */
export async function enqueueMutation({ entity, op, recordId, payload, mutationId }) {
  const store = await getStore();
  if (!store) return null;
  const id = mutationId || newUuid();
  try {
    await store.mutAdd({
      mutation_id: id, entity, op, record_id: String(recordId),
      payload: payload || null, created_at: new Date().toISOString(),
    });
    return id;
  } catch (e) {
    console.warn('[offline] enqueueMutation', e?.message || e);
    return null;
  }
}

/** Liste les mutations en attente (ordre chronologique). */
export async function pendingMutations() {
  const store = await getStore();
  if (!store) return [];
  try { return await store.mutList(OPEN); } catch { return []; }
}

/** Mutations abandonnees apres trop d'echecs (a montrer a l'utilisateur). */
export async function failedMutations() {
  const store = await getStore();
  if (!store) return [];
  try { return await store.mutList(['failed']); } catch { return []; }
}

/** Nombre de mutations en attente (pour l'indicateur UI). */
export async function pendingCount() {
  const store = await getStore();
  if (!store) return 0;
  try { return await store.mutCount(OPEN); } catch { return 0; }
}

/** Nombre de mutations abandonnees. */
export async function failedCount() {
  const store = await getStore();
  if (!store) return 0;
  try { return await store.mutCount(['failed']); } catch { return 0; }
}

/** Supprime une mutation (synchro reussie, ou abandon choisi par l'utilisateur). */
export async function removeMutation(mutationId) {
  const store = await getStore();
  if (!store) return;
  try { await store.mutDel([mutationId]); } catch (e) { console.warn('[offline] removeMutation', e?.message || e); }
}

/** Remet une mutation abandonnee dans la file. */
export async function retryMutation(mutationId) {
  const store = await getStore();
  if (!store) return;
  try { await store.mutPatch(mutationId, { status: 'pending', attempts: 0 }); } catch { /* ignore */ }
}

/** Marque une mutation en erreur (incremente attempts, 'failed' au-dela du max). */
export async function markMutationError(m, message) {
  const store = await getStore();
  if (!store) return;
  const attempts = (m.attempts || 0) + 1;
  try {
    await store.mutPatch(m.mutation_id, {
      attempts,
      last_error: String(message || '').slice(0, 500),
      status: attempts >= MAX_ATTEMPTS ? 'failed' : 'error',
    });
  } catch { /* ignore */ }
}

/**
 * Reecrit l'id d'un enregistrement dans les mutations en attente.
 * Cas : un create hors ligne (UUID provisoire) vient d'etre synchronise, le
 * serveur a attribue un autre id -> les update/delete/settle en file qui
 * visaient l'UUID provisoire doivent viser l'id serveur.
 */
export async function remapRecordId(entity, oldId, newId) {
  const store = await getStore();
  if (!store) return;
  try {
    for (const m of await store.mutForRecord(entity, oldId)) {
      const payload = m.payload ? { ...m.payload, id: newId } : null;
      await store.mutPatch(m.mutation_id, { record_id: String(newId), payload });
    }
  } catch (e) {
    console.warn('[offline] remapRecordId', e?.message || e);
  }
}

/**
 * Si un create est encore en attente pour cet enregistrement (jamais vu par le
 * serveur), annule toutes ses mutations et retourne true.
 */
export async function cancelPendingCreate(entity, recordId) {
  const store = await getStore();
  if (!store) return false;
  try {
    const list = (await store.mutForRecord(entity, recordId)).filter((m) => m.status !== 'failed' || m.op === 'create');
    if (!list.some((m) => m.op === 'create')) return false;
    await store.mutDel(list.map((m) => m.mutation_id));
    return true;
  } catch {
    return false;
  }
}

// Remplace partout une valeur d'id (UUID, donc sans ambiguite) dans un objet.
const swapId = (value, oldId, newId) => {
  if (value === oldId) return newId;
  if (Array.isArray(value)) return value.map((v) => swapId(v, oldId, newId));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swapId(v, oldId, newId)]));
  }
  return value;
};

/**
 * Apres la synchro d'un create : les autres mutations qui y font reference
 * (ex. facture hors ligne pour un client cree hors ligne) visent l'id serveur.
 */
export async function remapReferences(oldId, newId) {
  const store = await getStore();
  if (!store) return;
  const from = String(oldId);
  const to = String(newId);
  try {
    for (const m of await store.mutList(['pending', 'error', 'failed'])) {
      if (!m.payload || !JSON.stringify(m.payload).includes(from)) continue;
      await store.mutPatch(m.mutation_id, { payload: swapId(m.payload, from, to) });
    }
  } catch (e) {
    console.warn('[offline] remapReferences', e?.message || e);
  }
}
