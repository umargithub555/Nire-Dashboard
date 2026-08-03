// Nire PWA Service Worker
const CACHE_NAME = 'nire-v2'
const STATIC_ASSETS = [
  '/app',
  '/login',
  '/portal/login',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  const isDevHost =
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname.endsWith('devtunnels.ms') ||
    self.location.hostname.includes('gitpod') ||
    self.location.hostname.includes('codesandbox')

  if (isDevHost) {
    return
  }

  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.includes('hot-update')) {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

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
        .catch(async () => {
          return (await caches.match(request)) || caches.match('/app')
        })
    )
    return
  }

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
