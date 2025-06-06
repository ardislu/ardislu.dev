import { getGoogleAuthToken } from './auth.js';

export async function onRequestGet({ env }) {
  const entries = [];
  const updatedDates = [];
  const token = await getGoogleAuthToken(env.EMAIL, env.PRIVATE_KEY, 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/documents.readonly');
  const sheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets/1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc/values/B3:I';
  const googleSheet = await fetch(sheetUrl, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
  for (const article of googleSheet.values) {
    entries.push(`<entry>
    <id>urn:google:${article[2]}</id>
    <title>${article[0]}</title>
    ${article[7].split(',').map(s => `<category term="${s.trim()}"/>`).join('')}
    <summary type="html"><![CDATA[<p>${article[1]}</p><a href="https://ardislu.dev${article[4]}">${article[3]}</a>]]></summary>
    <link href="https://ardislu.dev${article[4]}"/>
    <published>${new Date(article[5]).toISOString()}</published>
    <updated>${new Date(article[6]).toISOString()}</updated>
  </entry>`);
    updatedDates.push(new Date(article[6]));
  }

  const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">

  <id>https://ardislu.dev/</id>
  <title>ardislu.dev</title>
  <subtitle>Notes on web development, crypto, self-hosting, and tech in general.</subtitle>
  <author>
    <name>Ardis Lu</name>
    <email>ardis@ardislu.dev</email>
  </author>
  <link href="https://ardislu.dev/"/>
  <link rel="self" href="https://ardislu.dev/atom.xml"/>
  <link rel="search" href="https://ardislu.dev/opensearch.osdx" type="application/opensearchdescription+xml" title="ardislu.dev"/>
  <updated>${new Date(Math.max(...updatedDates)).toISOString()}</updated>

  ${entries.join('\n  ')}

</feed>`

  return new Response(feed, { headers: { 'Content-Type': 'application/atom+xml' } });
}