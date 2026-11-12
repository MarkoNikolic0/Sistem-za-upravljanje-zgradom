import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { oblik } from '../../../shared/tekst/mnozina';
import { notifikacijeFeature } from '../notifikacija-store/notifikacije-reducer';

const NAJVECI_PRIKAZ = 99;

@Component({
  selector: 'app-zvonce',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './zvonce.html',
  styleUrl: './zvonce.scss',
})
export class Zvonce {
  protected readonly broj = inject(Store).selectSignal(notifikacijeFeature.selectBrojNeprocitanih);
  protected readonly zvoni = signal(false);

  protected readonly prikaz = computed(() =>
    this.broj() > NAJVECI_PRIKAZ ? `${NAJVECI_PRIKAZ}+` : String(this.broj()),
  );

  protected readonly naziv = computed(() => {
    const broj = this.broj();
    return broj === 0
      ? 'Obaveštenja'
      : `Obaveštenja, ${broj} ${oblik(broj, 'nepročitano', 'nepročitana', 'nepročitanih')}`;
  });

  constructor() {
    let prethodni = this.broj();
    effect(() => {
      const broj = this.broj();
      if (broj > prethodni) {
        this.zvoni.set(true);
      }
      prethodni = broj;
    });
  }
}
