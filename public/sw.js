// Pro mTLS Manager service worker.
// Only the public app shell (HTML, JS, CSS, icons) is cached so the app opens fast and shows a
// friendly offline screen. Anything under /api (certificates, private keys, CA data, CRL) is NEVER
// intercepted or cached.
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `pro-mtls-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `pro-mtls-assets-${CACHE_VERSION}`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);

const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const STATIC_ASSET_EXT = /\.(?:js|mjs|css|svg|png|jpg|jpeg|webp|ico|woff2?|ttf|webmanifest)$/i;

function shouldBypass(request, url) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  if (request.headers.has('range')) return true;
  const path = url.pathname.toLowerCase();
  if (path === '/api' || path.startsWith('/api/')) return true;
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(new Request(u, { cache: 'reload' }))))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !ACTIVE_CACHES.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (shouldBypass(request, url)) return;

  const isNavigation =
    request.mode === 'navigate' || (request.headers.get('accept') || '').toLowerCase().includes('text/html');

  // Network-first for the HTML page so a rebuilt container is picked up immediately
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = (await caches.match('/')) || (await caches.match(request));
          if (cached) return cached;
          return new Response('Pro mTLS Manager is offline. Reconnect to your server and reload.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Stale-while-revalidate for built JS/CSS/icons
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || STATIC_ASSET_EXT.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
            return response;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return (await network) || new Response('', { status: 504 });
      })
    );
  }
});
