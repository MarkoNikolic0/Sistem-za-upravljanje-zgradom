import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth-service';
import { StanjePrijave } from '../auth-models';
import { InputTextModule } from 'primeng/inputtext';
import { InputPasswordModule } from 'primeng/inputpassword';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PoljeLozinke } from '../../../shared/forme/polje-lozinke/polje-lozinke';
import { AuthLayout } from '../auth-layout/auth-layout';
import { ProveriMejl } from '../proveri-mejl/proveri-mejl';
import { greskaPolja, PREVISE_POKUSAJA } from '../../../shared/forme/greske-servera';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import {
  MAX_DUZINA_IMENA,
  MAX_DUZINA_LOZINKE,
  MIN_DUZINA_LOZINKE,
  PRAVILA_IMENA,
  PRAVILA_LOZINKE,
  TRAJANJE_POTVRDE_SATI,
} from '../pravila-naloga';

type Polje = 'ime' | 'prezime' | 'email' | 'telefon' | 'lozinka';

@Component({
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    InputPasswordModule,
    ButtonModule,
    MessageModule,
    PoljeLozinke,
    RouterLink,
    AuthLayout,
    ProveriMejl,
  ],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private readonly fokusiraj = fokusPosleCrtanja();

  greska = signal('');
  salje = signal(false);
  protected readonly poslato = signal('');
  protected readonly trajanjePotvrde = TRAJANJE_POTVRDE_SATI;
  protected readonly minDuzinaLozinke = MIN_DUZINA_LOZINKE;
  protected readonly maxDuzinaLozinke = MAX_DUZINA_LOZINKE;
  protected readonly maxDuzinaImena = MAX_DUZINA_IMENA;

  registerForm = this.fb.nonNullable.group({
    ime: ['', PRAVILA_IMENA],
    prezime: ['', PRAVILA_IMENA],
    email: ['', [Validators.required, Validators.email]],
    telefon: ['', Validators.required],
    lozinka: ['', PRAVILA_LOZINKE],
  });

  nevazece(polje: Polje): boolean {
    const kontrola = this.registerForm.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.fokusiraj('input.ng-invalid');
      return;
    }

    const podaci = this.registerForm.getRawValue();
    this.greska.set('');
    this.salje.set(true);

    this.authService
      .register(podaci)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => {
          this.poslato.set(podaci.email.trim());
          this.fokusiraj('#poslato');
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    for (const polje of ['ime', 'prezime', 'email', 'telefon', 'lozinka'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        const kontrola = this.registerForm.controls[polje];
        kontrola.setErrors({ server: poruka });
        kontrola.markAsTouched();
        this.fokusiraj('input.ng-invalid');
        return;
      }
    }

    if (err.status === 429) {
      this.greska.set(PREVISE_POKUSAJA);
      return;
    }

    this.greska.set('Registracija nije uspela. Pokušaj ponovo za nekoliko trenutaka.');
  }

  protected stanjeZaLinkove(): StanjePrijave {
    return { email: this.poslato() };
  }
}
