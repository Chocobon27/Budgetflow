// ============================================
// BudgetFlow - Service Worker
// ============================================
const CACHE_NAME = 'budgetflow-v2';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache au premier chargement
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ============================================
// INSTALLATION
// ============================================
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 SW: Pré-cache des ressources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATION
// ============================================
self.addEventListener('activate', (event) => {
  console.log('✅ SW: Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('🗑️ SW: Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================
// FETCH - Stratégie Network First avec fallback cache
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes WebSocket et API
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Pour les requêtes de navigation (pages HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache la réponse
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Hors-ligne : essayer le cache, sinon page offline
          return caches.match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Pour les assets statiques (JS, CSS, images)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Mettre en cache les assets
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache
        return caches.match(request);
      })
  );
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', (event) => {
  console.log('🔔 SW: Push reçu');

  let data = {
    title: 'BudgetFlow',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || data.data,
        tag: payload.tag || 'budgetflow-notification',
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
      };
    }
  } catch (e) {
    console.error('SW: Erreur parsing push:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      actions: data.actions,
      vibrate: [200, 100, 200],
    })
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('👆 SW: Notification cliquée');
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Chercher une fenêtre déjà ouverte
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        return clients.openWindow(targetUrl);
      })
  );
});

// ============================================
// BACKGROUND SYNC (pour transactions hors-ligne)
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    console.log('🔄 SW: Sync des transactions hors-ligne');
    event.waitUntil(
      // Le frontend gère la sync via AppContext
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUESTED' });
        });
      })
    );
  }
});

// ============================================
// MESSAGE HANDLER
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
