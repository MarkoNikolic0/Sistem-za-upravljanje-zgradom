import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { on, withReducer } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { catchError, EMPTY, exhaustMap, filter, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../../shared/stanje/with-request-status';
import { kvarEvents } from '../kvar-events';
import { KomentarKvara } from '../kvar-models';
import { KOMENTARA_PO_STRANI } from '../pravila-kvara';
import { KomentariKvaraService } from './komentari-kvara-service';
import { jeIspravanId } from '../../../shared/ispravan-id';

function spoji(
  komentari: KomentarKvara[],
  novi: KomentarKvara[],
  obrisani: number[] = [],
): KomentarKvara[] {
  const postojeci = new Set(komentari.map((k) => k.id));
  const najstariji = komentari.at(0)?.id ?? 0;
  const dodati = novi.filter(
    (k) => !postojeci.has(k.id) && !obrisani.includes(k.id) && k.id > najstariji,
  );
  return dodati.length === 0 ? komentari : [...komentari, ...dodati].sort((a, b) => a.id - b.id);
}

interface KomentariKvaraState {
  kvarId: number | null;
  komentari: KomentarKvara[];
  obrisani: number[];
  preostaloStarijih: number;
  ucitavaStarije: boolean;
  slanje: boolean;
}

export const KomentariKvaraStore = signalStore(
  withState<KomentariKvaraState>({
    kvarId: null,
    komentari: [],
    obrisani: [],
    preostaloStarijih: 0,
    ucitavaStarije: false,
    slanje: false,
  }),
  withRequestStatus(),
  withMethods((store, komentariKvaraService = inject(KomentariKvaraService)) => ({
    ucitaj: rxMethod<number>(
      pipe(
        filter(jeIspravanId),
        tap((kvarId) => patchState(store, { kvarId, komentari: [], obrisani: [] }, setPending())),
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
        // Dupli klik ne sme da pošalje drugi zahtev sa istim kursorom i doda iste komentare dvaput.
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
    osveziNove: rxMethod<void>(
      pipe(
        switchMap(() => {
          const kvarId = store.kvarId();
          if (kvarId === null || !store.isFulfilled()) {
            return EMPTY;
          }
          return komentariKvaraService.komentari(kvarId, KOMENTARA_PO_STRANI).pipe(
            tap(({ stavke }) =>
              patchState(store, { komentari: spoji(store.komentari(), stavke, store.obrisani()) }),
            ),
            catchError(() => EMPTY),
          );
        }),
      ),
    ),
    uskladi: rxMethod<void>(
      pipe(
        switchMap(() => {
          const kvarId = store.kvarId();
          if (kvarId === null || !store.isFulfilled()) {
            return EMPTY;
          }
          const pre = new Set(store.komentari().map((k) => k.id));
          return komentariKvaraService.komentari(kvarId, KOMENTARA_PO_STRANI).pipe(
            tap(({ stavke }) => {
              const naServeru = new Set(stavke.map((k) => k.id));
              const granica = stavke.length < KOMENTARA_PO_STRANI ? 0 : Math.min(...naServeru);
              const ostali = store
                .komentari()
                .filter((k) => !pre.has(k.id) || k.id < granica || naServeru.has(k.id));
              patchState(store, { komentari: spoji(ostali, stavke, store.obrisani()) });
            }),
            catchError(() => EMPTY),
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
        patchState(store, { komentari: spoji(store.komentari(), [komentar], store.obrisani()) });
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
      patchState(store, {
        komentari: store.komentari().filter((k) => k.id !== id),
        obrisani: [...store.obrisani(), id],
      });
    },
  })),
  withReducer(
    on(kvarEvents.azuriran, ({ payload: { kvar } }, { kvarId, komentari, requestStatus }) => {
      if (kvar.id !== kvarId || requestStatus !== 'fulfilled') {
        return {};
      }
      const novi = kvar.istorija.flatMap((p) =>
        p.komentar && p.korisnik
          ? [{ ...p.komentar, datumKreiranja: p.datum, korisnik: p.korisnik }]
          : [],
      );
      return { komentari: spoji(komentari, novi) };
    }),
  ),
);
