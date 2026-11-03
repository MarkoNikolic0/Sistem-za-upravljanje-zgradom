import { signal } from '@angular/core';
import { Menu } from 'primeng/menu';

export function meniReda<T>(kljuc: (stavka: T) => number) {
  const izabran = signal<T | null>(null);
  const otvoren = signal(false);
  let dugme: HTMLElement | null = null;
  return {
    izabran: izabran.asReadonly(),
    otvori(event: MouseEvent, meni: Menu, stavka: T): void {
      izabran.set(stavka);
      dugme = event.currentTarget as HTMLElement;
      meni.toggle(event);
    },
    otvorenZa(stavka: T): boolean {
      const i = izabran();
      return otvoren() && i !== null && kljuc(i) === kljuc(stavka);
    },
    prikazan(vidljiv: boolean): void {
      otvoren.set(vidljiv);
    },
    vratiFokus(): void {
      dugme?.focus();
    },
  };
}
