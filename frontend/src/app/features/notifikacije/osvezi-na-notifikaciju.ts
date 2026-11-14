import { effect, inject, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
import { notifikacijeFeature } from './notifikacija-store/notifikacije-reducer';

export function osveziNaNotifikaciju(link: () => string, osvezi: () => void): void {
  const stigla = inject(Store).selectSignal(notifikacijeFeature.selectPoslednjaStigla);
  const stiglaPreOtvaranja = untracked(stigla);
  effect(() => {
    const notifikacija = stigla()?.notifikacija;
    if (
      notifikacija &&
      notifikacija !== stiglaPreOtvaranja?.notifikacija &&
      notifikacija.link === untracked(link)
    ) {
      untracked(osvezi);
    }
  });
}
