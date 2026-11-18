import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthStore } from '../sesija/auth-store';
import { naPrijavu } from './povratak';

export const prijavljenGuard: CanActivateFn & CanMatchFn = () =>
  inject(AuthStore).jePrijavljen() ? true : naPrijavu(inject(Router));
