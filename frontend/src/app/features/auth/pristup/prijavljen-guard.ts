import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../sesija/auth-store';
import { naPrijavu } from './povratak';

export const prijavljenGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authStore.jePrijavljen() ? true : naPrijavu(router, state.url);
};
