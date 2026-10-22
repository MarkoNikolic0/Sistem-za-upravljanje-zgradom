import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule, TagSeverity } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { greskaPolja } from '../../../../shared/greske-servera';
import { NAZIVI_ULOGA } from '../../../auth/auth-models';
import { AuthStore } from '../../../auth/sesija/auth-store';
import { KomentarKvara, KvarDetalj, MAKS_KOMENTAR_KVARA, StatusKvara } from '../../kvar-models';
import { KomentariKvaraStore } from '../komentari-kvara-store';
import { jeZavrsen, PRAVILA_KOMENTARA_KVARA } from '../../pravila-kvara';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';

interface OznakaRazloga {
  tekst: string;
  boja: TagSeverity;
  ikonica: string;
}

const OZNAKE_RAZLOGA: Partial<Record<StatusKvara, OznakaRazloga>> = {
  u_toku: { tekst: 'Nije rešeno', boja: 'warn', ikonica: 'pi pi-replay' },
  odbijen: { tekst: 'Razlog odbijanja', boja: 'danger', ikonica: 'pi pi-times' },
  povucen: { tekst: 'Prijava povučena', boja: 'secondary', ikonica: 'pi pi-undo' },
};

@Component({
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
  ],
  providers: [ConfirmationService],
  selector: 'app-komentari-kvara',
  styleUrl: './komentari-kvara.scss',
  templateUrl: './komentari-kvara.html',
})
export class KomentariKvara {
  protected readonly store = inject(KomentariKvaraStore);
  private authStore = inject(AuthStore);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly naziviUloga = NAZIVI_ULOGA;
  protected readonly maksKomentar = MAKS_KOMENTAR_KVARA;

  protected readonly zavrsen = computed(() => jeZavrsen(this.kvar().status));

  private readonly razlozi = computed(
    () =>
      new Map(
        this.kvar().istorija.flatMap((p) =>
          p.komentar ? [[p.komentar.id, OZNAKE_RAZLOGA[p.status]] as const] : [],
        ),
      ),
  );

  protected readonly forma = this.fb.nonNullable.group({
    tekst: ['', { validators: PRAVILA_KOMENTARA_KVARA, updateOn: 'submit' }],
  });
  protected readonly greskaKomentara = signal('');

  protected ucitajPonovo(): void {
    this.store.ucitaj(this.kvar().id);
    this.fokusiraj('#komentari-naslov');
  }

  protected komentarNevazeci(): boolean {
    const tekst = this.forma.controls.tekst;
    return tekst.invalid && tekst.touched;
  }

  protected imaGreskuKomentara(): boolean {
    return !!this.greskaKomentara() || this.komentarNevazeci();
  }

  protected oznakaRazloga(komentar: KomentarKvara): OznakaRazloga | undefined {
    return this.razlozi().get(komentar.id);
  }

  protected smeDaBrise(komentar: KomentarKvara): boolean {
    const autor =
      komentar.korisnik.id === this.authStore.korisnik()?.id && !this.oznakaRazloga(komentar);
    return autor || this.kvar().smeDaUpravlja;
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
      await this.store.dodaj(tekst.value.trim());
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
          await this.store.obrisi(komentar.id);
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
