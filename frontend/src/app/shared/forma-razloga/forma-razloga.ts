import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { fokusPosleCrtanja } from '../fokus';
import { NIJE_PRAZNO } from '../nije-prazno';

export const MAKS_RAZLOGA = 1000;

let sledeciId = 0;

@Component({
  imports: [ReactiveFormsModule, ButtonModule, TextareaModule],
  selector: 'app-forma-razloga',
  styleUrl: './forma-razloga.scss',
  templateUrl: './forma-razloga.html',
})
export class FormaRazloga implements OnInit {
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly oznaka = input.required<string>();
  readonly natpis = input.required<string>();
  readonly pomoc = input<string>();
  readonly obavezan = input(true);
  readonly porukaGreske = input('Napiši razlog.');
  readonly opasno = input(false);
  readonly slanje = input(false);

  readonly posalji = output<string>();
  readonly odustani = output<void>();

  protected readonly maksRazloga = MAKS_RAZLOGA;

  protected readonly idPolja = `razlog-${sledeciId++}`;

  protected readonly forma = this.fb.nonNullable.group({
    tekst: ['', { validators: Validators.maxLength(MAKS_RAZLOGA), updateOn: 'submit' }],
  });

  constructor() {
    this.fokusiraj(`#${this.idPolja}`);
  }

  ngOnInit(): void {
    if (this.obavezan()) {
      this.forma.controls.tekst.addValidators([
        Validators.required,
        Validators.pattern(NIJE_PRAZNO),
      ]);
    }
  }

  protected nevazeci(): boolean {
    const tekst = this.forma.controls.tekst;
    return tekst.invalid && tekst.touched;
  }

  protected opis(): string | null {
    const ids = [];
    if (this.pomoc()) {
      ids.push(`${this.idPolja}-pomoc`);
    }
    if (this.nevazeci()) {
      ids.push(`${this.idPolja}-greska`);
    }
    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected posaljiRazlog(): void {
    const tekst = this.forma.controls.tekst;
    if (tekst.invalid) {
      tekst.markAsTouched();
      this.fokusiraj(`#${this.idPolja}`);
      return;
    }
    this.posalji.emit(tekst.value.trim());
  }
}
