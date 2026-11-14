import { Component, computed, input } from '@angular/core';
import { uMnozini } from '../../../shared/tekst/mnozina';
import { DOGADJAJI_NOTIFIKACIJA, Neprocitano } from '../notifikacija-models';

@Component({
  selector: 'app-novo-obavestenje',
  styleUrl: './novo-obavestenje.scss',
  template: `
    <span class="tacka-novo" aria-hidden="true"></span>
    <span><span class="sr-only">Novo: </span>{{ opis() }}</span>
  `,
})
export class NovoObavestenje {
  readonly neprocitano = input.required<Neprocitano>();

  protected readonly opis = computed(() => {
    const { broj, tip } = this.neprocitano();
    const dogadjaj = DOGADJAJI_NOTIFIKACIJA[tip];
    return broj > 1
      ? `${dogadjaj} i još ${uMnozini(broj - 1, 'obaveštenje', 'obaveštenja', 'obaveštenja')}`
      : dogadjaj;
  });
}
