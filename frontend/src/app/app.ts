import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { Instalacija } from './features/pwa/instalacija';
import { BezMreze } from './features/pwa/bez-mreze/bez-mreze';
import { NovaVerzija } from './features/pwa/nova-verzija/nova-verzija';
import type { PorukaVerzije } from './features/pwa/nova-verzija/nova-verzija';

@Component({
  imports: [RouterOutlet, NovaVerzija, BezMreze],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly porukaVerzije = signal<PorukaVerzije | null>(null);

  constructor() {
    inject(Instalacija).pokreni();
    const swUpdate = inject(SwUpdate);
    if (!swUpdate.isEnabled) {
      return;
    }
    swUpdate.versionUpdates
      .pipe(
        filter((dogadjaj) => dogadjaj.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() =>
        this.porukaVerzije.set({
          naslov: 'Dostupna je nova verzija aplikacije.',
          opis: 'Osveži da bi koristio najnoviju verziju.',
        }),
      );
    swUpdate.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() =>
      this.porukaVerzije.set({
        naslov: 'Aplikacija mora ponovo da se učita.',
        opis: 'Deo aplikacije više nije dostupan na uređaju.',
      }),
    );
  }
}
