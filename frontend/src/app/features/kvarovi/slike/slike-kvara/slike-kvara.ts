import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ImageModule } from 'primeng/image';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { greskaPolja } from '../../../../shared/greske-servera';
import { AuthStore } from '../../../auth/sesija/auth-store';
import { KvarDetalj, SlikaKvara } from '../../kvar-models';
import { SlikeKvaraStore } from '../slike-kvara-store';
import { jeZavrsen, PRAVILA_SLIKA_KVARA } from '../../pravila-kvara';
import { IzborFajlova } from '../../../../shared/izbor-fajlova/izbor-fajlova';

interface Poruka {
  tip: 'uspeh' | 'greska';
  tekst: string;
}

@Component({
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    ImageModule,
    MessageModule,
    SkeletonModule,
    IzborFajlova,
  ],
  providers: [SlikeKvaraStore, ConfirmationService],
  selector: 'app-slike-kvara',
  styleUrl: './slike-kvara.scss',
  templateUrl: './slike-kvara.html',
})
export class SlikeKvara {
  protected readonly store = inject(SlikeKvaraStore);
  private authStore = inject(AuthStore);
  private confirmationService = inject(ConfirmationService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly pravila = PRAVILA_SLIKA_KVARA;

  protected readonly otpremanje = signal(false);
  protected readonly poruka = signal<Poruka | null>(null);
  protected readonly mozeJos = computed(
    () => this.store.slike().length < PRAVILA_SLIKA_KVARA.maksBroj,
  );
  protected readonly zavrsen = computed(() => jeZavrsen(this.kvar().status));

  constructor() {
    this.store.ucitaj(computed(() => this.kvar().id));
  }

  protected ucitajPonovo(): void {
    this.store.ucitaj(this.kvar().id);
    this.fokusiraj('#slike-naslov');
  }

  protected opis(slika: SlikaKvara, redniBroj: number): string {
    const autor = slika.korisnik ? ` · ${slika.korisnik.ime} ${slika.korisnik.prezime}` : '';
    return `Slika ${redniBroj} od ${this.store.slike().length}${autor}`;
  }

  protected smeDaBrise(slika: SlikaKvara): boolean {
    return slika.korisnik?.id === this.authStore.korisnik()?.id || this.kvar().smeDaUpravlja;
  }

  protected async otpremi(fajlovi: File[]): Promise<void> {
    const kvarId = this.kvar().id;
    const nisuDodate: string[] = [];
    let razlog = '';
    this.poruka.set(null);
    this.otpremanje.set(true);
    for (const fajl of fajlovi) {
      try {
        await this.store.dodaj(kvarId, fajl);
      } catch (err) {
        nisuDodate.push(`„${fajl.name}“`);
        razlog ||= this.razlog(err);
      }
    }
    this.otpremanje.set(false);

    if (nisuDodate.length > 0) {
      this.poruka.set({ tip: 'greska', tekst: `Nije dodato: ${nisuDodate.join(', ')}. ${razlog}` });
    } else {
      this.poruka.set({
        tip: 'uspeh',
        tekst: fajlovi.length === 1 ? 'Slika je dodata.' : 'Slike su dodate.',
      });
    }
    this.fokusiraj(this.mozeJos() ? 'app-izbor-fajlova button' : '#slike-naslov');
  }

  protected obrisi(event: Event, slika: SlikaKvara): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Brisanje slike',
      message: 'Obrisati ovu sliku? Ovo ne može da se poništi.',
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        try {
          await this.store.obrisi(slika.id);
          this.poruka.set(null);
          this.fokusiraj('#slike-naslov');
        } catch {
          this.poruka.set({ tip: 'greska', tekst: 'Slika nije obrisana. Pokušaj ponovo.' });
          dugme.focus();
        }
      },
      reject: () => dugme.focus(),
    });
  }

  private razlog(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 413) {
        return `Slika mora biti manja od ${PRAVILA_SLIKA_KVARA.maksMb} MB.`;
      }
      const poruka = greskaPolja(err, 'slika');
      if (poruka) {
        return poruka;
      }
    }
    return 'Pokušaj ponovo.';
  }
}
