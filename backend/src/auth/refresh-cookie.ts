import type { CookieOptions } from 'express';

export const REFRESH_COOKIE = 'refresh_token';

function osnovneCookieOpcije(jeProdukcija: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: jeProdukcija,
    sameSite: 'strict',
    path: '/auth',
  };
}

export function refreshCookieOpcije(
  jeProdukcija: boolean,
  datumIsteka: Date,
): CookieOptions {
  return {
    ...osnovneCookieOpcije(jeProdukcija),
    expires: datumIsteka,
  };
}

export function brisanjeCookieOpcije(jeProdukcija: boolean): CookieOptions {
  return osnovneCookieOpcije(jeProdukcija);
}
