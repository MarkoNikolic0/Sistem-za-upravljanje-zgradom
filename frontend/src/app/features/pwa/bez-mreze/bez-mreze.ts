import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { StanjeMreze } from '../stanje-mreze';

export const ODLOZENA_NAJAVA_MS = 100;

@Component({
  selector: 'app-bez-mreze',
  host: { role: 'status' },
  styleUrl: './bez-mreze.scss',
  templateUrl: './bez-mreze.html',
})
export class BezMreze {
  private readonly stanjeMreze = inject(StanjeMreze);
  private readonly spremno = signal(false);
  protected readonly bezMreze = computed(() => this.spremno() && this.stanjeMreze.bezMreze());

  constructor() {
    afterNextRender(() => setTimeout(() => this.spremno.set(true), ODLOZENA_NAJAVA_MS));
  }
}
