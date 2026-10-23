import { Component, computed, DestroyRef, inject, input, model, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { fokusPosleCrtanja } from '../fokus';
import { jeSlika, PravilaFajlova } from '../fajlovi';
import { IzborFajlova } from '../izbor-fajlova/izbor-fajlova';

let sledeciId = 0;

// Fajlovi izabrani u formi, pre slanja; sadržaj između oznake i liste su već sačuvani fajlovi
@Component({
  imports: [ButtonModule, IzborFajlova],
  selector: 'app-izabrani-fajlovi',
  styleUrl: './izabrani-fajlovi.scss',
  templateUrl: './izabrani-fajlovi.html',
})
export class IzabraniFajlovi {
  private readonly fokusiraj = fokusPosleCrtanja();
  private readonly adrese = new Map<File, string>();

  readonly fajlovi = model.required<File[]>();
  readonly pravila = input.required<PravilaFajlova>();
  readonly oznaka = input.required<string>();
  readonly oznakaDugmeta = input.required<string>();
  readonly vecIma = input(0);
  readonly otpremanje = input(false);

  protected readonly id = `izabrani-fajlovi-${sledeciId++}`;

  protected readonly greska = signal('');
  protected readonly ukupno = computed(() => this.vecIma() + this.fajlovi().length);
  protected readonly pregled = computed(() =>
    this.fajlovi().map((fajl) => ({ fajl, url: this.adrese.get(fajl) })),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.adrese.values()) {
        URL.revokeObjectURL(url);
      }
    });
  }

  protected dodaj(fajlovi: File[]): void {
    for (const fajl of fajlovi.filter((f) => jeSlika(f.type))) {
      this.adrese.set(fajl, URL.createObjectURL(fajl));
    }
    this.greska.set('');
    this.fajlovi.update((postojeci) => [...postojeci, ...fajlovi]);
  }

  protected ukloni(fajl: File): void {
    const url = this.adrese.get(fajl);
    if (url) {
      URL.revokeObjectURL(url);
      this.adrese.delete(fajl);
    }
    this.greska.set('');
    this.fajlovi.update((postojeci) => postojeci.filter((f) => f !== fajl));
    this.fokusiraj('app-izbor-fajlova button');
  }
}
