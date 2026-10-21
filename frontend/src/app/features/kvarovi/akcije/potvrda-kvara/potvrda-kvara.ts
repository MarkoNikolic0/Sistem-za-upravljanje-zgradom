import { Component, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { KvarDetalj } from '../../kvar-models';
import { DetaljKvaraStore } from '../../detalj-kvara-store';
import { FormaRazloga } from '../forma-razloga/forma-razloga';

@Component({
  imports: [DatePipe, ButtonModule, FormaRazloga],
  selector: 'app-potvrda-kvara',
  styleUrl: './potvrda-kvara.scss',
  templateUrl: './potvrda-kvara.html',
})
export class PotvrdaKvara {
  protected readonly store = inject(DetaljKvaraStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly nijeResenoOtvoreno = signal(false);

  protected prebaciNijeReseno(): void {
    this.nijeResenoOtvoreno.update((otvoreno) => !otvoreno);
  }

  protected odustaniNijeReseno(): void {
    this.nijeResenoOtvoreno.set(false);
    this.fokusiraj('#nije-reseno');
  }
}
