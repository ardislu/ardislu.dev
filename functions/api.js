import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const queryString = decodeURIComponent(url.search.substring(1));

  const email = env.EMAIL // E.g. "example@example.com"
  const privateKey = env.PRIVATE_KEY // E.g. "-----BEGIN PRIVATE KEY-----\n...EXAMPLE...\n-----END PRIVATE KEY-----\n"
  const scopes = env.SCOPES // E.g. "https://example.com/auth/scope1 https://example.com/auth/scope2"

  const token = await getGoogleAuthToken(email, privateKey, scopes);

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
