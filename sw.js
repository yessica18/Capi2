// CAPICÚA — Service worker: abre al instante en visitas repetidas y funciona sin conexión.
const V = 'capicua-f62e064fa3';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'marca/capia-icono.svg', 'marca/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return; const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return; // la API nunca se guarda en caché
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(r => { const cl = r.clone(); caches.open(V).then(c => c.put('index.html', cl)); return r; }).catch(() => caches.match('index.html'))); return; }
  const isAsset = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.host);
  if (!isAsset) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const cl = r.clone(); caches.open(V).then(c => c.put(req, cl)); } return r; })));
});
