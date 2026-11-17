import { Component, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { KvarDetalj, MAKS_OCENA_KVARA } from '../../kvar-models';
import { DetaljKvaraStore } from '../../detalj-kvara-store';
import { FormaRazloga } from '../../../../shared/forme/forma-razloga/forma-razloga';

@Component({
  imports: [DatePipe, FormsModule, ButtonModule, RatingModule, FormaRazloga],
  selector: 'app-potvrda-kvara',
  styleUrl: './potvrda-kvara.scss',
  templateUrl: './potvrda-kvara.html',
})
export class PotvrdaKvara {
  protected readonly store = inject(DetaljKvaraStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly nijeResenoOtvoreno = signal(false);
  protected readonly ocena = signal<number | null>(null);
  protected readonly maksOcena = MAKS_OCENA_KVARA;

  protected prebaciNijeReseno(): void {
    this.nijeResenoOtvoreno.update((otvoreno) => !otvoreno);
  }

  protected odustaniNijeReseno(): void {
    this.nijeResenoOtvoreno.set(false);
    this.fokusiraj('#nije-reseno');
  }
}
