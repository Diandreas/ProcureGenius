// Acces aux donnees « compatible hors ligne », avec la meme forme que
// services/api.js (les fonctions renvoient { data }). Les ecrans remplacent
// simplement `invoicesAPI.create(x)` par `offlineData.invoices.create(x)`.
//
// - Lecture : serveur si joignable (et mise en cache), sinon cache local.
// - Ecriture : serveur si joignable, sinon enregistree sur l'appareil et
//   envoyee automatiquement au retour du reseau (sans doublon).

import {
  clientsAPI, suppliersAPI, productsAPI, invoicesAPI, purchaseOrdersAPI,
} from '../api';
import {
  readListWithCache, readOneWithCache, createWithQueue, updateWithQueue, deleteWithQueue, newUuid,
} from './index';

// Numero affiche tant que le serveur n'a pas attribue le definitif.
const provisional = () => `BROUILLON-${newUuid().slice(0, 6).toUpperCase()}`;

function wrap(entity, api, { numberField } = {}) {
  return {
    list: async (params) => ({ data: await readListWithCache(entity, () => api.list(params), undefined, { params }) }),
    get: async (id) => ({ data: await readOneWithCache(entity, id, (realId) => api.get(realId)) }),
    create: async (payload) => {
      const body = numberField && !payload[numberField] ? { ...payload, [numberField]: provisional() } : payload;
      const data = await createWithQueue(entity, body, (d, config) => {
        const online = { ...d };
        if (numberField) delete online[numberField]; // attribue par le serveur
        return api.create(online, config);
      });
      return { data };
    },
    update: async (id, payload) => ({ data: await updateWithQueue(entity, id, payload, (i, d) => api.update(i, d)) }),
    delete: async (id) => ({ data: await deleteWithQueue(entity, id, (i) => api.delete(i)) }),
  };
}

export const offlineData = {
  clients: wrap('clients', clientsAPI),
  suppliers: wrap('suppliers', suppliersAPI),
  products: wrap('products', productsAPI),
  invoices: wrap('invoices', invoicesAPI, { numberField: 'invoice_number' }),
  purchaseOrders: wrap('purchaseOrders', purchaseOrdersAPI, { numberField: 'po_number' }),
};

export default offlineData;
