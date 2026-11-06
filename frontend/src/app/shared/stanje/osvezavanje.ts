import { DestroyRef, effect, inject } from '@angular/core';

const PROVERA_MS = 60_000;

interface Osvezivo {
  hasValue(): boolean;
  value(): unknown;
  reload(): boolean;
}

export function osveziPosle(resurs: Osvezivo, posleMs: number): void {
  let ucitano = Date.now();
  effect(() => {
    if (resurs.hasValue()) {
      resurs.value();
      ucitano = Date.now();
    }
  });

  const proveri = () => {
    if (document.visibilityState === 'visible' && Date.now() - ucitano > posleMs) {
      ucitano = Date.now();
      resurs.reload();
    }
  };
  const tajmer = setInterval(proveri, PROVERA_MS);
  document.addEventListener('visibilitychange', proveri);
  inject(DestroyRef).onDestroy(() => {
    clearInterval(tajmer);
    document.removeEventListener('visibilitychange', proveri);
  });
}
