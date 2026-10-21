import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../../shared/with-request-status';
import { SlikaKvara } from '../kvar-models';
import { SlikaKvaraService } from './slike-kvara-service';

interface SlikeKvaraState {
  slike: SlikaKvara[];
}

export const SlikeKvaraStore = signalStore(
  withState<SlikeKvaraState>({ slike: [] }),
  withRequestStatus(),
  withMethods((store, slikaKvaraService = inject(SlikaKvaraService)) => ({
    ucitaj: rxMethod<number>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap((kvarId) =>
          slikaKvaraService.slike(kvarId).pipe(
            tapResponse({
              next: (slike) => patchState(store, { slike }, setFulfilled()),
              error: () => patchState(store, setError('Slike trenutno ne mogu da se učitaju.')),
            }),
          ),
        ),
      ),
    ),
    async dodaj(kvarId: number, fajl: File): Promise<void> {
      const slika = await firstValueFrom(slikaKvaraService.dodaj(kvarId, fajl));
      patchState(store, { slike: [...store.slike(), slika] });
    },
    async obrisi(id: number): Promise<void> {
      await firstValueFrom(slikaKvaraService.obrisi(id));
      patchState(store, { slike: store.slike().filter((s) => s.id !== id) });
    },
  })),
);
