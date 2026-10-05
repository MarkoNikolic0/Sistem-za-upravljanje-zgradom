import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth-service';
import { InputTextModule } from 'primeng/inputtext';
import { InputPasswordModule } from 'primeng/inputpassword';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { MessageModule } from 'primeng/message';
import { InputIconModule } from 'primeng/inputicon';
import { AuthLayout } from '../auth-layout/auth-layout';
import { greskaPolja } from '../../../shared/greske-servera';

type Polje = 'ime' | 'prezime' | 'email' | 'telefon' | 'lozinka';

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
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  greska = signal('');
  salje = signal(false);
  sakrijLozinku = signal(true);

  registerForm = this.fb.nonNullable.group({
    ime: ['', Validators.required],
    prezime: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefon: ['', Validators.required],
    lozinka: ['', [Validators.required, Validators.minLength(6)]],
  });

  nevazece(polje: Polje): boolean {
    const kontrola = this.registerForm.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
      return;
    }

    const podaci = this.registerForm.getRawValue();
    this.greska.set('');
    this.salje.set(true);

    this.authService
      .register(podaci)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/login'], { state: { registrovanEmail: podaci.email } }),
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    const greskaTelefona = greskaPolja(err, 'telefon');

    if (greskaTelefona) {
      this.registerForm.controls.telefon.setErrors({ server: greskaTelefona });
      this.registerForm.controls.telefon.markAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('#telefon')?.focus();
      return;
    }

    this.greska.set(
      err.status === 409
        ? 'Nalog sa ovom email adresom već postoji. Prijavi se ili koristi drugu adresu.'
        : 'Registracija nije uspela. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }
}
