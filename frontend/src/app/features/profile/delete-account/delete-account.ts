import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputPasswordModule } from 'primeng/inputpassword';
import { MessageModule } from 'primeng/message';
import { PoljeLozinke } from '../../../shared/forme/polje-lozinke/polje-lozinke';
import {
  oznaciGreskuPolja,
  porukaServera,
  PREVISE_POKUSAJA,
} from '../../../shared/forme/greske-servera';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { AuthStore } from '../../auth/sesija/auth-store';
import { StanjePrijave } from '../../auth/auth-models';
import { ProfileService } from '../profile-service';

@Component({
  imports: [ReactiveFormsModule, ButtonModule, PoljeLozinke, InputPasswordModule, MessageModule],
  selector: 'app-delete-account',
  templateUrl: './delete-account.html',
})
export class DeleteAccount {
  private profileService = inject(ProfileService);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly upravlja = input(false);
  readonly serviser = input(false);

  protected readonly otvoreno = signal(false);
  protected readonly salje = signal(false);
  protected readonly greska = signal('');

  protected readonly forma = this.fb.nonNullable.group(
    { lozinka: ['', Validators.required] },
    { updateOn: 'submit' },
  );

  nevazece(): boolean {
    const kontrola = this.forma.controls.lozinka;
    return kontrola.invalid && kontrola.touched;
  }

  otvori(): void {
    this.forma.reset();
    this.greska.set('');
    this.otvoreno.set(true);
    this.fokusiraj('#lozinkaBrisanja');
  }

  otkazi(): void {
    this.otvoreno.set(false);
    this.fokusiraj('#obrisi-nalog');
  }

  obrisi(): void {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj('#lozinkaBrisanja');
      return;
    }

    this.greska.set('');
    this.salje.set(true);

    this.profileService
      .obrisiNalog(this.forma.controls.lozinka.value)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => void this.naPrijavu(),
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private async naPrijavu(): Promise<void> {
    this.authStore.ocistiSesiju();
    await this.router.navigate(['/login'], {
      replaceUrl: true,
      state: {
        obavestenje: 'Nalog je obrisan. Potvrdu smo poslali na tvoj email.',
      } satisfies StanjePrijave,
    });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    if (oznaciGreskuPolja(err, this.forma.controls, ['lozinka'])) {
      this.fokusiraj('#lozinkaBrisanja');
      return;
    }
    this.greska.set(
      err.status === 429
        ? (porukaServera(err) ?? PREVISE_POKUSAJA)
        : 'Nalog nije obrisan. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }
}
