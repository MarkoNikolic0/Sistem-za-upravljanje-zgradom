import { Component, computed, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { Uloga } from '../../auth/auth-models';
import { greskaPolja } from '../../../shared/greske-servera';
import { ProfileService } from '../profile-service';
import { ChangePassword } from '../change-password/change-password';

type Polje = 'ime' | 'prezime' | 'telefon';

const NAZIVI_ULOGA: Record<Uloga, string> = {
  stanar: 'Stanar',
  upravnik: 'Upravnik',
  serviser: 'Serviser',
  admin: 'Administrator',
};

function formatirajTelefon(telefon: string): string {
  try {
    return parsePhoneNumberWithError(telefon).formatNational();
  } catch {
    return telefon;
  }
}

@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SkeletonModule,
    ChangePassword,
  ],
  selector: 'app-my-profile',
  styleUrl: './my-profile.scss',
  templateUrl: './my-profile.html',
})
export class MyProfile {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly profil = this.profileService.profile();

  // hasValue() pre value(): value() baca gresku kad ucitavanje nije uspelo
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

  protected readonly forma = this.fb.nonNullable.group({
    ime: ['', Validators.required],
    prezime: ['', Validators.required],
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
  }

  otkazi(): void {
    this.izmena.set(false);
  }

  sacuvaj(): void {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
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
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    const greskaTelefona = greskaPolja(err, 'telefon');

    if (greskaTelefona) {
      this.forma.controls.telefon.setErrors({ server: greskaTelefona });
      this.forma.controls.telefon.markAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('#telefon')?.focus();
      return;
    }

    this.greska.set('Podaci nisu sačuvani. Pokušaj ponovo za nekoliko trenutaka.');
  }
}
