const cacheName = 'v2';

self.addEventListener('install', event => event.waitUntil(
  caches.open(cacheName).then(cache => cache.addAll(
    [
      'index.html',
      'favicon.ico',
      'style.css',
      'print.css',
      'script.js'
    ]
  ))
));

self.addEventListener('fetch', event => event.respondWith(
  caches.match(event.request, { ignoreVary: true }).then(response => {
    if (response !== undefined) {
      return response;
    }
    else {
      return fetch(event.request).then(response => {
        const responseClone = response.clone();
        caches.open(cacheName).then(cache => cache.put(event.request, responseClone));
        return response;
      })
    }
  })
));
