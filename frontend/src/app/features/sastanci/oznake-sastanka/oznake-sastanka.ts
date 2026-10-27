import { Component, input } from '@angular/core';
import { Sastanak, VRSTE_SASTANKA } from '../sastanak-models';

@Component({
  selector: 'app-oznake-sastanka',
  host: { class: 'oznake' },
  template: `
    @let s = sastanak();
    @if (s.otkazan) {
      <span class="znacka otkazan">Otkazan</span>
    }
    <span class="znacka" [class.skupstina]="s.vrsta === 'skupstina'">{{
      vrste[s.vrsta].naziv
    }}</span>
    @if (s.hitno) {
      <span class="znacka hitno">Hitna sednica</span>
    }
  `,
})
export class OznakeSastanka {
  readonly sastanak = input.required<Pick<Sastanak, 'vrsta' | 'hitno' | 'otkazan'>>();

  protected readonly vrste = VRSTE_SASTANKA;
}
