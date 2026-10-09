import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { KvarService } from './kvar-service';
import { Kvar, StanjeKvara } from './kvar-models';

export const KVAROVA_PO_STRANI = 10;

interface KvaroviState {
  kvarovi: Kvar[];
  ukupno: number;
  stanje: StanjeKvara;
  strana: number;
  ucitava: boolean;
  greskaUcitavanja: boolean;
}

const pocetnoStanje: KvaroviState = {
  kvarovi: [],
  ukupno: 0,
  stanje: 'aktivni',
  strana: 1,
  ucitava: false,
  greskaUcitavanja: false,
};

export const KvarStore = signalStore(
  withState(pocetnoStanje),
  withComputed(({ ukupno }) => ({
    imaViseStrana: computed(() => ukupno() > KVAROVA_PO_STRANI),
  })),
  withMethods((store, kvarService = inject(KvarService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { ucitava: true, greskaUcitavanja: false })),
        switchMap(() =>
          kvarService
            .lista({ stanje: store.stanje(), strana: store.strana(), poStrani: KVAROVA_PO_STRANI })
            .pipe(
              tapResponse({
                next: ({ stavke, ukupno }) => {
                  if (stavke.length === 0 && store.strana() > 1) {
                    patchState(store, { strana: store.strana() - 1 });
                    ucitaj();
                    return;
                  }
                  patchState(store, { kvarovi: stavke, ukupno, ucitava: false });
                },
                error: () => patchState(store, { ucitava: false, greskaUcitavanja: true }),
              }),
            ),
        ),
      ),
    );

    return {
      ucitaj,
      promeniStanje(stanje: StanjeKvara): void {
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