import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { NAZIVI_ULOGA } from '../../auth/auth-models';
import { greskaPolja } from '../../../shared/greske-servera';
import { ProfileService } from '../profile-service';
import { ChangePassword } from '../change-password/change-password';
import { RouterLink } from '@angular/router';
import { formatirajTelefon } from '../../../shared/telefon';
import { SpratPipe } from '../../../shared/sprat-pipe';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { MAX_DUZINA_IMENA, PRAVILA_IMENA } from '../../auth/pravila-naloga';
import { TagModule } from 'primeng/tag';

type Polje = 'ime' | 'prezime' | 'telefon';

@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SkeletonModule,
    TagModule,
    ChangePassword,
    RouterLink,
    SpratPipe,
  ],
  selector: 'app-my-profile',
  styleUrl: './my-profile.scss',
  templateUrl: './my-profile.html',
})
export class MyProfile {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly profil = this.profileService.profile();

  protected readonly nazivUloge = computed(() =>
    this.profil.hasValue() ? NAZIVI_ULOGA[this.profil.value().uloga] : '',
  );

  protected readonly telefon = computed(() =>
    this.profil.hasValue() ? formatirajTelefon(this.profil.value().telefon) : '',
  );

  protected readonly izmena = signal(false);
  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly sacuvano = signal(false);

  protected readonly maxDuzinaImena = MAX_DUZINA_IMENA;

  protected readonly forma = this.fb.nonNullable.group({
    ime: ['', PRAVILA_IMENA],
    prezime: ['', PRAVILA_IMENA],
    telefon: ['', Validators.required],
  });

  nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  pocniIzmenu(): void {
    if (!this.profil.hasValue()) {
      return;
    }
    const profil = this.profil.value();
    this.forma.reset({
      ime: profil.ime,
      prezime: profil.prezime,
      telefon: formatirajTelefon(profil.telefon),
    });
    this.greska.set('');
    this.sacuvano.set(false);
    this.izmena.set(true);
    this.fokusiraj('#ime');
  }

  otkazi(): void {
    this.izmena.set(false);
    this.fokusiraj('#izmeni-podatke');
  }

  sacuvaj(): void {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj('input.ng-invalid');
      return;
    }

    this.greska.set('');
    this.salje.set(true);

    this.profileService
      .update(this.forma.getRawValue())
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: (profil) => {
          this.profil.set(profil);
          this.izmena.set(false);
          this.sacuvano.set(true);
          this.fokusiraj('#izmeni-podatke');
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    for (const polje of ['ime', 'prezime', 'telefon'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        const kontrola = this.forma.controls[polje];
        kontrola.setErrors({ server: poruka });
        kontrola.markAsTouched();
        this.fokusiraj(`#${polje}`);
        return;
      }
    }

    this.greska.set('Podaci nisu sačuvani. Pokušaj ponovo za nekoliko trenutaka.');
  }
}
