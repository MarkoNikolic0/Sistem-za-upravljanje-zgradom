import { inject } from '@angular/core';
import { signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, pipe, tap } from 'rxjs';
import { Uloga } from '../auth/auth-models';
import { KorisnikService } from './korisnik-service';
import { KorisnikSistema, StanjeNaloga } from './korisnik-models';
import { withRequestStatus } from '../../shared/stanje/with-request-status';
import { withPaginacija } from '../../shared/liste/with-paginacija';
import { ucitavanjeStrane } from '../../shared/liste/ucitavanje-strane';
import { withAkcije } from '../../shared/stanje/with-akcije';

const KORISNIKA_PO_STRANI = 20;
const MIN_PRETRAGE = 2;

interface ListaKorisnikaState {
  korisnici: KorisnikSistema[];
  pretraga: string;
  uloga: Uloga | null;
  stanje: StanjeNaloga;
}

const pocetnoStanje: ListaKorisnikaState = {
  korisnici: [],
  pretraga: '',
  uloga: null,
  stanje: 'aktivni',
};

export const ListaKorisnikaStore = signalStore(
  withState(pocetnoStanje),
  withPaginacija(KORISNIKA_PO_STRANI),
  withRequestStatus(),
  withAkcije(),
  withMethods((store, korisnikService = inject(KorisnikService)) => {
    const { ucitaj, promeniStranu, odPrveStrane } = ucitavanjeStrane(
      store,
      (strana) =>
        korisnikService.lista({
          pretraga: store.pretraga() || undefined,
          uloga: store.uloga() ?? undefined,
          stanje: store.stanje(),
          ...strana,
        }),
      (korisnici) => ({ korisnici }),
      'Korisnike trenutno nije moguće učitati.',
    );

    const pretrazi = rxMethod<string>(
      pipe(
        map((tekst) => tekst.trim()),
        map((tekst) => (tekst.length >= MIN_PRETRAGE ? tekst : '')),
        debounceTime(300),
        distinctUntilChanged(),
        tap((pretraga) => {
          odPrveStrane({ pretraga });
        }),
      ),
    );

    return {
      ucitaj,
      pretrazi,
      promeniUlogu(uloga: Uloga | null): void {
        odPrveStrane({ uloga });
      },
      promeniStanje(stanje: StanjeNaloga): void {
        odPrveStrane({ stanje });
      },
      promeniStranu,
    };
  }),
  withHooks({
    onInit(store) {
      store.ucitaj();
    },
  }),
);
