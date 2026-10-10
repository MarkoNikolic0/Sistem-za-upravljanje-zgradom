import { Component, inject, input, numberAttribute, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { greskaPolja } from '../../../shared/greske-servera';
import { SpratPipe } from '../../../shared/sprat-pipe';
import { formatirajTelefon } from '../../../shared/telefon';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { NAZIVI_ULOGA } from '../../auth/auth-models';
import { AuthStore } from '../../auth/sesija/auth-store';
import {
  KomentarKvara,
  MAKS_KOMENTAR_KVARA,
  NAZIVI_KATEGORIJA_KVARA,
  NAZIVI_STATUSA_KVARA,
} from '../kvar-models';
import { KvarStore } from '../kvar-store';

// Bar jedan znak koji nije razmak (Validators.required propušta „   “)
const NIJE_PRAZNO = /\S/;

@Component({
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SkeletonModule,
    TextareaModule,
    SpratPipe,
  ],
  providers: [ConfirmationService],
  selector: 'app-detalj-kvara',
  styleUrl: './detalj-kvara.scss',
  templateUrl: './detalj-kvara.html',
})
export class DetaljKvara {
  protected readonly store = inject(KvarStore);
  private authStore = inject(AuthStore);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly id = input.required({ transform: numberAttribute });

  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;
  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;
  protected readonly naziviUloga = NAZIVI_ULOGA;
  protected readonly formatirajTelefon = formatirajTelefon;
  protected readonly maksKomentar = MAKS_KOMENTAR_KVARA;

  protected readonly forma = this.fb.nonNullable.group({
    tekst: [
      '',
      {
        validators: [
          Validators.required,
          Validators.pattern(NIJE_PRAZNO),
          Validators.maxLength(MAKS_KOMENTAR_KVARA),
        ],
        updateOn: 'submit',
      },
    ],
  });
  protected readonly greskaKomentara = signal('');

  constructor() {
    this.store.ucitajDetalj(this.id);
  }

  protected imaGreskuKomentara(): boolean {
    const tekst = this.forma.controls.tekst;
    return !!this.greskaKomentara() || (tekst.invalid && tekst.touched);
  }

  protected smeDaBrise(komentar: KomentarKvara): boolean {
    const ja = this.authStore.korisnik();
    return (
      !!ja && (komentar.korisnik.id === ja.id || ja.uloga === 'upravnik' || ja.uloga === 'admin')
    );
  }

  protected async posaljiKomentar(): Promise<void> {
    const tekst = this.forma.controls.tekst;
    if (tekst.invalid) {
      tekst.markAsTouched();
      this.fokusiraj('#komentar');
      return;
    }
    this.greskaKomentara.set('');
    try {
      await this.store.dodajKomentar(tekst.value.trim());
      this.forma.reset();
      this.fokusiraj('#komentar');
    } catch (err) {
      const poruka = err instanceof HttpErrorResponse ? greskaPolja(err, 'tekst') : undefined;
      this.greskaKomentara.set(poruka ?? 'Komentar nije poslat. Pokušaj ponovo.');
      this.fokusiraj('#komentar');
    }
  }

  protected obrisi(event: Event, komentar: KomentarKvara): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Brisanje komentara',
      message: 'Obrisati ovaj komentar? Ovo ne može da se poništi.',
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        try {
          await this.store.obrisiKomentar(komentar.id);
          this.fokusiraj('#komentari-naslov');
        } catch {
          this.greskaKomentara.set('Komentar nije obrisan. Pokušaj ponovo.');
          this.fokusiraj('#komentar');
        }
      },
      reject: () => dugme.focus(),
    });
  }
}
