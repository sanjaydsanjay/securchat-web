const CACHE_NAME = 'securechat-v2'
const STATIC_CACHE = 'securechat-static-v2'
const MEDIA_CACHE = 'securechat-media-v2'
const DYNAMIC_CACHE = 'securechat-dynamic-v2'

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== MEDIA_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }))
    return
  }

  if (url.pathname.startsWith('/storage/v1/object/public/avatars')) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.status === 200) {
          cache.put(request, response.clone())
        }
        return response
      })
    )
    return
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const title = data.title || 'SecureChat AI'
    const options = {
      body: data.body || 'New message',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `chat-${data.chatId || 'unknown'}`,
      renotify: true,
      requireInteraction: true,
      data: {
        url: data.url || '/',
        messageId: data.messageId,
        chatId: data.chatId,
        timestamp: Date.now(),
      },
      actions: data.actions || [
        { action: 'open', title: 'Open Chat' },
      ],
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch {
    const title = 'SecureChat AI'
    const options = {
      body: event.data.text(),
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    }
    event.waitUntil(self.registration.showNotification(title, options))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'
  const action = event.action

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(urlToOpen)
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
