// Doll Dress Up: Sweet Girl - service worker (app shell precache + runtime cache).
const VERSION = 'v1.25.1';
const SHELL = `dduo-shell-${VERSION}`;
const RUNTIME = 'dduo-runtime';
const SHELL_FILES = ['./', 'index.html', 'manifest.json', 'icon-192x192.png', 'icon-512x512.png', 'icon-maskable-512x512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dduo-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // ads/SDK/etc. pass through
  // Build/ files are content-hashed: cache-first. Everything else: network-first, cache fallback.
  const hashed = /\/Build\//.test(req.url);
  e.respondWith(
    (hashed ? caches.match(req) : Promise.resolve(null)).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(hashed ? RUNTIME : SHELL).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
    })
  );
});
