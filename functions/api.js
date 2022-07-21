import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const queryString = decodeURIComponent(url.search.substring(1));
  const token = await getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, env.SCOPES);

  const response = await fetch(queryString, {
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
