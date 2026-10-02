import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const options = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32, options).toString('hex');
  return `scrypt$16384$8$5$${salt}$${hash}`;
}
export function validPasswordHash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(hash);
}
export function verifyPassword(password: string, encoded: string): boolean {
  if (!validPasswordHash(encoded) || password.length > 1024) return false;
  const [, , , , salt, hash] = encoded.split('$');
  return timingSafeEqual(scryptSync(password, salt, 32, options), Buffer.from(hash, 'hex'));
}
