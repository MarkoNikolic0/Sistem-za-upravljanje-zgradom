import { Component, computed, DestroyRef, inject, input, model, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { IzborSlika } from '../izbor-slika/izbor-slika';
import { MAKS_SLIKA_KVARA } from '../../kvar-models';

@Component({
  imports: [ButtonModule, IzborSlika],
  selector: 'app-slike-prijave',
  styleUrl: './slike-prijave.scss',
  templateUrl: './slike-prijave.html',
})
export class SlikePrijave {
  private readonly fokusiraj = fokusPosleCrtanja();
  private readonly adrese = new Map<File, string>();

  readonly slike = model.required<File[]>();
  readonly otpremanje = input(false);

  protected readonly maksSlika = MAKS_SLIKA_KVARA;
  protected readonly greska = signal('');
  protected readonly pregled = computed(() =>
    this.slike().map((fajl) => ({ fajl, url: this.adrese.get(fajl) ?? '' })),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.adrese.values()) {
        URL.revokeObjectURL(url);
      }
    });
  }

  protected dodaj(fajlovi: File[]): void {
    for (const fajl of fajlovi) {
      this.adrese.set(fajl, URL.createObjectURL(fajl));
    }
    this.greska.set('');
    this.slike.update((slike) => [...slike, ...fajlovi]);
  }

  protected ukloni(fajl: File): void {
    const url = this.adrese.get(fajl);
    if (url) {
      URL.revokeObjectURL(url);
      this.adrese.delete(fajl);
    }
    this.greska.set('');
    this.slike.update((slike) => slike.filter((s) => s !== fajl));
    this.fokusiraj('#dodaj-slike');
  }
}
