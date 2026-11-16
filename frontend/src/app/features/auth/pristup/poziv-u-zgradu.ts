import { inject } from '@angular/core';
import { Params, RedirectFunction, Router } from '@angular/router';
import { ispravanIdIzAdrese } from '../../../shared/ispravan-id';
import { AuthStore } from '../sesija/auth-store';
import { bezbednaAdresa } from './povratak';

const POVEZIVANJE = '/povezivanje';

export const pozivUZgradu: RedirectFunction = ({ params }) => {
  const zgrada = ispravanIdIzAdrese(params['zgrada']);
  const putanja = inject(AuthStore).jePrijavljen() ? POVEZIVANJE : '/register';
  return inject(Router).createUrlTree([putanja], { queryParams: { zgrada } });
};

export function povratakNaPovezivanje(zgradaId: number | undefined): Params {
  return zgradaId === undefined ? {} : { returnUrl: `${POVEZIVANJE}?zgrada=${zgradaId}` };
}

export function zgradaIzPovratka(router: Router, adresa: string | undefined): number | undefined {
  const povratak = router.parseUrl(bezbednaAdresa(adresa));
  const putanja = povratak.root.children['primary']?.segments.map((s) => s.path).join('/');
  return `/${putanja}` === POVEZIVANJE
    ? ispravanIdIzAdrese(povratak.queryParamMap.get('zgrada'))
    : undefined;
}
