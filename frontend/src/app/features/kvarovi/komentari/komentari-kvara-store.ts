import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { on, withReducer } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { EMPTY, exhaustMap, filter, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../../shared/with-request-status';
import { kvarEvents } from '../kvar-events';
import { KomentarKvara } from '../kvar-models';
import { KOMENTARA_PO_STRANI } from '../pravila-kvara';
import { KomentariKvaraService } from './komentari-kvara-service';
import { jeIspravanId } from '../../../shared/ispravan-id';

interface KomentariKvaraState {
  kvarId: number | null;
  komentari: KomentarKvara[];
  preostaloStarijih: number;
  ucitavaStarije: boolean;
  slanje: boolean;
}

export const KomentariKvaraStore = signalStore(
  withState<KomentariKvaraState>({
    kvarId: null,
    komentari: [],
    preostaloStarijih: 0,
    ucitavaStarije: false,
    slanje: false,
  }),
  withRequestStatus(),
  withMethods((store, komentariKvaraService = inject(KomentariKvaraService)) => ({
    ucitaj: rxMethod<number>(
      pipe(
        filter(jeIspravanId),
        tap((kvarId) => patchState(store, { kvarId, komentari: [] }, setPending())),
        switchMap((kvarId) =>
          komentariKvaraService.komentari(kvarId, KOMENTARA_PO_STRANI).pipe(
            tapResponse({
              next: ({ stavke, ukupno }) =>
                patchState(
                  store,
                  {
                    komentari: [...stavke].reverse(),
                    preostaloStarijih: ukupno - stavke.length,
                  },
                  setFulfilled(),
                ),
              error: () => patchState(store, setError('Komentari trenutno ne mogu da se učitaju.')),
            }),
          ),
        ),
      ),
    ),
    ucitajStarije: rxMethod<void>(
      pipe(
        exhaustMap(() => {
          const kvarId = store.kvarId();
          if (kvarId === null) {
            return EMPTY;
          }
          patchState(store, { ucitavaStarije: true });
          const najstariji = store.komentari().at(0);
          return komentariKvaraService.komentari(kvarId, KOMENTARA_PO_STRANI, najstariji?.id).pipe(
            tapResponse({
              next: ({ stavke, ukupno }) =>
                patchState(store, {
                  komentari: [...[...stavke].reverse(), ...store.komentari()],
                  preostaloStarijih: ukupno - stavke.length,
                  ucitavaStarije: false,
                }),
              error: () => patchState(store, { ucitavaStarije: false }),
            }),
          );
        }),
      ),
    ),
    async dodaj(tekst: string): Promise<void> {
      const kvarId = store.kvarId();
      if (kvarId === null) {
        return;
      }
      patchState(store, { slanje: true });
      try {
        const komentar = await firstValueFrom(komentariKvaraService.dodaj(kvarId, tekst));
        patchState(store, { komentari: [...store.komentari(), komentar] });
      } finally {
        patchState(store, { slanje: false });
      }
    },
    async obrisi(id: number): Promise<void> {
      const kvarId = store.kvarId();
      if (kvarId === null) {
        return;
      }
      await firstValueFrom(komentariKvaraService.obrisi(kvarId, id));
      patchState(store, { komentari: store.komentari().filter((k) => k.id !== id) });
    },
  })),
  withReducer(
    on(kvarEvents.azuriran, ({ payload: kvar }, { kvarId, komentari, requestStatus }) => {
      if (kvar.id !== kvarId || requestStatus !== 'fulfilled') {
        return {};
      }
      const poslednjiId = komentari.at(-1)?.id ?? 0;
      const novi = kvar.istorija.flatMap((p) =>
        p.komentar && p.korisnik && p.komentar.id > poslednjiId
          ? [{ ...p.komentar, datumKreiranja: p.datum, korisnik: p.korisnik }]
          : [],
      );
      return novi.length > 0 ? { komentari: [...komentari, ...novi] } : {};
    }),
  ),
);
