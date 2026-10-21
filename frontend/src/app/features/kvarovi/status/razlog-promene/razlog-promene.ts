import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PromenaStatusaKvara, StatusKvara } from '../../kvar-models';

const NASLOVI: Partial<Record<StatusKvara, string>> = {
  u_toku: 'Stanar javlja da kvar nije rešen',
  odbijen: 'Razlog odbijanja',
  povucen: 'Razlog povlačenja',
};

@Component({
  imports: [DatePipe],
  selector: 'app-razlog-promene',
  styleUrl: './razlog-promene.scss',
  templateUrl: './razlog-promene.html',
  host: { '[class]': 'promena().status' },
})
export class RazlogPromene {
  readonly promena = input.required<PromenaStatusaKvara>();

  protected readonly naslov = computed(() => NASLOVI[this.promena().status]);
}
