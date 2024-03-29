function base64UrlEncode(s) {
  return btoa(s)
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

async function sign(message, privateKey) {
  const cleanedKey = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\r\n|\n|\r/g, '');
  const keyBuffer = Uint8Array.from(atob(cleanedKey), c => c.charCodeAt(0));

  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-V1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-V1_5', signingKey, new TextEncoder().encode(message));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

export async function getGoogleAuthToken(clientEmail, privateKey, scopes) {
  const header = base64UrlEncode(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT'
  }));

  const now = Math.round(Date.now() / 1000);
  const expires = now + 3600;
  const payload = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    exp: expires,
    iat: now,
    scope: scopes
  }));

  const unsignedJwt = `${header}.${payload}`;
  const signature = await sign(unsignedJwt, privateKey);
  const jwt = `${unsignedJwt}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: JSON.stringify({
      assertion: jwt,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
    })
  });
  const oauth = await response.json();

  return oauth.access_token;
}