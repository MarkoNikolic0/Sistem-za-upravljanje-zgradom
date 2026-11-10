import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../auth-service';
import { StanjePrijave } from '../auth-models';
import { greskaPolja, porukaServera, PREVISE_POKUSAJA } from '../../../shared/forme/greske-servera';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { TRAJANJE_LINKA_MIN } from '../pravila-naloga';

@Component({
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    RouterLink,
    AuthLayout,
  ],
  selector: 'app-zaboravljena-lozinka',
  templateUrl: './zaboravljena-lozinka.html',
})
export class ZaboravljenaLozinka {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private readonly fokusiraj = fokusPosleCrtanja();

  private stanje = inject(Router).currentNavigation()?.extras.state as StanjePrijave | undefined;

  protected readonly trajanjeLinka = TRAJANJE_LINKA_MIN;
  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly poslato = signal('');

  protected readonly forma = this.fb.nonNullable.group({
    email: [this.stanje?.email ?? '', [Validators.required, Validators.email]],
  });

  protected nevazece(): boolean {
    const kontrola = this.forma.controls.email;
    return kontrola.invalid && kontrola.touched;
  }

  protected posalji(): void {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj('#email');
      return;
    }

    const { email } = this.forma.getRawValue();
    this.greska.set('');
    this.salje.set(true);

    this.authService
      .zaboravljenaLozinka(email)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => {
          this.poslato.set(email.trim());
          this.fokusiraj('#poslato');
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  protected stanjeZaPrijavu(): StanjePrijave {
    return { email: this.poslato() || this.forma.controls.email.value.trim() };
  }

  private obradiGresku(err: HttpErrorResponse): void {
    const poruka = greskaPolja(err, 'email');
    if (poruka) {
      const kontrola = this.forma.controls.email;
      kontrola.setErrors({ server: poruka });
      kontrola.markAsTouched();
      this.fokusiraj('#email');
      return;
    }

    this.greska.set(
      err.status === 429
        ? (porukaServera(err) ?? PREVISE_POKUSAJA)
        : 'Server trenutno nije dostupan. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }
}
