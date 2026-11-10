import { Router } from '@angular/router';

export function bezbednaAdresa(adresa: string | undefined): string {
  return adresa?.startsWith('/') && !adresa.startsWith('//') ? adresa : '/';
}

export function naPrijavu(router: Router, adresa = router.url) {
  return router.createUrlTree(['/login'], {
    queryParams: adresa === '/' ? {} : { returnUrl: adresa },
  });
}
