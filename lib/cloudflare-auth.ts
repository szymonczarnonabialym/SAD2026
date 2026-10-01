import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type AccessConfig = { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string };
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const reply = (message: string, status: number) => new Response(message, {
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});

/** Trust a signed Access application token, never client-supplied identity headers. */
export async function authorizeCloudflareRequest(request: Request, config: AccessConfig, testKeys?: JWTVerifyGetKey): Promise<Request | Response> {
  const domain = config.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/$/, '');
  const audience = config.CF_ACCESS_AUD?.trim();
  if (!domain || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) || !audience) {
    return reply('Mój Sad: ustaw CF_ACCESS_TEAM_DOMAIN i CF_ACCESS_AUD w ustawieniach Workera oraz włącz Cloudflare Access. Instrukcja: CLOUDFLARE.md w repozytorium.', 503);
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16000) return reply('Zaloguj się przez Cloudflare Access, aby otworzyć sad.', 401);
  try {
    let keys = testKeys;
    if (!keys) {
      let remoteKeys = keySets.get(domain);
      if (!remoteKeys) {
        remoteKeys = createRemoteJWKSet(new URL(domain + '/cdn-cgi/access/certs'), { timeoutDuration: 5000 });
        keySets.set(domain, remoteKeys);
      }
      keys = remoteKeys;
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer: domain, audience, algorithms: ['RS256'], requiredClaims: ['iss', 'aud', 'exp', 'sub', 'email'],
    });
    if (payload.type !== 'app' || typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return reply('Wymagane jest logowanie użytkownika przez Cloudflare Access.', 401);
    }
    const email = payload.email.toLowerCase();
    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) {
      if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
    }
    // The existing app reads these headers only after this Worker verifies the JWT.
    headers.set('oai-authenticated-user-id', 'cloudflare:' + email);
    headers.set('oai-authenticated-user-email', email);
    if (typeof payload.name === 'string') {
      headers.set('oai-authenticated-user-full-name', encodeURIComponent(payload.name));
      headers.set('oai-authenticated-user-full-name-encoding', 'percent-encoded-utf-8');
    }
    return new Request(request, { headers });
  } catch {
    return reply('Sesja wygasła lub jest nieprawidłowa. Zaloguj się ponownie przez Cloudflare Access.', 401);
  }
}
