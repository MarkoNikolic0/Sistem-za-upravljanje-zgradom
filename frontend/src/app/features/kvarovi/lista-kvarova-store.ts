import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
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
import { KategorijaKvara, Kvar, PrioritetKvara, StanjeKvara } from './kvar-models';
import { KvarService } from './kvar-service';
import { jeZavrsen, KVAROVA_PO_STRANI } from './pravila-kvara';
import { jePraznaStrana, withPaginacija } from '../../shared/with-paginacija';

interface ListaKvarovaState {
  kvarovi: Kvar[];
  stanje: StanjeKvara;
  kategorija: KategorijaKvara | null;
  prioritet: PrioritetKvara | null;
  zgradaId: number | null;
}

export const ListaKvarovaStore = signalStore(
  withState<ListaKvarovaState>({
    kvarovi: [],
    stanje: 'aktivni',
    kategorija: null,
    prioritet: null,
    zgradaId: null,
  }),
  withRequestStatus(),
  withPaginacija(KVAROVA_PO_STRANI),
  withMethods((store, kvarService = inject(KvarService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap(() =>
          kvarService
            .lista({
              stanje: store.stanje(),
              kategorija: store.kategorija(),
              prioritet: store.prioritet(),
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
      promeniKategoriju(kategorija: KategorijaKvara | null): void {
        patchState(store, { kategorija, strana: 1 });
        ucitaj();
      },
      promeniPrioritet(prioritet: PrioritetKvara | null): void {
        patchState(store, { prioritet, strana: 1 });
        ucitaj();
      },
      ponistiFiltere(): void {
        patchState(store, { kategorija: null, prioritet: null, strana: 1 });
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
    // Novi kvar mora da se vidi, pa se filteri vraćaju na početne
    on(kvarEvents.prijavljen, () => ({
      stanje: 'aktivni' as const,
      kategorija: null,
      prioritet: null,
      strana: 1,
    })),
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
        const uFilteru =
          jeZavrsen(kvar.status) === (store.stanje() === 'zavrseni') &&
          (store.kategorija() ?? kvar.kategorija) === kvar.kategorija &&
          (store.prioritet() ?? kvar.prioritet) === kvar.prioritet;
        return store.requestStatus() !== 'idle' && !(naStrani && uFilteru);
      }),
      tap(() => store.ucitaj()),
    ),
  })),
);
