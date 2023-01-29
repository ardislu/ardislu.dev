import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const queryUrl = new URL(decodeURIComponent(url.search.substring(1)));

  // To prevent service account token from leaking to non-Google domains
  if (!(queryUrl.hostname === 'sheets.googleapis.com' || queryUrl.hostname === 'docs.googleapis.com')) {
    return new Response('Invalid query URL. Query URL hostname must be "sheets.googleapis.com" or "docs.googleapis.com".', { status: 400 });
  }

  const token = await getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/documents.readonly');

  return fetch(queryUrl, { headers: { Authorization: `Bearer ${token}` } });
}
