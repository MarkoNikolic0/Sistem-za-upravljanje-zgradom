import { DestroyRef, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { debounceTime, exhaustMap, filter, tap } from 'rxjs';
import { VezaActions } from './notifikacija-store/notifikacije-actions';
import { VrstaPromene } from './notifikacija-models';

export const GRUPISANJE_MS = 400;
export const PROVERA_MS = 1000;

const OTVOREN_DIJALOG = '[aria-modal=true], dialog[open]';

export function trebaSacekati(document: Document): boolean {
  return document.visibilityState === 'hidden' || document.querySelector(OTVOREN_DIJALOG) !== null;
}

export function osveziNaPromenu(
  vrsta: VrstaPromene,
  osvezi: (ids: number[]) => Promise<unknown> | void,
): void {
  const document = inject(DOCUMENT);
  const cekaju = new Set<number>();
  let unisteno = false;
  inject(DestroyRef).onDestroy(() => (unisteno = true));

  const pauza = () => new Promise((kraj) => setTimeout(kraj, PROVERA_MS));

  async function obradi(): Promise<void> {
    while (cekaju.size > 0 && !unisteno) {
      if (trebaSacekati(document)) {
        await pauza();
        continue;
      }
      const ids = [...cekaju];
      cekaju.clear();
      await Promise.resolve()
        .then(() => osvezi(ids))
        .catch(() => undefined);
    }
  }

  inject(Actions)
    .pipe(
      ofType(VezaActions.promena),
      filter((promena) => promena.vrsta === vrsta),
      tap(({ id }) => cekaju.add(id)),
      debounceTime(GRUPISANJE_MS),
      exhaustMap(() => obradi()),
      takeUntilDestroyed(),
    )
    .subscribe();
}
