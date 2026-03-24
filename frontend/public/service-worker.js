// Service Worker pour PWA
const CACHE_NAME = 'gestion-app-v1';
const API_CACHE_NAME = 'gestion-app-api-v1';
const DEBUG = false; // Mettre à true pour activer les logs de debug

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
        if (DEBUG) console.log('Cache ouvert');
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
  // Ne pas intercepter les requêtes POST/PUT/DELETE/PATCH - laisser passer directement au réseau
  if (url.pathname.startsWith('/api/')) {
    // Pour les requêtes de modification (POST, PUT, DELETE, PATCH), ne pas intercepter
    // Laisser le navigateur gérer directement pour éviter les problèmes de cache
    if (request.method !== 'GET') {
      return; // Laisser passer la requête sans interception
    }
    // Pour les GET, utiliser la stratégie network-first avec cache
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
    if (DEBUG) console.warn('Erreur réseau:', error.message);
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
    // Log silencieux - les erreurs réseau sont normales en mode offline
    if (DEBUG) console.warn('Erreur réseau, tentative depuis le cache:', error.message);

    // Pour les requêtes non-GET vers l'API, laisser passer l'erreur réseau native
    // Ne pas retourner de 503 car cela masque les vraies erreurs du serveur
    if (request.url.includes('/api/') && request.method !== 'GET') {
      // Re-lancer l'erreur pour que le navigateur la gère normalement
      throw error;
    }

    // Ne chercher dans le cache que pour les requêtes GET
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Pour les requêtes API GET, retourner une erreur JSON seulement si vraiment offline
    if (request.url.includes('/api/') && request.method === 'GET') {
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

// ─── Gestion des Push Notifications ─────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Procura', body: event.data ? event.data.text() : 'Nouvelle notification' };
  }

  const title = payload.title || 'Procura';
  const category = payload.category || 'important';

  // Icône selon catégorie
  const icon = category === 'critique' ? '/icon-192.png' : '/icon-192.png';

  const options = {
    body: payload.body || '',
    icon,
    badge: '/badge-72.png',
    tag: payload.tag || 'procura-notification',
    data: {
      url: payload.url || '/',
      type: payload.type || '',
      ...( payload.data || {} ),
    },
    requireInteraction: payload.requireInteraction || false,
    vibrate: payload.vibrate || [100, 50, 100],
    actions: payload.url ? [
      { action: 'open', title: 'Voir' },
      { action: 'dismiss', title: 'Ignorer' },
    ] : [
      { action: 'dismiss', title: 'Fermer' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si l'app est déjà ouverte, focus + navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl });
          return;
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Logique de synchronisation des données hors ligne
  if (DEBUG) console.log('Synchronisation des données...');

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