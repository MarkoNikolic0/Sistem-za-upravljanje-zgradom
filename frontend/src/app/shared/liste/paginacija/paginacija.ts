import { Component, computed, input, output } from '@angular/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';

@Component({
  imports: [PaginatorModule],
  selector: 'app-paginacija',
  styleUrl: './paginacija.scss',
  templateUrl: './paginacija.html',
})
export class Paginacija {
  readonly strana = input.required<number>();
  readonly ukupno = input.required<number>();
  readonly poStrani = input.required<number>();
  readonly promena = output<number>();

  protected readonly prvi = computed(() => (this.strana() - 1) * this.poStrani());

  protected promeni(event: PaginatorState): void {
    this.promena.emit((event.page ?? 0) + 1);
  }
}
