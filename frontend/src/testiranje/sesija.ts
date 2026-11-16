import { Uloga } from '../app/features/auth/auth-models';

function base64url(tekst: string): string {
  const bajtovi = new TextEncoder().encode(tekst);
  return btoa(String.fromCharCode(...bajtovi))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

export function tokenZa(
  uloga: Uloga,
  id = 1,
  email = 'đorđe.šćekić@example.com',
  sid = `sesija-${id}`,
): string {
  const payload = { sub: id, email, uloga, sid, iat: 0, exp: 0 };
  return `zaglavlje.${base64url(JSON.stringify(payload))}.potpis`;
}
