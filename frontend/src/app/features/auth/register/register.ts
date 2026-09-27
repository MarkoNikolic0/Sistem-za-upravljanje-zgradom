import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputPasswordModule } from 'primeng/inputpassword';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { MessageModule } from 'primeng/message';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    InputPasswordModule,
    ButtonModule,
    CardModule,
    FloatLabelModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    RouterLink,
  ],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  greska = signal('');
  prikaziLozinku = false;

  registerForm = this.fb.group({
    ime: ['', Validators.required],
    prezime: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    lozinka: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }
    const { ime, prezime, email, lozinka } = this.registerForm.value;

    this.authService.register(ime!, prezime!, email!, lozinka!).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.greska.set('Greska pri registraciji. Email je mozda vec zauzet!'),
    });
  }
}
