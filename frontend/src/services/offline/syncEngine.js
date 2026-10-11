// Moteur de synchronisation. Rejoue la file des mutations hors ligne vers le
// backend des qu'une connexion est disponible (app native et navigateur).
//
// - Creations : envoyees avec la cle d'idempotence de la mutation, le serveur
//   ne cree jamais de doublon meme si l'envoi est rejoue.
// - Conflits de modification : la derniere ecriture gagne.
// - Un seul onglet synchronise a la fois (navigator.locks).

import {
  clientsAPI, suppliersAPI, productsAPI, invoicesAPI, purchaseOrdersAPI,
} from '../api';
import {
  pendingMutations, removeMutation, markMutationError, pendingCount, failedCount,
  remapRecordId, remapReferences,
} from './mutationQueue';
import { cacheOne } from './cache';
import { getStore } from './store';
import { getOffline, onConnectivityChange } from './connectivity';

// Registre des API par entite.
const API_BY_ENTITY = {
  clients: clientsAPI,
  suppliers: suppliersAPI,
  products: productsAPI,
  invoices: invoicesAPI,
  purchaseOrders: purchaseOrdersAPI,
};

let syncing = false;
const listeners = new Set();

/** S'abonner a l'etat de la file : cb({ pending, failed }). Retourne un desabonnement. */
export function onPendingChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function notifyPending() {
  const [pending, failed] = await Promise.all([pendingCount(), failedCount()]);
  listeners.forEach((cb) => { try { cb(pending, failed); } catch { /* ignore */ } });
  return pending;
}

// Champs locaux / calcules par le serveur, jamais renvoyes.
const stripLocalFields = (payload) => {
  const {
    id: _id, _offline, _pending, _movedTo, created_at, updated_at,
    invoice_number, po_number, // numeros provisoires -> attribues par le serveur
    ...body
  } = payload || {};
  return body;
};

async function applyMutation(m) {
  const api = API_BY_ENTITY[m.entity];
  if (!api) throw new Error(`API inconnue pour ${m.entity}`);

  if (m.op === 'create') {
    const res = await api.create(stripLocalFields(m.payload), { headers: { 'Idempotency-Key': m.mutation_id } });
    const server = res?.data;
    const serverId = server?.id;
    if (serverId != null && String(serverId) !== String(m.record_id)) {
      // L'id provisoire devient un alias vers l'id serveur (liens deja ouverts)
      await cacheOne(m.entity, { id: m.record_id, _movedTo: String(serverId) });
      await remapRecordId(m.entity, m.record_id, serverId);
      await remapReferences(m.record_id, serverId);
    }
    if (server && !server.deleted) await cacheOne(m.entity, server);
  } else if (m.op === 'update') {
    const res = await api.update(m.record_id, stripLocalFields(m.payload));
    if (res?.data) await cacheOne(m.entity, res.data);
  } else if (m.op === 'delete') {
    try {
      await api.delete(m.record_id);
    } catch (e) {
      if (e?.response?.status !== 404) throw e; // deja supprime : rien a faire
    }
  } else if (m.op === 'settle') {
    // Encaissement au comptant d'une facture creee hors ligne : on paie le reste du
    // (relu sur le serveur, donc jamais deux fois).
    const { data } = await invoicesAPI.getPayments(m.record_id);
    const due = Number(data?.balance_due || 0);
    if (due > 0) {
      await invoicesAPI.addPayment(m.record_id, {
        amount: due,
        payment_date: m.payload?.payment_date || new Date().toISOString().split('T')[0],
        payment_method: m.payload?.payment_method || 'cash',
      });
    }
    const fresh = await invoicesAPI.get(m.record_id);
    if (fresh?.data) await cacheOne('invoices', fresh.data);
  }
}

async function runQueue() {
  const tried = new Set();
  for (;;) {
    // Relue a chaque tour : les remplacements d'id du tour precedent y sont deja.
    const m = (await pendingMutations()).find((x) => !tried.has(x.mutation_id));
    if (!m) break;
    tried.add(m.mutation_id);
    try {
      await applyMutation(m);
      await removeMutation(m.mutation_id);
      await notifyPending();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) break; // session expiree : on reessaiera
      if (status && status >= 400 && status < 500) {
        // Erreur applicative : on la garde (visible) et on continue
        await markMutationError(m, e?.response?.data ? JSON.stringify(e.response.data) : e.message);
        await notifyPending();
        continue;
      }
      break; // reseau / 5xx : on arrete la passe
    }
  }
}

/**
 * Synchronise la file. A appeler au retour reseau / au pull-to-refresh.
 * Retourne le nombre de mutations restantes.
 */
export async function syncNow() {
  if (syncing || getOffline() || !(await getStore())) return pendingCount();
  if ((await pendingCount()) === 0) return notifyPending();
  syncing = true;
  try {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      await navigator.locks.request('procura-offline-sync', { ifAvailable: true }, async (lock) => {
        if (lock) await runQueue();
      });
    } else {
      await runQueue();
    }
    return await notifyPending();
  } finally {
    syncing = false;
  }
}

let started = false;

/** Branche la synchro auto au retour du reseau (appele une fois au demarrage). */
export function startSyncEngine() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Le callback est aussi appele tout de suite avec l'etat courant -> tentative
  // initiale au lancement si on est en ligne.
  onConnectivityChange((online) => { if (online) syncNow(); });
  window.addEventListener('online', () => { syncNow(); });
  // Filet de securite : nouvel essai toutes les 2 minutes s'il reste des envois
  setInterval(() => { syncNow(); }, 120000);
  notifyPending();
}
