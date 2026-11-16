import { Component, computed, input } from '@angular/core';

const RED_PALJENJA = [4, 9, 1, 7, 11, 2, 6, 10, 0, 5, 8, 3];

@Component({
  selector: 'app-fasada',
  templateUrl: './fasada.html',
  styleUrl: './fasada.scss',
  host: { 'aria-hidden': 'true' },
})
export class Fasada {
  readonly upaljeno = input(0);

  protected readonly prozori = computed(() =>
    RED_PALJENJA.map((_, prozor) => RED_PALJENJA.indexOf(prozor) < this.upaljeno()),
  );
}
