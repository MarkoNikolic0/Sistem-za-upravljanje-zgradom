import { Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { KvarDetalj } from '../../kvar-models';
import { DetaljKvaraStore } from '../../detalj-kvara-store';
import { dolazakUBuducnosti, najkasnijiDolazak } from '../../pravila-kvara';
import { DatePipe } from '@angular/common';

@Component({
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DatePickerModule],
  selector: 'app-dolazak-servisera',
  styleUrl: './dolazak-servisera.scss',
  templateUrl: './dolazak-servisera.html',
})
export class DolazakServisera {
  protected readonly store = inject(DetaljKvaraStore);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly sada = new Date();
  protected readonly najkasnije = computed(() => najkasnijiDolazak(this.kvar().rokResavanja));

  protected readonly forma = this.fb.group({
    dolazak: this.fb.control<Date | null>(null, {
      validators: [Validators.required, dolazakUBuducnosti],
      updateOn: 'submit',
    }),
  });

  private readonly upisanDolazak = computed(
    () => ({ kvarId: this.kvar().id, dolazak: this.kvar().dolazakServisera }),
    { equal: (a, b) => a.kvarId === b.kvarId && a.dolazak === b.dolazak },
  );

  constructor() {
    effect(() => {
      const { dolazak } = this.upisanDolazak();
      this.forma.reset({ dolazak: dolazak ? new Date(dolazak) : null });
    });
  }

  protected greska(): string | null {
    const dolazak = this.forma.controls.dolazak;
    if (!dolazak.touched || dolazak.valid) {
      return null;
    }
    return dolazak.hasError('required')
      ? 'Unesi datum i vreme dolaska.'
      : 'Dolazak ne može biti u prošlosti.';
  }

  protected sacuvaj(): void {
    const dolazak = this.forma.controls.dolazak;
    if (dolazak.invalid || !dolazak.value) {
      dolazak.markAsTouched();
      this.fokusiraj('#dolazak');
      return;
    }
    this.store.postaviDolazak(dolazak.value);
  }
}
