import Dexie from 'dexie';

// Base de données IndexedDB via Dexie
// Persiste les opérations offline et le cache de lecture entre les sessions
const db = new Dexie('ProcureGeniusOfflineDB');

db.version(1).stores({
  // File d'attente de synchronisation
  // groupId + sequenceOrder gèrent les chaînes d'opérations dépendantes
  syncQueue: '++id, tempId, groupId, sequenceOrder, status, createdAt, entityType',
  // Résolution tempId → realId (pour les dépendances entre opérations)
  idMap: 'tempId',
  // Cache de lecture (GET)
  readCache: 'cacheKey',
});

export { db };

// Utilitaires UUID simples
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─────────────────────────────────────────────
// SYNC QUEUE
// ─────────────────────────────────────────────

/**
 * Enregistre un groupe d'opérations liées dans la file.
 * @param {Array} operations - tableau d'objets opération (voir buildConsultationGroup)
 */
export async function enqueueGroup(operations) {
  if (!operations || operations.length === 0) return;
  await db.syncQueue.bulkAdd(operations);
}

/**
 * Récupère les groupId uniques qui ont au moins 1 item pending, triés par createdAt ASC.
 */
export async function getPendingGroups() {
  const pendingRows = await db.syncQueue
    .where('status')
    .equals('pending')
    .toArray();
  // Tri par createdAt puis déduplique les groupId
  pendingRows.sort((a, b) => a.createdAt - b.createdAt);
  const seen = new Set();
  const groups = [];
  for (const row of pendingRows) {
    if (!seen.has(row.groupId)) {
      seen.add(row.groupId);
      groups.push(row.groupId);
    }
  }
  return groups;
}

/**
 * Récupère toutes les opérations d'un groupe, triées par sequenceOrder.
 */
export async function getGroupRows(groupId) {
  const rows = await db.syncQueue.where('groupId').equals(groupId).toArray();
  rows.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  return rows;
}

export async function getPendingCount() {
  return db.syncQueue.where('status').anyOf(['pending', 'processing']).count();
}

export async function markRowDone(id) {
  await db.syncQueue.update(id, { status: 'done' });
}

export async function markRowFailed(id, errorMsg) {
  await db.syncQueue.update(id, { status: 'failed', error: errorMsg });
}

export async function markRowProcessing(id) {
  await db.syncQueue.update(id, { status: 'processing' });
}

export async function incrementRetry(id, retryCount, maxRetries) {
  if (retryCount + 1 >= maxRetries) {
    await db.syncQueue.update(id, { status: 'failed', retryCount: retryCount + 1, error: 'Nombre maximum de tentatives atteint' });
  } else {
    await db.syncQueue.update(id, { status: 'pending', retryCount: retryCount + 1 });
  }
}

// ─────────────────────────────────────────────
// ID MAP (résolution tempId → realId)
// ─────────────────────────────────────────────

export async function storeIdMap(tempId, realId) {
  await db.idMap.put({ tempId, realId, resolvedAt: Date.now() });
}

export async function getIdMap(tempId) {
  const entry = await db.idMap.get(tempId);
  return entry ? entry.realId : null;
}

// ─────────────────────────────────────────────
// READ CACHE
// ─────────────────────────────────────────────

export async function storeReadCache(cacheKey, data, ttlSeconds = 300) {
  await db.readCache.put({ cacheKey, data, cachedAt: Date.now(), ttl: ttlSeconds * 1000 });
}

