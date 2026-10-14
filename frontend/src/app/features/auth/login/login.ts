import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputPasswordModule } from 'primeng/inputpassword';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthStore } from '../sesija/auth-store';
import { greskaPolja, PREVISE_POKUSAJA } from '../../../shared/greske-servera';

@Component({
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    InputPasswordModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
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

  private registrovanEmail: string | undefined =
    this.router.currentNavigation()?.extras.state?.['registrovanEmail'];

  greska = signal('');
  obavestenje = signal(this.registrovanEmail ? 'Nalog je napravljen. Prijavi se.' : '');
  salje = signal(false);
  sakrijLozinku = signal(true);

  loginForm = this.fb.nonNullable.group({
    email: [this.registrovanEmail ?? '', [Validators.required, Validators.email]],
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
      await this.router.navigate(['/']);
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
      this.greska.set(PREVISE_POKUSAJA);
      return;
    }

    this.greska.set(
      err.status === 401
        ? 'Email ili lozinka nisu ispravni.'
        : 'Server trenutno nije dostupan. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }
}
