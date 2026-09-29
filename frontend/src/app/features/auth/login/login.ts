import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputPasswordModule } from 'primeng/inputpassword';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AuthShell } from '../auth-shell/auth-shell';

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
    AuthShell,
  ],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  private registrovanEmail: string | undefined = history.state?.registrovanEmail;

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

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
      return;
    }

    const { email, lozinka } = this.loginForm.getRawValue();
    this.greska.set('');
    this.obavestenje.set('');
    this.salje.set(true);

    this.authService
      .login(email, lozinka)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err: HttpErrorResponse) =>
          this.greska.set(
            err.status === 401
              ? 'Email ili lozinka nisu ispravni.'
              : 'Server trenutno nije dostupan. Pokušaj ponovo za nekoliko trenutaka.',
          ),
      });
  }
}
