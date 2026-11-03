import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { debounceTime, distinctUntilChanged, map, pipe, switchMap, tap } from 'rxjs';
import { Uloga } from '../auth/auth-models';
import { KorisnikService } from './korisnik-service';
import { KorisnikSistema, StanjeNaloga } from './korisnik-models';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/stanje/with-request-status';
import { jePraznaStrana, withPaginacija } from '../../shared/liste/with-paginacija';
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
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap(() =>
          korisnikService
            .lista({
              pretraga: store.pretraga() || undefined,
              uloga: store.uloga() ?? undefined,
              stanje: store.stanje(),
              strana: store.strana(),
              poStrani: store.poStrani,
            })
            .pipe(
              tapResponse({
                next: ({ stavke, ukupno }) => {
                  if (jePraznaStrana(stavke, store.strana())) {
                    patchState(store, { strana: store.strana() - 1 });
                    ucitaj();
                    return;
                  }
                  patchState(store, { korisnici: stavke, ukupno }, setFulfilled());
                },
                error: () => patchState(store, setError('Korisnike trenutno nije moguće učitati.')),
              }),
            ),
        ),
      ),
    );

    const pretrazi = rxMethod<string>(
      pipe(
        map((tekst) => tekst.trim()),
        map((tekst) => (tekst.length >= MIN_PRETRAGE ? tekst : '')),
        debounceTime(300),
        distinctUntilChanged(),
        tap((pretraga) => {
          patchState(store, { pretraga, strana: 1 });
          ucitaj();
        }),
      ),
    );

    return {
      ucitaj,
      pretrazi,
      promeniUlogu(uloga: Uloga | null): void {
        patchState(store, { uloga, strana: 1 });
        ucitaj();
      },
      promeniStanje(stanje: StanjeNaloga): void {
        patchState(store, { stanje, strana: 1 });
        ucitaj();
      },
      promeniStranu(strana: number): void {
        patchState(store, { strana });
        ucitaj();
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.ucitaj();
    },
  }),
);
