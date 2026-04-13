// SuperCalc — Service Worker v1.11.0
// ═══════════════════════════════════════════════════════
// Estrategia: Cache-first con network fallback.
// Al deployar una nueva versión, bumpear CACHE_VER
// para invalidar el caché anterior automáticamente.
// ═══════════════════════════════════════════════════════

const CACHE_VER  = 'supercalc-v1.11.0';

const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
];

const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
];

// ── INSTALL: precachear archivos core ─────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VER).then(cache =>
      cache.addAll([...CORE_ASSETS, ...FONT_ASSETS])
        .catch(err => {
          // Si fonts fallan (CORS), no romper la instalación
          console.warn('[SW] Some assets failed to cache:', err);
          return cache.addAll(CORE_ASSETS);
        })
    )
  );
  // Activar inmediatamente sin esperar que tabs viejas cierren
  self.skipWaiting();
});

// ── ACTIVATE: limpiar cachés viejos ───────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VER)
          .map(k => caches.delete(k))
      )
    )
  );
  // Tomar control de todas las tabs abiertas inmediatamente
  self.clients.claim();
});

// ── FETCH: cache-first, network fallback ──────────────
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Solo cachear GET requests
  if (req.method !== 'GET') return;

  // Navegación (HTML): network-first para siempre tener la última versión
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VER).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets estáticos: cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Cachear solo respuestas válidas del mismo origen o fonts
        if (res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) {
          const clone = res.clone();
          caches.open(CACHE_VER).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
