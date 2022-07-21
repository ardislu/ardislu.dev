import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const queryUrl = new URL(decodeURIComponent(url.search.substring(1)));

  // To prevent service account token from leaking to non-Google domains
  if (!(queryUrl.hostname === 'sheets.googleapis.com' || queryUrl.hostname === 'docs.googleapis.com')) {
    return new Response('Invalid query URL. Query URL hostname must be "sheets.googleapis.com" or "docs.googleapis.com".', { status: 400 });
  }

  const token = await getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, env.SCOPES);

  const response = await fetch(queryUrl, {
    cf: {
      cacheEverything: true,
      cacheTtl: 86400
    },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Cache-Control', 'max-age=86400, stale-while-revalidate=604800');

  return newResponse;
}
