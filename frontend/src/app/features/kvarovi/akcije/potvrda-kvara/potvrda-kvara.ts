import { Component, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { KvarDetalj, MAKS_KOMENTAR_KVARA } from '../../kvar-models';
import { KvarStore } from '../../kvar-store';
import { PRAVILA_KOMENTARA_KVARA } from '../../pravila-kvara';

@Component({
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, TextareaModule],
  selector: 'app-potvrda-kvara',
  styleUrl: './potvrda-kvara.scss',
  templateUrl: './potvrda-kvara.html',
})
export class PotvrdaKvara {
  protected readonly store = inject(KvarStore);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly maksKomentar = MAKS_KOMENTAR_KVARA;

  protected readonly nijeResenoFormaOtvoreno = signal(false);

  protected readonly formaVracanja = this.fb.nonNullable.group({
    tekst: ['', { validators: PRAVILA_KOMENTARA_KVARA, updateOn: 'submit' }],
  });

  protected razlogNevazeci(): boolean {
    const tekst = this.formaVracanja.controls.tekst;
    return tekst.invalid && tekst.touched;
  }

  protected prebaciNijeReseno(): void {
    if (this.nijeResenoFormaOtvoreno()) {
      this.nijeResenoFormaOtvoreno.set(false);
      return;
    }
    this.formaVracanja.reset();
    this.nijeResenoFormaOtvoreno.set(true);
    this.fokusiraj('#razlog');
  }

  protected odustaniNijeReseno(): void {
    this.nijeResenoFormaOtvoreno.set(false);
    this.fokusiraj('#nije-reseno');
  }

  protected posaljiNijeReseno(): void {
    const tekst = this.formaVracanja.controls.tekst;
    if (tekst.invalid) {
      tekst.markAsTouched();
      this.fokusiraj('#razlog');
      return;
    }
    this.store.vrati(tekst.value.trim());
  }
}
