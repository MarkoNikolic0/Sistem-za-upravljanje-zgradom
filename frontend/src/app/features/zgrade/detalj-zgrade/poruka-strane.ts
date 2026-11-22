import { computed, effect, Injectable, Signal, signal, untracked } from '@angular/core';

@Injectable()
export class PorukaStrane {
  private readonly aktivna = signal<string | null>(null);

  prati(kljuc: string, poruka: () => unknown): Signal<boolean> {
    effect(() => {
      if (poruka()) {
        untracked(() => this.aktivna.set(kljuc));
      }
    });
    return computed(() => this.aktivna() === kljuc);
  }
}
