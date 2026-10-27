import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/with-request-status';
import { jePraznaStrana, withPaginacija } from '../../shared/with-paginacija';
import { Sastanak, StanjeSastanka } from './sastanak-models';
import { SastanakService } from './sastanak-service';

const SASTANAKA_PO_STRANI = 10;

interface ListaSastanakaState {
  sastanci: Sastanak[];
  stanje: StanjeSastanka;
  zgradaId: number | null;
}

export const ListaSastanakaStore = signalStore(
  withState<ListaSastanakaState>({
    sastanci: [],
    stanje: 'predstojeci',
    zgradaId: null,
  }),
  withRequestStatus(),
  withPaginacija(SASTANAKA_PO_STRANI),
  withMethods((store, sastanakService = inject(SastanakService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap(() =>
          sastanakService
            .lista({
              stanje: store.stanje(),
              zgradaId: store.zgradaId(),
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
                  patchState(store, { sastanci: stavke, ukupno }, setFulfilled());
                },
                error: () =>
                  patchState(store, setError('Sastanci trenutno ne mogu da se učitaju.')),
              }),
            ),
        ),
      ),
    );

    return {
      ucitaj,
      promeniStanje(stanje: StanjeSastanka): void {
        patchState(store, { stanje, strana: 1 });
        ucitaj();
      },
      promeniZgradu(zgradaId: number | null): void {
        patchState(store, { zgradaId, strana: 1 });
        ucitaj();
      },
      promeniStranu(strana: number): void {
        patchState(store, { strana });
        ucitaj();
      },
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
