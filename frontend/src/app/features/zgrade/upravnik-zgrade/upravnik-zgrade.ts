import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AutoCompleteCompleteEvent } from 'primeng/types/autocomplete';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { formatirajTelefon } from '../../../shared/tekst/telefon';
import { AkcijeStore } from '../../../shared/stanje/with-akcije';
import { KorisnikPretrage } from '../../korisnici/korisnik-models';
import { KorisnikService } from '../../korisnici/korisnik-service';
import { ZgradaService } from '../zgrada-service';

const MIN_PRETRAGE = 2;

@Component({
  selector: 'app-upravnik-zgrade',
  imports: [FormsModule, AutoCompleteModule, ButtonModule, MessageModule, SkeletonModule],
  providers: [AkcijeStore],
  templateUrl: './upravnik-zgrade.html',
  styleUrl: './upravnik-zgrade.scss',
})
export class UpravnikZgrade {
  private zgradaService = inject(ZgradaService);
  private korisnikService = inject(KorisnikService);
  private confirmationService = inject(ConfirmationService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgradaId = input.required<number>();
  protected readonly upravnik = this.zgradaService.upravnik(this.zgradaId);
  protected readonly trenutni = computed(() =>
    this.upravnik.hasValue() ? this.upravnik.value().korisnik : null,
  );

  protected readonly izbor = signal(false);
  protected readonly predlozi = signal<KorisnikPretrage[]>([]);
  protected readonly izabran = signal<KorisnikPretrage | null>(null);
  protected readonly greskaPretrage = signal(false);
  protected readonly minPretrage = MIN_PRETRAGE;
  private pretraga = 0;

  protected readonly telefon = formatirajTelefon;

  protected readonly upravljaZgradom = (k: KorisnikPretrage) => k.zgrada !== null;

  protected readonly ime = (k: { ime: string; prezime: string }) => `${k.ime} ${k.prezime}`;

  protected promeniIzbor(vrednost: KorisnikPretrage | string | null): void {
    this.izabran.set(typeof vrednost === 'object' ? vrednost : null);
  }

  protected otvoriIzbor(): void {
    this.akcije.ponisti();
    this.izabran.set(null);
    this.predlozi.set([]);
    this.izbor.set(true);
    this.fokusiraj('#upravnik-pretraga');
  }

  protected zatvoriIzbor(): void {
    this.izbor.set(false);
    this.fokusiraj('#promeni-upravnika');
  }

  protected async pretrazi(event: AutoCompleteCompleteEvent): Promise<void> {
    const pretraga = ++this.pretraga;
    const upit = event.query.trim();
    this.greskaPretrage.set(false);
    if (upit.length < MIN_PRETRAGE) {
      this.predlozi.set([]);
      return;
    }
    try {
      const predlozi = await firstValueFrom(
        this.korisnikService.pretrazi(upit, ['stanar', 'upravnik']),
      );
      if (pretraga === this.pretraga) {
        this.predlozi.set(predlozi);
      }
    } catch {
      if (pretraga === this.pretraga) {
        this.predlozi.set([]);
        this.greskaPretrage.set(true);
      }
    }
  }

  protected postavi(event: Event): void {
    const novi = this.izabran();
    if (novi === null) {
      return;
    }
    const stari = this.trenutni();
    if (stari === null) {
      void this.izvrsiPostavljanje(novi);
      return;
    }
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Promena upravnika',
      message: `${this.ime(novi)} postaje upravnik zgrade, a ${this.ime(stari)} se vraća u stanara i gubi prava upravnika. Ako ne stanuje u zgradi, oglasi koje je objavio se sakrivaju, a obaveštenja ostaju.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Promeni upravnika' },
      accept: () => this.izvrsiPostavljanje(novi),
      reject: () => dugme.focus(),
    });
  }

  protected razresi(event: Event): void {
    const stari = this.trenutni();
    if (stari === null) {
      return;
    }
    const dugme = event.currentTarget as HTMLElement;
    this.akcije.ponisti();
    this.confirmationService.confirm({
      header: 'Razrešenje upravnika',
      message: `${this.ime(stari)} više neće upravljati zgradom i vraća se u stanara. Zgrada ostaje bez upravnika dok ne postaviš novog. Ako ne stanuje u zgradi, oglasi koje je objavio se sakrivaju, a obaveštenja ostaju.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Razreši', severity: 'danger' },
      accept: async () => {
        await this.akcije.izvrsi(
          async () => {
            await firstValueFrom(this.zgradaService.razresiUpravnika(this.zgradaId()));
            this.upravnik.reload();
          },
          `${this.ime(stari)} više nije upravnik zgrade.`,
          'Upravnik nije razrešen. Pokušaj ponovo.',
          () => this.upravnik.reload(),
          { tip: 'uspeh', tekst: 'Zgrada već nema upravnika.' },
        );
        this.fokusiraj('#poruka-upravnika');
      },
      reject: () => dugme.focus(),
    });
  }

  private async izvrsiPostavljanje(novi: KorisnikPretrage): Promise<void> {
    const uspeh = await this.akcije.izvrsi(
      async () => {
        const odgovor = await firstValueFrom(
          this.zgradaService.postaviUpravnika(this.zgradaId(), novi.id),
        );
        this.upravnik.set(odgovor);
      },
      `${this.ime(novi)} je sada upravnik zgrade. Meni upravnika videće kad ponovo otvori aplikaciju.`,
      'Upravnik nije postavljen. Pokušaj ponovo.',
      () => this.upravnik.reload(),
      { tip: 'greska', tekst: 'Korisnik ili zgrada više ne postoje.' },
    );
    if (uspeh) {
      this.izbor.set(false);
    }
    this.fokusiraj('#poruka-upravnika');
  }
}
