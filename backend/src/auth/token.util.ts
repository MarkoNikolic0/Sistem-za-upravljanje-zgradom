import { createHash, randomBytes } from 'crypto';

export function generisiToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hesirajToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
