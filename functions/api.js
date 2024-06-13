import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const queryUrl = new URL(decodeURIComponent(url.search.substring(1)));

  // To prevent service account token from leaking to non-Google domains
  if (!(queryUrl.hostname === 'sheets.googleapis.com' || queryUrl.hostname === 'docs.googleapis.com')) {
    return new Response('Invalid query URL. Query URL hostname must be "sheets.googleapis.com" or "docs.googleapis.com".', { status: 400 });
  }

  const responsePromise = getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/documents.readonly')
    .then(t => fetch(queryUrl, { headers: { Authorization: `Bearer ${t}` } }))
    .then(r => r.blob())
    .then(b => new Response(b, { headers: { 'Content-Type': 'application/json' } })); // Remove extra response headers which may interfere with cache
  const cachedResponse = await caches.default.match(queryUrl);
  if (cachedResponse) {
    waitUntil(responsePromise.then(response => caches.default.put(queryUrl, response)));
    return cachedResponse;
  }
  else {
    const response = await responsePromise;
    waitUntil(caches.default.put(queryUrl, response.clone()));
    return response;
  }
}
