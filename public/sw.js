// Self-destruct and clear all caches to remove stale PWA shells
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Pass-through to network, never serve stale cache
  event.respondWith(fetch(event.request))
})
