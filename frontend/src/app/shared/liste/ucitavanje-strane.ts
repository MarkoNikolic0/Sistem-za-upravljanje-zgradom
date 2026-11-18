import { Signal } from '@angular/core';
import { patchState, WritableStateSource } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { Observable, pipe, switchMap, tap } from 'rxjs';
import {
  RequestStatusState,
  setError,
  setFulfilled,
  setPending,
} from '../stanje/with-request-status';
import { Stranica, UpitStrane } from './stranica';
import { jePraznaStrana, PaginacijaState } from './with-paginacija';

type StoreListe<S extends object> = WritableStateSource<S> & {
  strana: Signal<number>;
  poStrani: number;
};

export function ucitavanjeStrane<T, S extends PaginacijaState & RequestStatusState>(
  store: StoreListe<S>,
  zahtev: (upit: UpitStrane) => Observable<Stranica<T>>,
  primi: (stavke: T[]) => Partial<NoInfer<S>>,
  porukaGreske: string,
) {
  const ucitaj = rxMethod<void>(
    pipe(
      tap(() => patchState(store, setPending() as Partial<S>)),
      switchMap(() =>
        zahtev({ strana: store.strana(), poStrani: store.poStrani }).pipe(
          tapResponse({
            next: ({ stavke, ukupno }) => {
              if (jePraznaStrana(stavke, store.strana())) {
                patchState(store, { strana: store.strana() - 1 } as Partial<S>);
                ucitaj();
                return;
              }
              patchState(store, { ...primi(stavke), ukupno, ...setFulfilled() });
            },
            error: () => patchState(store, setError(porukaGreske) as Partial<S>),
          }),
        ),
      ),
    ),
  );

  return {
    ucitaj,
    promeniStranu(strana: number): void {
      patchState(store, { strana } as Partial<S>);
      ucitaj();
    },
    odPrveStrane(promena: Partial<S>): void {
      patchState(store, { ...promena, strana: 1 });
      ucitaj();
    },
  };
}
