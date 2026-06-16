// Nire PWA Service Worker
const CACHE_NAME = 'nire-v1'
const STATIC_ASSETS = [
  '/',
  '/portal',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install: cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy:
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // In development, bypass service worker fetch interception to allow HMR and live updates
  const isDevHost =
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname.endsWith('devtunnels.ms') ||
    self.location.hostname.includes('gitpod') ||
    self.location.hostname.includes('codesandbox')

  if (isDevHost) {
    return
  }

  // Bypass HMR and hot-update assets
  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.includes('hot-update')) {
    return
  }

  // API routes: network-only (do NOT cache API calls in sw.js because Supabase relies on real-time auth headers)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Document navigation (HTML pages like /, /login, /portal): Network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets (fonts, images, icons, compiled _next/static JS/CSS): Cache-first
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/manifest.json') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|json)$/)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
            return res
          })
      )
    )
  }
})