export async function getReadCache(cacheKey) {
  const entry = await db.readCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttl) {
    await db.readCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

/**
 * Supprime les entrées du cache dont la clé commence par un préfixe donné.
 * Utile après une sync réussie pour invalider les listes.
 */
export async function invalidateCache(prefix) {
  const keys = await db.readCache
    .filter((entry) => entry.cacheKey.startsWith(prefix))
    .primaryKeys();
  await db.readCache.bulkDelete(keys);
}

// ─────────────────────────────────────────────
// BUILDERS DE GROUPES D'OPÉRATIONS
// ─────────────────────────────────────────────

/**
 * Construit le groupe d'opérations pour un handleSubmit de consultation.
 * Gère la chaîne : consultation → prescription → complete.
 *
 * @param {Object} params
 * @param {boolean} params.isNew - nouvelle consultation ou mise à jour
 * @param {string|number} params.id - ID existant (si mise à jour)
 * @param {Object} params.payload - corps de la requête consultation
 * @param {Array}  params.medications - liste de médicaments
 * @param {string} params.statusArg - 'in_consultation' | 'completed'
 */
export function buildConsultationGroup({ isNew, id, payload, medications = [], statusArg = 'in_consultation' }) {
  const groupId = generateUUID();
  const consTempId = generateUUID();
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Token ${token}` } : {};
  const createdAt = Date.now();
  const ops = [];

  // Étape 0 : créer ou mettre à jour la consultation
  if (isNew) {
    ops.push({
      tempId: consTempId,
      groupId,
      sequenceOrder: 0,
      method: 'POST',
      url: '/healthcare/consultations/',
      data: payload,
      headers,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      dependsOnTempId: null,
      urlTemplate: null,
      idPlaceholder: null,
      entityType: 'consultation',
      createdAt,
      error: null,
    });
  } else {
    ops.push({
      tempId: consTempId,
      groupId,
      sequenceOrder: 0,
      method: 'PATCH',
      url: `/healthcare/consultations/${id}/`,
      data: payload,
      headers,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      dependsOnTempId: null,
      urlTemplate: null,
      idPlaceholder: null,
      entityType: 'consultation',
      createdAt,
      error: null,
    });
  }

  // Étape 1 (optionnelle) : créer la prescription
  if (medications.length > 0) {
    const prescTempId = generateUUID();
    const prescData = {
      patient_id: payload.patient,
      consultation_id: `{${consTempId}}`,  // sera résolu par syncEngine
      items: medications.map(m => ({
        ...(m.is_external
          ? { medication_name: m.medication_name, medication_id: null }
          : { medication_id: m.medication?.id, medication_name: m.medication?.name }),
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        quantity_prescribed: parseInt(m.quantity) || 1,
      })),
    };
    ops.push({
      tempId: prescTempId,
      groupId,
      sequenceOrder: 1,
      method: 'POST',
      url: '/healthcare/consultations/prescriptions/create/',
      data: prescData,
      headers,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      dependsOnTempId: consTempId,
      urlTemplate: null,
      idPlaceholder: `{${consTempId}}`,
      entityType: 'prescription',
      createdAt,
      error: null,
    });
  }

  // Étape 2 (optionnelle) : terminer la consultation
  if (statusArg === 'completed') {
    const complTempId = generateUUID();
    const urlTemplate = isNew
      ? `/healthcare/consultations/{${consTempId}}/complete/`
      : `/healthcare/consultations/${id}/complete/`;
    ops.push({
      tempId: complTempId,
      groupId,
      sequenceOrder: 2,
      method: 'POST',
      url: isNew ? null : `/healthcare/consultations/${id}/complete/`,
      data: {},
      headers,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      dependsOnTempId: isNew ? consTempId : null,
      urlTemplate: isNew ? urlTemplate : null,
      idPlaceholder: isNew ? `{${consTempId}}` : null,
      entityType: 'complete',
      createdAt,
      error: null,
    });
  }

  return ops;
}

/**
 * Construit le groupe d'opérations pour un ordre de laboratoire.
 * Opération unique : POST /laboratory/orders/
 *
 * @param {Object} params
 * @param {Object} params.payload - corps de la requête (patient_id, tests_data, priority, etc.)
 */
export function buildLabOrderGroup({ payload }) {
  const groupId = generateUUID();
  const labTempId = generateUUID();
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Token ${token}` } : {};
  const createdAt = Date.now();

  return [{
    tempId: labTempId,
    groupId,
    sequenceOrder: 0,
    method: 'POST',
    url: '/healthcare/laboratory/orders/create/',
    data: payload,
    headers,
    status: 'pending',
    retryCount: 0,
    maxRetries: 5,
    dependsOnTempId: null,
    urlTemplate: null,
    idPlaceholder: null,
    entityType: 'labOrder',
    createdAt,
    error: null,
  }];
}

/**
 * Construit le groupe pour la saisie de résultats d'un ordre labo existant.
 * POST /healthcare/laboratory/orders/{id}/results/
 *
 * @param {Object} params
 * @param {string|number} params.orderId - ID de l'ordre existant (serveur)
 * @param {Object} params.resultsData - { results: [...], biologist_diagnosis: '' }
 */
export function buildLabResultsGroup({ orderId, resultsData }) {
  const groupId = generateUUID();
  const resTempId = generateUUID();
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Token ${token}` } : {};
  const createdAt = Date.now();

  return [{
    tempId: resTempId,
    groupId,
    sequenceOrder: 0,
    method: 'POST',
    url: `/healthcare/laboratory/orders/${orderId}/results/`,
    data: resultsData,
    headers,
    status: 'pending',
    retryCount: 0,
    maxRetries: 5,
    dependsOnTempId: null,
    urlTemplate: null,
    idPlaceholder: null,
    entityType: 'labResults',
    createdAt,
    error: null,
  }];
}

/**
 * Construit le groupe d'opérations pour une facture.
 *
 * @param {Object} params
 * @param {boolean} params.isNew
 * @param {string|number} params.id - ID existant
 * @param {Object} params.payload - corps de la requête facture
 */
export function buildInvoiceGroup({ isNew, id, payload }) {
  const groupId = generateUUID();
  const invTempId = generateUUID();
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Token ${token}` } : {};
  const createdAt = Date.now();

  return [{
    tempId: invTempId,
    groupId,
    sequenceOrder: 0,
    method: isNew ? 'POST' : 'PATCH',
    url: isNew ? '/invoices/' : `/invoices/${id}/`,
    data: payload,
    headers,
    status: 'pending',
    retryCount: 0,
    maxRetries: 5,
    dependsOnTempId: null,
    urlTemplate: null,
    idPlaceholder: null,
    entityType: 'invoice',
    createdAt,
    error: null,
  }];
}
