import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Events, on, withEventHandlers, withReducer } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/with-request-status';
import { kvarEvents } from './kvar-events';
import { Kvar, StanjeKvara } from './kvar-models';
import { KvarService } from './kvar-service';
import { jeZavrsen, KVAROVA_PO_STRANI } from './pravila-kvara';

interface ListaKvarovaState {
  kvarovi: Kvar[];
  ukupno: number;
  stanje: StanjeKvara;
  zgradaId: number | null;
  strana: number;
}

export const ListaKvarovaStore = signalStore(
  withState<ListaKvarovaState>({
    kvarovi: [],
    ukupno: 0,
    stanje: 'aktivni',
    zgradaId: null,
    strana: 1,
  }),
  withRequestStatus(),
  withComputed(({ ukupno }) => ({
    imaViseStrana: computed(() => ukupno() > KVAROVA_PO_STRANI),
  })),
  withMethods((store, kvarService = inject(KvarService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap(() =>
          kvarService
            .lista({
              stanje: store.stanje(),
              zgradaId: store.zgradaId(),
              strana: store.strana(),
              poStrani: KVAROVA_PO_STRANI,
            })
            .pipe(
              tapResponse({
                next: ({ stavke, ukupno }) => {
                  if (stavke.length === 0 && store.strana() > 1) {
                    patchState(store, { strana: store.strana() - 1 });
                    ucitaj();
                    return;
                  }
                  patchState(store, { kvarovi: stavke, ukupno }, setFulfilled());
                },
                error: () => patchState(store, setError('Kvarovi trenutno ne mogu da se učitaju.')),
              }),
            ),
        ),
      ),
    );

    return {
      ucitaj,
      prikaziListu(): void {
        if (store.requestStatus() === 'idle') {
          ucitaj();
        }
      },
      promeniStanje(stanje: StanjeKvara): void {
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
  withReducer(
    on(kvarEvents.prijavljen, () => ({ stanje: 'aktivni' as const, strana: 1 })),
    on(kvarEvents.azuriran, ({ payload: kvar }, { kvarovi }) => ({
      kvarovi: kvarovi.map((k) => (k.id === kvar.id ? kvar : k)),
    })),
  ),
  withEventHandlers((store, events = inject(Events)) => ({
    posleNovogKvara$: events.on(kvarEvents.prijavljen).pipe(
      filter(() => store.requestStatus() !== 'idle'),
      tap(() => store.ucitaj()),
    ),
    posleIzmeneKvara$: events.on(kvarEvents.azuriran).pipe(
      filter(({ payload: kvar }) => {
        const naStrani = store.kvarovi().some((k) => k.id === kvar.id);
        const uFilteru = jeZavrsen(kvar.status) === (store.stanje() === 'zavrseni');
        return store.requestStatus() !== 'idle' && !(naStrani && uFilteru);
      }),
      tap(() => store.ucitaj()),
    ),
  })),
);
