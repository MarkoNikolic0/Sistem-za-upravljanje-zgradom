import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../sesija/auth-store';
import { Uloga } from '../auth-models';

export function ulogaGuard(...uloge: Uloga[]): CanActivateFn {
  return () => {
    const uloga = inject(AuthStore).korisnik()?.uloga;
    return uloga !== undefined && uloge.includes(uloga)
      ? true
      : inject(Router).createUrlTree(['/']);
  };
}
