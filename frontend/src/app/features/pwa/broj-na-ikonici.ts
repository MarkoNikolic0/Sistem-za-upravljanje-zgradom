import { DestroyRef, DOCUMENT, effect, inject, Signal } from '@angular/core';

export function brojNaIkonici(broj: Signal<number>): void {
  const navigator = inject(DOCUMENT).defaultView!.navigator;
  if (!('setAppBadge' in navigator)) {
    return;
  }
  const ocisti = () => void navigator.clearAppBadge().catch(() => undefined);
  effect(() => {
    const n = broj();
    if (n > 0) {
      void navigator.setAppBadge(n).catch(() => undefined);
    } else {
      ocisti();
    }
  });
  inject(DestroyRef).onDestroy(ocisti);
}
