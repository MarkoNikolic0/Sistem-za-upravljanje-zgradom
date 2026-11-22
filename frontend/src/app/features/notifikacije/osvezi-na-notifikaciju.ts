import { effect, inject, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
import { Notifikacija } from './notifikacija-models';
import { notifikacijeFeature } from './notifikacija-store/notifikacije-reducer';

export function osveziNaNotifikaciju(
  odgovara: (notifikacija: Notifikacija) => boolean,
  osvezi: () => void,
): void {
  const stigla = inject(Store).selectSignal(notifikacijeFeature.selectPoslednjaStigla);
  const stiglaPreOtvaranja = untracked(stigla);
  effect(() => {
    const notifikacija = stigla()?.notifikacija;
    if (
      notifikacija &&
      notifikacija !== stiglaPreOtvaranja?.notifikacija &&
      untracked(() => odgovara(notifikacija))
    ) {
      untracked(osvezi);
    }
  });
}
