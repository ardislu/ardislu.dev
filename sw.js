const cacheName = 'v4';
const cacheChannel = new BroadcastChannel('cache');

async function revalidate(request) {
  const cachePromise = caches.match(request);
  const originPromise = fetch(request);
  const [cacheResponse, originResponse] = await Promise.all([cachePromise, originPromise]);

  // Must make clones before calling .text()
  const originClone = originResponse.clone(); // For updating the cache
  const originClone2 = originResponse.clone(); // For the function to return

  const [cacheText, responseText] = await Promise.all([cacheResponse?.text(), originResponse?.text()]);

  if (originResponse.ok && cacheText !== responseText) {
    caches.open(cacheName)
      .then(cache => cache.put(request, originClone))
      .then(() => cacheChannel.postMessage({
        resource: request.url,
        isCreated: cacheText === undefined,
        isUpdated: cacheText !== undefined
      }));
  }

  return originClone2;
}

// Implements stale-while-revalidate strategy: if there's anything in the cache, return that immediately.
// Wait for the origin server's response in parallel and notify cacheChannel if the cache changed.
globalThis.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cacheResponse => {
    const originResponse = revalidate(event.request);
    return cacheResponse === undefined ? originResponse : cacheResponse;
  }));
});
