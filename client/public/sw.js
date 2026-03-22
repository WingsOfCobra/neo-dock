/* ── Neo-Dock Service Worker ───────────────────────────────── */

const CACHE_NAME = 'neo-dock-v1';

/* App shell resources cached on install */
const APP_SHELL = [
  '/',
  '/index.html',
];

/* ── Install: cache app shell ─────────────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

/* ── Activate: purge old caches ───────────────────────────── */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

/* ── Helpers ──────────────────────────────────────────────── */

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|webp|ico)(\?|$)/.test(url.pathname);
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/');
}

function isNavigationOrHtml(request, url) {
  return (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  );
}

/* ── Fetch strategies ─────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache WebSocket upgrades or non-http(s) schemes
  if (
    event.request.headers.get('upgrade') === 'websocket' ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // API calls → network-first, fall back to cache
  if (isApiCall(url)) {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }

  // Static assets → cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstWithNetwork(event.request));
    return;
  }

  // Navigation requests → network-first, fall back to cached index
  if (isNavigationOrHtml(event.request, url)) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // Everything else → network-first
  event.respondWith(networkFirstWithCache(event.request));
});

/* ── Cache-first (static assets) ─────────────────────────── */

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/* ── Network-first (API calls) ───────────────────────────── */

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/* ── Network-first navigation (SPA fallback) ─────────────── */

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // SPA: fall back to cached index.html for any navigation
    const cached = await caches.match('/') || await caches.match('/index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
