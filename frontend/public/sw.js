/* ProLink ID service worker — makes public profiles installable and available offline after a visit. */
const VERSION = 'v3'
const STATIC_CACHE = `prolink-static-${VERSION}`
const RUNTIME_CACHE = `prolink-runtime-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(['/icons/icon-192.png', '/icons/icon-512.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Public profile and "My QR" pages: always try fresh content first, fall back to the last copy offline.
  if (request.mode === 'navigate' && (url.pathname.startsWith('/p/') || url.pathname.startsWith('/q/'))) {
    event.respondWith(networkFirst(request))
    return
  }

  // Only public, non-personal API data is cached (never authenticated owner endpoints).
  if (url.pathname.startsWith('/api/public/') && !url.pathname.endsWith('/vcard')) {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request))
  }
})
