import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { oblik } from '../../../shared/tekst/mnozina';
import { prikazBroja } from '../../../shared/tekst/prikaz-broja';
import { notifikacijeFeature } from '../notifikacija-store/notifikacije-reducer';

@Component({
  selector: 'app-zvonce',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './zvonce.html',
  styleUrl: './zvonce.scss',
})
export class Zvonce {
  private store = inject(Store);
  protected readonly broj = this.store.selectSignal(notifikacijeFeature.selectBrojNeprocitanih);
  private readonly poslednjaStigla = this.store.selectSignal(
    notifikacijeFeature.selectPoslednjaStigla,
  );
  protected readonly zvoni = signal(false);

  protected readonly prikaz = computed(() => prikazBroja(this.broj()));

  protected readonly naziv = computed(() => {
    const broj = this.broj();
    return broj === 0
      ? 'Obaveštenja'
      : `Obaveštenja, ${broj} ${oblik(broj, 'nepročitano', 'nepročitana', 'nepročitanih')}`;
  });

  constructor() {
    effect(() => {
      if (this.poslednjaStigla()?.naStranici === false) {
        this.zvoni.set(true);
      }
    });
  }
}
