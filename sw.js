const CACHE_NAME = 'gyc-v1';
const STATIC_ASSETS = [
  './',
  './getyourcert.html',
  './manifest.json',
  './icon-192.png',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
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

  // Cache-first for question JSON files (large, stable data)
  if(url.pathname.startsWith('/questions/') || url.pathname.includes('questions/')){
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          if(cached) return cached;
          return fetch(e.request).then(res => {
            if(res.ok) cache.put(e.request, res.clone());
            return res;
          });
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
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for all other static assets (fonts, icons)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok && (e.request.url.startsWith('https://fonts.') || url.pathname.match(/\.(png|svg|ico|json|woff2?)$/))) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
