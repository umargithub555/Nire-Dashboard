// Nire PWA Service Worker — v3
const CACHE_NAME = 'nire-v3'

const PRECACHE_URLS = [
  '/app',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install: precache critical shell assets ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Use individual adds so a single failure does not abort the whole install
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  )
  self.skipWaiting()
})

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for navigation, cache-first for static assets ────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests from our own origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Let through HMR / webpack dev-server traffic without interfering
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.includes('hot-update')
  ) {
    return
  }

  // Let API calls go straight to the network — never cache them
  if (url.pathname.startsWith('/api/')) return

  // ── Navigation requests (HTML pages) ─────────────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache a fresh copy on success
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(async () => {
          // Offline fallback: serve the cached version of this page, or /app
          const cached = await caches.match(request)
          return cached || caches.match('/app')
        })
    )
    return
  }

  // ── Static assets (JS, CSS, fonts, icons …) ──────────────────────────────
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|json)$/.test(url.pathname)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(CACHE_NAME).then((c) => c.put(request, clone))
            }
            return res
          })
      )
    )
  }
})
