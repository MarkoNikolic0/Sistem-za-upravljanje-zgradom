import type { CookieOptions } from 'express';

export const REFRESH_COOKIE = 'refresh_token';

export function refreshCookieOpcije(jeProdukcija: boolean, datumIsteka: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: jeProdukcija,
    sameSite: 'strict',
    path: '/auth',
    expires: datumIsteka,
  };
}