import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../sesija/auth-store';

export const gostGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authStore.jePrijavljen() ? router.createUrlTree(['/']) : true;
};
