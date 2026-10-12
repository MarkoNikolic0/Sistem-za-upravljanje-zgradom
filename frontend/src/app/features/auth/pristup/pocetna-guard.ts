import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../sesija/auth-store';

export const pocetnaGuard: CanActivateFn = () =>
  inject(AuthStore).korisnik()?.uloga === 'serviser'
    ? inject(Router).createUrlTree(['/kvarovi'])
    : true;
