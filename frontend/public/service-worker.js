// Service Worker pour PWA
const CACHE_NAME = 'gestion-app-v1';
const API_CACHE_NAME = 'gestion-app-api-v1';

// URLs à mettre en cache lors de l'installation
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
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
            console.log('Suppression du cache:', cacheName);
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
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Erreur réseau:', error);
    // Retourner une page offline si disponible
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Stratégie Network First (pour l'API et les pages HTML)
async function networkFirstStrategy(request) {
  const cache = await caches.open(request.url.includes('/api/') ? API_CACHE_NAME : CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    // Ne pas mettre en cache les requêtes POST, PUT, DELETE, PATCH
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Erreur réseau, utilisation du cache:', error);
    // Ne chercher dans le cache que pour les requêtes GET
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Pour les requêtes API, retourner une erreur JSON
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Offline', message: 'Vous êtes hors ligne' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Pour les pages, retourner la page offline
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
    self.registration.showNotification('Application de Gestion', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification cliquée:', event.action);
  event.notification.close();

  if (event.action === 'explore') {
    // Ouvrir l'application
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
  // Logique de synchronisation des données hors ligne
  console.log('Synchronisation des données...');

  // Récupérer les données en attente depuis IndexedDB
  // Envoyer les données au serveur
  // Nettoyer les données synchronisées
}

// Fonction pour gérer le partage de fichiers
async function handleShare(request) {
  const formData = await request.formData();
  const file = formData.get('document');
  const title = formData.get('title');
  const text = formData.get('text');

  // Rediriger vers l'interface de scan avec le fichier
  return Response.redirect('/ai-chat?action=scan&shared=true', 303);
}