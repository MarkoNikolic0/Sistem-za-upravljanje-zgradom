import { Router } from '@angular/router';

export function bezbednaAdresa(adresa: string | undefined): string {
  return adresa && /^\/(?![/\\])/.test(adresa) ? adresa : '/';
}

export function naPrijavu(router: Router, adresa = trenutnaAdresa(router)) {
  return router.createUrlTree(['/login'], {
    queryParams: adresa === '/' ? {} : { returnUrl: adresa },
  });
}

function trenutnaAdresa(router: Router): string {
  const navigacija = router.currentNavigation();
  const adresa = navigacija
    ? router.serializeUrl(navigacija.finalUrl ?? navigacija.extractedUrl)
    : router.url;
  return adresa.startsWith('/login')
    ? (router.parseUrl(adresa).queryParamMap.get('returnUrl') ?? '/')
    : adresa;
}
