import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ env }) {
  const token = await getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/documents.readonly');
  const sheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets/1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc/values/B3:I';
  const googleSheet = await fetch(sheetUrl, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'ardislu.dev',
    home_page_url: 'https://ardislu.dev/',
    feed_url: 'https://ardislu.dev/feed.json',
    description: 'Notes on web development, crypto, self-hosting, and tech in general.',
    icon: 'https://ardislu.dev/logo.svg',
    favicon: 'https://ardislu.dev/logo.svg',
    authors: [{ name: 'Ardis Lu', url: 'mailto:ardis@ardislu.dev' }],
    language: 'en-US',
    items: []
  }
  for (const article of googleSheet.values) {
    feed.items.push({
      id: `urn:google:${article[2]}`,
      url: `https://ardislu.dev${article[4]}`,
      title: article[0],
      content_html: `<p>${article[1]}</p><a href="https://ardislu.dev${article[4]}">${article[3]}</a>`,
      date_published: new Date(article[5]).toISOString(),
      date_modified: new Date(article[6]).toISOString(),
      tags: article[7].split(',').map(s => s.trim())
    });
  }

  return new Response(JSON.stringify(feed), { headers: { 'Content-Type': 'application/feed+json' } });
}