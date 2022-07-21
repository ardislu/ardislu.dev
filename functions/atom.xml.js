import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ env }) {
  const entries = [];
  const updatedDates = [];
  const token = await getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, env.SCOPES);
  const sheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets/1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc/values/B3:I';
  await fetch(sheetUrl, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(googleSheet => {
      for (const article of googleSheet.values) {
        entries.push(`<entry>
    <id>urn:google.com:${article[2]}</id>
    <title>${article[0]}</title>
    <summary>${article[1]}</summary>
    <link href="https://ardislu.dev${article[4]}"/>
    <published>${new Date(article[5]).toISOString()}</published>
    <updated>${new Date(article[6]).toISOString()}</updated>
  </entry>`);
        updatedDates.push(new Date(article[6]));
      }
    });

  const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">

  <id>https://ardislu.dev/</id>
  <title>ardislu.dev</title>
  <subtitle>Notes on web development, crypto, self-hosting, and tech in general.</subtitle>
  <author>
    <name>Ardis Lu</name>
  </author>
  <link href="https://ardislu.dev/"/>
  <updated>${new Date(Math.max(...updatedDates)).toISOString()}</updated>

  ${entries.join('\n  ')}

</feed>`

  return new Response(feed, { headers: { 'Content-Type': 'application/atom+xml' } });
}