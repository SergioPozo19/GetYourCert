const CACHE_NAME = 'eyc-v7';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];
const QUESTION_ASSETS = [
  './questions/ab-900.json',
  './questions/ms-700.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests. Cross-origin resources (Google Fonts,
  // user avatars, GSI, analytics) are left to the browser so they load under
  // their own CSP directives (style-src/font-src/img-src/script-src) instead of
  // connect-src, which is what a SW fetch() would otherwise require.
  if(url.origin !== self.location.origin) return;

  // Stale-while-revalidate for question JSON files (large, mostly-stable data):
  // serve the cached copy immediately if present, but always re-fetch in the
  // background to refresh the cache for next time.
  if(url.pathname.startsWith('/questions/') || url.pathname.includes('questions/')){
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          const network = fetch(e.request).then(res => {
            if(res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Network-first for HTML (get updates), fall back to cache
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(c => c || new Response('', {status: 504})))
    );
    return;
  }

  // Cache-first for other same-origin static assets (icons, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok && url.pathname.match(/\.(png|svg|ico|json|woff2?)$/)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('', {status: 504}));
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
