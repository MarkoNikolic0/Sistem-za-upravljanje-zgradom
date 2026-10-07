import { Uloga } from '../auth-models';

export interface JwtPayload {
  sub: number;
  email: string;
  uloga: Uloga;
  iat: number;
  ext: number;
}

export function procitajJwtPayload(token: string): JwtPayload {
  const payloadDeo = token.split('.')[1];
  if (!payloadDeo) {
    throw new Error('Neispravan JWT');
  }

  const base64 = payloadDeo.replaceAll('-', '+').replaceAll('_', '/');
  const binarno = atob(base64);
  const bajtovi = Uint8Array.from(binarno, (znak) => znak.charCodeAt(0));
  const json = new TextDecoder().decode(bajtovi);

  return JSON.parse(json) as JwtPayload;
}
