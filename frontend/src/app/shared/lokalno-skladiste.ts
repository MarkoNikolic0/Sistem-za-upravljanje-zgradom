import { DOCUMENT, inject } from '@angular/core';

export interface LokalnoSkladiste {
  procitaj(kljuc: string): string | null;
  zapamti(kljuc: string, vrednost: string): void;
  obrisi(kljuc: string): void;
}

export function lokalnoSkladiste(): LokalnoSkladiste {
  const prozor = inject(DOCUMENT).defaultView;
  const bezbedno = <T>(posao: (skladiste: Storage) => T, podrazumevano: T): T => {
    try {
      return prozor ? posao(prozor.localStorage) : podrazumevano;
    } catch {
      return podrazumevano;
    }
  };
  return {
    procitaj: (kljuc) => bezbedno((s) => s.getItem(kljuc), null),
    zapamti: (kljuc, vrednost) => bezbedno((s) => s.setItem(kljuc, vrednost), undefined),
    obrisi: (kljuc) => bezbedno((s) => s.removeItem(kljuc), undefined),
  };
}
