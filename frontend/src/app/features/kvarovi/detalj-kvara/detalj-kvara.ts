import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  NAZIVI_PRIORITETA_KVARA,
  PrioritetKvara,
} from '../kvar-models';
import { KvarStore } from '../kvar-store';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { KvarService } from '../kvar-service';
import { OznakeKvara } from '../oznake-kvara/oznake-kvara';
import { TokKvara } from '../tok-kvara/tok-kvara';
import { TagModule } from 'primeng/tag';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    TextareaModule,
    SpratPipe,
    OznakeKvara,
    TokKvara,
    NgTemplateOutlet,
    TagModule,
  ],
  providers: [ConfirmationService],
  selector: 'app-detalj-kvara',
  styleUrl: './detalj-kvara.scss',
  templateUrl: './detalj-kvara.html',
})
export class DetaljKvara {
  protected readonly store = inject(KvarStore);
  private authStore = inject(AuthStore);
  private kvarService = inject(KvarService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private readonly fokusiraj = fokusPosleCrtanja();
  private readonly porukaAkcije = viewChild.required<ElementRef<HTMLElement>>('porukaAkcije');

  readonly id = input.required({ transform: numberAttribute });

  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;
  protected readonly naziviUloga = NAZIVI_ULOGA;
  protected readonly formatirajTelefon = formatirajTelefon;
  protected readonly maksKomentar = MAKS_KOMENTAR_KVARA;

  protected readonly prioriteti: { label: string; value: PrioritetKvara }[] = [
    { label: NAZIVI_PRIORITETA_KVARA.nisko, value: 'nisko' },
    { label: NAZIVI_PRIORITETA_KVARA.srednje, value: 'srednje' },
    { label: NAZIVI_PRIORITETA_KVARA.hitno, value: 'hitno' },
  ];

  protected readonly upravlja = computed(() => {
    const kvar = this.store.kvar();
    return !!kvar?.smeDaUpravlja && kvar.status !== 'zatvoren' && kvar.status !== 'odbijen';
  });

  protected readonly potvrda = computed(() => {
    const kvar = this.store.kvar();
    return !!kvar?.smeDaPotvrdi && kvar.status === 'resen';
  });

  protected readonly nijeResenoFormaOtvoreno = linkedSignal({
    source: this.potvrda,
    computation: () => false,
  });

  protected readonly vracanja = computed(() => {
    const istorija = this.store.kvar()?.istorija ?? [];
    return istorija.filter((p, i) => p.status === 'u_toku' && istorija[i - 1]?.status === 'resen');
  });
  protected readonly poslednjeVracanje = computed(() => {
    const kvar = this.store.kvar();
    const poslednja = kvar?.istorija.at(-1);
    return kvar?.status === 'u_toku' && poslednja && this.vracanja().includes(poslednja)
      ? poslednja
      : undefined;
  });
  private readonly razloziVracanja = computed(
    () => new Set(this.vracanja().map((p) => p.komentar?.id)),
  );

  protected readonly mojRad = computed(() => {
    const kvar = this.store.kvar();
    const ja = this.authStore.korisnik();
    return (
      ja?.uloga === 'serviser' &&
      kvar?.serviser?.id === ja.id &&
      (kvar.status === 'dodeljen' || kvar.status === 'u_toku')
    );
  });

  private readonly kategorijaZaDodelu = computed(() => {
    const kvar = this.store.kvar();
    return this.upravlja() && (kvar?.status === 'prihvacen' || kvar?.status === 'dodeljen')
      ? kvar.kategorija
      : undefined;
  });
  protected readonly serviseri = this.kvarService.serviseri(this.kategorijaZaDodelu);
  protected readonly opcijeServisera = computed(() =>
    this.serviseri.value().map((s) => ({ id: s.id, naziv: `${s.ime} ${s.prezime}` })),
  );
  protected readonly izabraniServiser = linkedSignal(() => this.store.kvar()?.serviser?.id ?? null);
  protected readonly prioritet = linkedSignal(() => this.store.kvar()?.prioritet);

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

  protected readonly formaVracanja = this.fb.nonNullable.group({
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

  constructor() {
    this.store.ucitajDetalj(this.id);
    afterRenderEffect(() => {
      if (this.store.porukaAkcije()?.fokus) {
        this.porukaAkcije().nativeElement.focus();
      }
    });
  }

  protected komentarNevazeci(): boolean {
    const tekst = this.forma.controls.tekst;
    return tekst.invalid && tekst.touched;
  }

  protected imaGreskuKomentara(): boolean {
    return !!this.greskaKomentara() || this.komentarNevazeci();
  }

  protected razlogNevazeci(): boolean {
    const tekst = this.formaVracanja.controls.tekst;
    return tekst.invalid && tekst.touched;
  }

  protected jeRazlogVracanja(komentar: KomentarKvara): boolean {
    return this.razloziVracanja().has(komentar.id);
  }

  protected smeDaBrise(komentar: KomentarKvara): boolean {
    const autor =
      komentar.korisnik.id === this.authStore.korisnik()?.id && !this.jeRazlogVracanja(komentar);
    return autor || !!this.store.kvar()?.smeDaUpravlja;
  }

  protected prebaciNijeReseno(): void {
    if (this.nijeResenoFormaOtvoreno()) {
      this.nijeResenoFormaOtvoreno.set(false);
      return;
    }
    this.formaVracanja.reset();
    this.nijeResenoFormaOtvoreno.set(true);
    this.fokusiraj('#razlog');
  }

  protected odustaniNijeReseno(): void {
    this.nijeResenoFormaOtvoreno.set(false);
    this.fokusiraj('#nije-reseno');
  }

  protected posaljiNijeReseno(): void {
    const tekst = this.formaVracanja.controls.tekst;
    if (tekst.invalid) {
      tekst.markAsTouched();
      this.fokusiraj('#razlog');
      return;
    }
    this.store.vrati(tekst.value.trim());
  }

  protected mozeDaDodeli(): boolean {
    const izabran = this.izabraniServiser();
    return (
      izabran !== null && izabran !== this.store.kvar()?.serviser?.id && !this.store.akcijaUToku()
    );
  }

  protected dodeli(): void {
    const izabran = this.izabraniServiser();
    if (izabran !== null) {
      this.store.dodeliServisera(izabran);
    }
  }

  protected promeniPrioritet(prioritet: PrioritetKvara): void {
    this.prioritet.set(prioritet);
    this.store.postaviPrioritet(prioritet);
  }

  protected odbij(event: Event): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Odbijanje prijave',
      message: 'Odbiti ovu prijavu kvara? Kvar prelazi u završene i više ne može da se menja.',
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Odbij', severity: 'danger' },
      accept: () => this.store.odbij(),
      reject: () => dugme.focus(),
    });
  }

  protected zatvori(event: Event): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Zatvaranje kvara',
      message: 'Zatvoriti kvar? Kvar prelazi u završene i više ne može da se menja.',
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Zatvori kvar' },
      accept: () => this.store.zatvori(),
      reject: () => dugme.focus(),
    });
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
