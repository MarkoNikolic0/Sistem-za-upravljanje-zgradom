import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { MessageModule } from 'primeng/message';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../auth-service';
import { AuthStore } from '../sesija/auth-store';
import { StanjePrijave } from '../auth-models';
import { MAX_DUZINA_LOZINKE, MIN_DUZINA_LOZINKE, PRAVILA_LOZINKE } from '../pravila-naloga';
import { greskaPolja, porukaServera, PREVISE_POKUSAJA } from '../../../shared/forme/greske-servera';
import { fokusPosleCrtanja } from '../../../shared/fokus';

function isteLozinke(grupa: AbstractControl): ValidationErrors | null {
  const { lozinka, ponovljena } = grupa.value as { lozinka: string; ponovljena: string };
  return ponovljena && lozinka !== ponovljena ? { razliciteLozinke: true } : null;
}

@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputPasswordModule,
    MessageModule,
    RouterLink,
    AuthLayout,
  ],
  selector: 'app-nova-lozinka',
  templateUrl: './nova-lozinka.html',
})
export class NovaLozinka {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly minDuzinaLozinke = MIN_DUZINA_LOZINKE;
  protected readonly maxDuzinaLozinke = MAX_DUZINA_LOZINKE;

  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly linkNevazi = signal(false);
  protected readonly sakrijLozinku = signal(true);
  protected readonly sakrijPonovljenu = signal(true);

  protected readonly forma = this.fb.nonNullable.group(
    {
      lozinka: ['', PRAVILA_LOZINKE],
      ponovljena: ['', Validators.required],
    },
    { validators: isteLozinke, updateOn: 'submit' },
  );

  constructor() {
    if (this.token) {
      void this.router.navigate([], { replaceUrl: true });
    }
  }

  protected nevazece(polje: 'lozinka' | 'ponovljena'): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.touched && (kontrola.invalid || (polje === 'ponovljena' && this.razlicite()));
  }

  protected razlicite(): boolean {
    return this.forma.hasError('razliciteLozinke');
  }

  protected sacuvaj(): void {
    if (!this.token) {
      return;
    }
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj(this.forma.controls.lozinka.invalid ? '#lozinka' : '#ponovljena');
      return;
    }

    this.greska.set('');
    this.salje.set(true);

    this.authService
      .novaLozinka(this.token, this.forma.controls.lozinka.value)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => {
          this.authStore.ocistiSesiju();
          void this.router.navigate(['/login'], {
            replaceUrl: true,
            state: {
              obavestenje: 'Lozinka je promenjena. Prijavi se novom lozinkom.',
            } satisfies StanjePrijave,
          });
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    const poruka = greskaPolja(err, 'lozinka');
    if (poruka) {
      const kontrola = this.forma.controls.lozinka;
      kontrola.setErrors({ server: poruka });
      kontrola.markAsTouched();
      this.fokusiraj('#lozinka');
      return;
    }

    if (err.status === 400) {
      this.linkNevazi.set(true);
      this.fokusiraj('#link-nevazi');
      return;
    }

    this.greska.set(
      err.status === 429
        ? (porukaServera(err) ?? PREVISE_POKUSAJA)
        : 'Lozinka nije promenjena. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }
}
