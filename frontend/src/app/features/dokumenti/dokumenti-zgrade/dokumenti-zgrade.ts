import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { Paginacija } from '../../../shared/liste/paginacija/paginacija';
import { Poruka } from '../../../shared/stanje/poruka';
import { osveziPosle } from '../../../shared/stanje/osvezavanje';
import { AkcijeStore } from '../../../shared/stanje/with-akcije';
import { uMnozini } from '../../../shared/tekst/mnozina';
import { injectZgradeKorisnika, upravljaZgradom } from '../../zgrade/zgrade-korisnika';
import {
  DOKUMENATA_PO_STRANI,
  DokumentZgrade,
  KATEGORIJE_DOKUMENATA,
  KategorijaDokumenta,
  opisKategorije,
  OSVEZI_LINKOVE_MS,
} from '../dokument-models';
import { DokumentService } from '../dokument-service';
import { FormaDokumenta } from '../forma-dokumenta/forma-dokumenta';
import { RedDokumenta } from '../red-dokumenta/red-dokumenta';

@Component({
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    Paginacija,
    FormaDokumenta,
    RedDokumenta,
  ],
  providers: [ConfirmationService, AkcijeStore],
  selector: 'app-dokumenti-zgrade',
  templateUrl: './dokumenti-zgrade.html',
  styleUrl: './dokumenti-zgrade.scss',
})
export class DokumentiZgrade {
  private dokumentService = inject(DokumentService);
  private confirmationService = inject(ConfirmationService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgrada = input(undefined, { transform: numberAttribute });
  readonly novi = input(false, { transform: booleanAttribute });

  private readonly izbor = injectZgradeKorisnika();
  protected readonly profil = this.izbor.profil;
  protected readonly admin = this.izbor.admin;
  protected readonly zgrade = this.izbor.zgrade;
  protected readonly ucitano = this.izbor.ucitano;
  protected readonly greska = this.izbor.greska;

  protected readonly kategorije = KATEGORIJE_DOKUMENATA;
  protected readonly poStrani = DOKUMENATA_PO_STRANI;

  protected readonly zgradaId = linkedSignal<number | null>(() => {
    const zgrade = this.zgrade();
    return (zgrade.find((z) => z.id === this.zgrada()) ?? zgrade[0])?.id ?? null;
  });
  protected readonly kategorija = signal<KategorijaDokumenta | null>(null);
  protected readonly strana = linkedSignal({
    source: () => [this.zgradaId(), this.kategorija()],
    computation: () => 1,
  });

  protected readonly dokumenti = this.dokumentService.dokumenti(
    computed(() => {
      const zgradaId = this.zgradaId();
      return zgradaId === null
        ? null
        : { zgradaId, kategorija: this.kategorija(), strana: this.strana() };
    }),
  );

  protected readonly upravlja = computed(
    () => this.profil.hasValue() && upravljaZgradom(this.profil.value(), this.zgradaId()),
  );

  protected readonly bezStana = computed(
    () =>
      this.profil.hasValue() &&
      this.profil.value().uloga === 'stanar' &&
      this.zgrade().length === 0,
  );

  protected readonly naslovListe = computed(() =>
    this.dokumenti.hasValue()
      ? uMnozini(this.dokumenti.value().ukupno, 'dokument', 'dokumenta', 'dokumenata')
      : 'Dokumenti',
  );

  protected readonly grupe = computed(() => {
    if (!this.dokumenti.hasValue()) {
      return [];
    }
    const stavke = this.dokumenti.value().stavke;
    return this.kategorije
      .filter((k) => this.kategorija() === null || k.kategorija === this.kategorija())
      .map((k) => ({ ...k, dokumenti: stavke.filter((d) => d.kategorija === k.kategorija) }))
      .filter((g) => g.dokumenti.length > 0);
  });

  protected readonly forma = linkedSignal<'novi' | number | null>(() =>
    this.novi() && this.upravlja() ? 'novi' : null,
  );

  protected readonly izabranaKategorija = computed(() => {
    const kategorija = this.kategorija();
    return kategorija && opisKategorije(kategorija);
  });

  constructor() {
    osveziPosle(this.dokumenti, OSVEZI_LINKOVE_MS);
  }

  protected promeniZgradu(id: number): void {
    this.zgradaId.set(id);
    this.forma.set(null);
    this.akcije.ponisti();
  }

  protected promeniKategoriju(kategorija: KategorijaDokumenta | null): void {
    this.kategorija.set(kategorija);
    this.akcije.ponisti();
  }

  protected otvori(forma: 'novi' | number): void {
    this.forma.set(forma);
    this.akcije.ponisti();
  }

  protected zatvori(): void {
    const forma = this.forma();
    this.forma.set(null);
    this.fokusiraj(forma === 'novi' ? '#dodaj-dokument' : `#izmeni-${forma}`);
  }

  protected sacuvan(dokument: DokumentZgrade): void {
    const novi = this.forma() === 'novi';
    this.forma.set(null);
    this.dokumenti.reload();
    this.prikazi({
      tip: 'uspeh',
      tekst: novi
        ? `Dokument „${dokument.naziv}“ je okačen.`
        : `Dokument „${dokument.naziv}“ je izmenjen.`,
    });
  }

  protected zastarelo(tekst: string): void {
    this.forma.set(null);
    this.dokumenti.reload();
    this.prikazi({ tip: 'greska', tekst });
  }

  protected obrisi(event: Event, dokument: DokumentZgrade): void {
    const dugme = event.currentTarget as HTMLElement;
    const zgradaId = this.zgradaId();
    if (zgradaId === null) {
      return;
    }
    this.confirmationService.confirm({
      header: 'Brisanje dokumenta',
      message: `Obrisati dokument „${dokument.naziv}“? Fajl se briše i stanari ga više neće videti.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        const osvezi = () => {
          const poslednjiNaStrani =
            this.strana() > 1 &&
            this.dokumenti.hasValue() &&
            this.dokumenti.value().stavke.length === 1;
          if (poslednjiNaStrani) {
            this.strana.update((s) => s - 1);
          } else {
            this.dokumenti.reload();
          }
        };
        await this.akcije.izvrsiZahtev(
          this.dokumentService.obrisi(zgradaId, dokument.id),
          `Dokument „${dokument.naziv}“ je obrisan.`,
          'Dokument nije obrisan. Pokušaj ponovo.',
          osvezi,
          { tip: 'uspeh', tekst: `Dokument „${dokument.naziv}“ je već obrisan.` },
        );
        if (this.akcije.poruka()) {
          this.fokusiraj('#poruka-dokumenata');
        }
      },
      reject: () => dugme.focus(),
    });
  }

  private prikazi(poruka: Poruka): void {
    this.akcije.prikaziPoruku(poruka);
    this.fokusiraj('#poruka-dokumenata');
  }
}
