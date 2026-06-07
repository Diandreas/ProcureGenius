// Moteur de synchronisation (Phase 2). Rejoue la file des mutations
// hors-ligne vers le backend des qu'une connexion est disponible.
//
// Conflits : strategie simple last-write-wins (la mutation locale ecrase le
// serveur). Les UUID generes cote client evitent les collisions d'identifiants.

import { isNativePlatform } from '../../utils/platform';
import {
  clientsAPI, suppliersAPI, productsAPI, invoicesAPI, purchaseOrdersAPI,
} from '../api';
import { pendingMutations, removeMutation, markMutationError, pendingCount } from './mutationQueue';
import { cacheOne } from './cache';

// Registre des API par entite : map op -> appel reseau.
const API_BY_ENTITY = {
  clients: clientsAPI,
  suppliers: suppliersAPI,
  products: productsAPI,
  invoices: invoicesAPI,
  purchaseOrders: purchaseOrdersAPI,
};

let syncing = false;
const listeners = new Set();

/** S'abonner au nombre de mutations en attente (retourne un desabonnement). */
export function onPendingChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function notifyPending() {
  const n = await pendingCount();
  listeners.forEach((cb) => { try { cb(n); } catch { /* ignore */ } });
  return n;
}

async function applyMutation(m) {
  const api = API_BY_ENTITY[m.entity];
  if (!api) throw new Error(`API inconnue pour ${m.entity}`);

  if (m.op === 'create') {
    // On envoie le payload (avec son UUID). Le backend (UUID PK) l'accepte.
    const res = await api.create(m.payload);
    if (res?.data) await cacheOne(m.entity, res.data); // remplace par la version serveur
  } else if (m.op === 'update') {
    const res = await api.update(m.record_id, m.payload);
    if (res?.data) await cacheOne(m.entity, res.data);
  } else if (m.op === 'delete') {
    await api.delete(m.record_id);
  }
}

/**
 * Synchronise la file. A appeler au retour reseau / au pull-to-refresh.
 * Retourne le nombre de mutations restantes.
 */
export async function syncNow() {
  if (!isNativePlatform()) return 0;
  if (syncing) return await pendingCount();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return await pendingCount();
  }

  syncing = true;
  try {
    const list = await pendingMutations();
    for (const m of list) {
      try {
        await applyMutation(m);
        await removeMutation(m.mutation_id);
        await notifyPending();
      } catch (e) {
        // Erreur reseau : on arrete (on reessaiera au prochain passage).
        // Erreur applicative (4xx) : on marque en erreur et on continue.
        const status = e?.response?.status;
        if (status && status >= 400 && status < 500) {
          await markMutationError(m.mutation_id, e?.response?.data ? JSON.stringify(e.response.data) : e.message);
          continue;
        }
        break; // reseau / 5xx : on stoppe la passe
      }
    }
    return await notifyPending();
  } finally {
    syncing = false;
  }
}

let started = false;

/** Branche la synchro auto au retour du reseau (appele une fois au demarrage). */
export function startSyncEngine() {
  if (!isNativePlatform() || started) return;
  started = true;
  // Sync au retour de connexion.
  window.addEventListener('online', () => { syncNow(); });
  // Tentative initiale (au cas ou des mutations sont en attente au lancement).
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    setTimeout(() => syncNow(), 3000);
  }
  // Met a jour l'indicateur au demarrage.
  notifyPending();
}
