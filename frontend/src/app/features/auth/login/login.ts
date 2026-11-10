import { Component, ElementRef, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputPasswordModule } from 'primeng/inputpassword';
import { MessageModule } from 'primeng/message';
import { PoljeLozinke } from '../../../shared/forme/polje-lozinke/polje-lozinke';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthStore } from '../sesija/auth-store';
import { greskaPolja, porukaServera, PREVISE_POKUSAJA } from '../../../shared/forme/greske-servera';
import { StanjePrijave } from '../auth-models';
import { bezbednaAdresa } from '../pristup/povratak';

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
  ],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  private stanje = this.router.currentNavigation()?.extras.state as StanjePrijave | undefined;

  readonly returnUrl = input<string>();

  greska = signal('');
  obavestenje = signal(this.stanje?.obavestenje ?? '');
  salje = signal(false);

  loginForm = this.fb.nonNullable.group({
    email: [this.stanje?.email ?? '', [Validators.required, Validators.email]],
    lozinka: ['', Validators.required],
  });

  nevazece(polje: 'email' | 'lozinka'): boolean {
    const kontrola = this.loginForm.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
      return;
    }

    const { email, lozinka } = this.loginForm.getRawValue();
    this.greska.set('');
    this.obavestenje.set('');
    this.salje.set(true);

    try {
      await this.authStore.login(email, lozinka);
      await this.router.navigateByUrl(bezbednaAdresa(this.returnUrl()));
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.salje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set('Prijava nije uspela. Pokušaj ponovo za nekoliko trenutaka.');
      return;
    }

    const greskaEmaila = greskaPolja(err, 'email');
    if (greskaEmaila) {
      const kontrola = this.loginForm.controls.email;
      kontrola.setErrors({ server: greskaEmaila });
      kontrola.markAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('#email')?.focus();
      return;
    }

    if (err.status === 429) {
      this.greska.set(porukaServera(err) ?? PREVISE_POKUSAJA);
      return;
    }

    if (err.status === 403) {
      this.greska.set(porukaServera(err) ?? 'Nalog je deaktiviran.');
      return;
    }

    this.greska.set(
      err.status === 401
        ? 'Email ili lozinka nisu ispravni.'
        : 'Server trenutno nije dostupan. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }

  stanjeZaLozinku(): StanjePrijave {
    return { email: this.loginForm.controls.email.value.trim() };
  }
}
