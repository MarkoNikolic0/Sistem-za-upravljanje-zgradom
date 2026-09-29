import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputPasswordModule } from 'primeng/inputpassword';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
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
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  greska = signal('');
  prikaziLozinku = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    lozinka: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }
    const { email, lozinka } = this.loginForm.value;

    this.authService.login(email!, lozinka!).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.greska.set('Pogresan email ili lozinka.'),
    });
  }
}
