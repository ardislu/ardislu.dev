const cacheName = 'v1';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(['index.html', '404.html', 'style.css', 'script.js', 'favicon.ico', 'github.svg', 'home.svg']);
  })());
});

self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    const fetchResponseP = fetch(event.request);
    const fetchResponseCloneP = fetchResponseP.then(r => r.clone());

    event.waitUntil((async () => {
      const cache = await caches.open(cacheName);
      await cache.add(event.request.url, await fetchResponseCloneP);
    })());

    return (await caches.match(event.request.url)) || fetchResponseP;
  })());
});