// Moteur de synchronisation (Phase 2). Rejoue la file des mutations
// hors-ligne vers le backend des qu'une connexion est disponible.
//
// Conflits : strategie simple last-write-wins (la mutation locale ecrase le
// serveur). Les UUID generes cote client evitent les collisions d'identifiants.

import { isNativePlatform } from '../../utils/platform';
import {
  clientsAPI, suppliersAPI, productsAPI, invoicesAPI, purchaseOrdersAPI,
} from '../api';
import { pendingMutations, removeMutation, markMutationError, pendingCount, remapRecordId } from './mutationQueue';
import { cacheOne } from './cache';
import { getDb } from './db';
import { getOffline, onConnectivityChange } from './connectivity';

// Supprime un enregistrement du cache (ex. id provisoire remplace par le serveur).
async function removeCached(entity, id) {
  const db = await getDb();
  if (!db) return;
  try { await db.run('DELETE FROM cache WHERE entity = ? AND id = ?;', [entity, String(id)]); }
  catch { /* ignore */ }
}

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

// Champs locaux / read-only a ne jamais renvoyer au serveur.
const stripLocalFields = (payload) => {
  const {
    id: _id, _offline, _pending,
    invoice_number, po_number, // numeros provisoires -> generes par le serveur
    ...body
  } = payload || {};
  return body;
};

// idMap : remplacements "id provisoire -> id serveur" decides pendant CETTE
// passe (la liste des mutations a ete lue avant ; le remap persiste en base
// via remapRecordId ne suffit pas pour les elements deja en memoire).
async function applyMutation(m, idMap) {
  const api = API_BY_ENTITY[m.entity];
  if (!api) throw new Error(`API inconnue pour ${m.entity}`);

  const recordId = idMap.get(`${m.entity}:${m.record_id}`) || m.record_id;

  if (m.op === 'create') {
    // Le backend genere lui-meme id, invoice_number, po_number : on les retire
    // du payload, puis on remplace l'enregistrement local provisoire par la
    // version serveur (evite les doublons).
    const res = await api.create(stripLocalFields(m.payload));
    await removeCached(m.entity, m.record_id);       // retire l'id provisoire
    if (res?.data) await cacheOne(m.entity, res.data); // ajoute la version serveur
    // Les update/delete en file qui visent encore l'UUID provisoire doivent
    // viser l'id serveur, sinon 404 et modification perdue.
    const serverId = res?.data?.id;
    if (serverId != null && String(serverId) !== String(m.record_id)) {
      idMap.set(`${m.entity}:${m.record_id}`, String(serverId));
      await remapRecordId(m.entity, m.record_id, serverId);
    }
  } else if (m.op === 'update') {
    const res = await api.update(recordId, stripLocalFields(m.payload));
    if (res?.data) await cacheOne(m.entity, res.data);
  } else if (m.op === 'delete') {
    await api.delete(recordId);
  }
}

/**
 * Synchronise la file. A appeler au retour reseau / au pull-to-refresh.
 * Retourne le nombre de mutations restantes.
 */
export async function syncNow() {
  if (!isNativePlatform()) return 0;
  if (syncing) return await pendingCount();
  // Etat de connectivite reel (ping backend), pas navigator.onLine qui ment.
  if (getOffline()) return await pendingCount();

  syncing = true;
  try {
    const idMap = new Map(); // id provisoire -> id serveur (portee : cette passe)
    const list = await pendingMutations();
    for (const m of list) {
      try {
        await applyMutation(m, idMap);
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
  // Sync des que la connectivite REELLE revient (ping backend, couvre le cas
  // "wifi sans internet" ou l'evenement window 'online' ne se declenche pas).
  // Le callback est aussi appele immediatement avec l'etat courant -> tentative
  // initiale au lancement si on est en ligne.
  onConnectivityChange((online) => { if (online) syncNow(); });
  // Ceinture-bretelles : l'evenement navigateur classique.
  window.addEventListener('online', () => { syncNow(); });
  // Met a jour l'indicateur au demarrage.
  notifyPending();
}
