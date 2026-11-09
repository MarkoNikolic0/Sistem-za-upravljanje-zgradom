import { Component, input } from '@angular/core';

@Component({
  selector: 'app-traka-kvoruma',
  host: { 'aria-hidden': 'true' },
  styleUrl: './traka-kvoruma.scss',
  templateUrl: './traka-kvoruma.html',
})
export class TrakaKvoruma {
  readonly udeo = input.required<number>();
  readonly prag = input.required<number>();
}
