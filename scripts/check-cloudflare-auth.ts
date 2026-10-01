import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
// @ts-expect-error Node's built-in TypeScript runner requires the source extension.
import { authorizeCloudflareRequest } from '../lib/cloudflare-auth.ts';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
const keys = createLocalJWKSet({ keys: [publicJwk] });
const config = { CF_ACCESS_TEAM_DOMAIN: 'https://sad-test.cloudflareaccess.com', CF_ACCESS_AUD: 'sad-audience' };
const token = async (overrides: Record<string, unknown> = {}) => new SignJWT({
  type: 'app', email: 'Sad@Example.com', name: 'Łukasz', sub: 'access-user',
  iss: config.CF_ACCESS_TEAM_DOMAIN, aud: [config.CF_ACCESS_AUD], exp: Math.floor(Date.now()/1000)+600,
  ...overrides,
}).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(privateKey);
const request = (jwt?: string) => new Request('https://sad.example/api/farm', {
  method: 'POST', body: '{"test":true}', headers: {
    'oai-authenticated-user-id': 'attacker', 'oai-authenticated-user-email': 'attacker@example.com',
    'oai-authenticated-user-full-name': 'Spoofed',
    ...(jwt ? {'Cf-Access-Jwt-Assertion': jwt} : {}),
  },
});
const valid = await authorizeCloudflareRequest(request(await token()), config, keys);
assert.ok(valid instanceof Request);
assert.equal(valid.headers.get('oai-authenticated-user-id'), 'cloudflare:sad@example.com');
assert.equal(valid.headers.get('oai-authenticated-user-email'), 'sad@example.com');
assert.equal(decodeURIComponent(valid.headers.get('oai-authenticated-user-full-name')!), 'Łukasz');
assert.equal(await valid.text(), '{"test":true}');
for (const claims of [
  { aud: ['other-app'] }, { iss: 'https://attacker.cloudflareaccess.com' }, { exp: 1 },
  { nbf: Math.floor(Date.now()/1000)+3600 }, { email: undefined }, { type: 'service' }, { exp: undefined },
]) {
  const result = await authorizeCloudflareRequest(request(await token(claims)), config, keys);
  assert.ok(result instanceof Response); assert.equal(result.status, 401);
}
const absent = await authorizeCloudflareRequest(request(), config, keys);
assert.ok(absent instanceof Response); assert.equal(absent.status, 401);
const spoofed = (await token()).split('.');
spoofed[1] = Buffer.from(JSON.stringify({ email: 'attacker@example.com', type: 'app' })).toString('base64url');
const tampered = await authorizeCloudflareRequest(request(spoofed.join('.')), config, keys);
assert.ok(tampered instanceof Response); assert.equal(tampered.status, 401);
for (const settings of [{}, {...config, CF_ACCESS_TEAM_DOMAIN:'http://sad-test.cloudflareaccess.com'}, {...config, CF_ACCESS_TEAM_DOMAIN:'https://example.com'}]) {
  const result = await authorizeCloudflareRequest(request(await token()), settings, keys);
  assert.ok(result instanceof Response); assert.equal(result.status, 503);
}
console.log('Cloudflare Access: verified identity/body, wrong audience/issuer, expiry, missing claims, tampering and spoofed headers — passed.');
