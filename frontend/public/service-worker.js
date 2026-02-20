// Service Worker pour PWA
const CACHE_NAME = 'csj-app-v2';
const API_CACHE_NAME = 'csj-app-api-v2';
const DEBUG = false; // Mettre à true pour activer les logs de debug

// URLs essentielles à mettre en cache lors de l'installation
// Note: Vite génère des noms de fichiers hachés, on ne met que les fichiers stables
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Utilitaire : mettre en cache sans planter si quota dépassé
async function safeCachePut(cache, request, response) {
  try {
    await cache.put(request, response);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Quota dépassé : vider le cache API (le moins critique) et réessayer
      if (DEBUG) console.warn('Quota cache dépassé, nettoyage...');
      try {
        await caches.delete(API_CACHE_NAME);
        await cache.put(request, response);
      } catch (retryError) {
        // Silencieux - la mise en cache est un bonus, pas obligatoire
        if (DEBUG) console.warn('Impossible de mettre en cache:', retryError.message);
      }
    }
  }
}

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        if (DEBUG) console.log('Cache ouvert');
        // Mise en cache individuelle pour éviter qu'un échec bloque tout
        const results = await Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(() => null))
        );
        if (DEBUG) {
          results.forEach((r, i) => {
            if (r.status === 'rejected') console.warn('Cache échec:', urlsToCache[i]);
          });
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            if (DEBUG) console.log('Suppression du cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes WebSocket et HMR de Vite
  if (url.protocol === 'ws:' || url.protocol === 'wss:' ||
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/__vite_ping') ||
      url.searchParams.has('token')) {
    return;
  }

  // Gestion du partage de fichiers
  if (url.pathname === '/share' && request.method === 'POST') {
    event.respondWith(handleShare(request));
    return;
  }

  // Stratégie pour l'API
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      return;
    }
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Stratégie pour les assets statiques
  if (request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Stratégie pour les pages HTML
  event.respondWith(networkFirstStrategy(request));
});

// Stratégie Cache First (pour les assets statiques)
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await safeCachePut(cache, request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (DEBUG) console.warn('Erreur réseau:', error.message);
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Stratégie Network First (pour l'API et les pages HTML)
async function networkFirstStrategy(request) {
  const cache = await caches.open(request.url.includes('/api/') ? API_CACHE_NAME : CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === 'GET') {
      await safeCachePut(cache, request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (DEBUG) console.warn('Erreur réseau, tentative depuis le cache:', error.message);

    if (request.url.includes('/api/') && request.method !== 'GET') {
      throw error;
    }

    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    if (request.url.includes('/api/') && request.method === 'GET') {
      return new Response(
        JSON.stringify({ error: 'Offline', message: 'Vous êtes hors ligne' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CSJ - Centre de Santé Julianna', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  if (DEBUG) console.log('Notification cliquée:', event.action);
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  if (DEBUG) console.log('Synchronisation des données...');
}

// Fonction pour gérer le partage de fichiers
async function handleShare(request) {
  const formData = await request.formData();
  return Response.redirect('/ai-chat?action=scan&shared=true', 303);
}
