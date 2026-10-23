import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  numberAttribute,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { SpratPipe } from '../../../shared/pipes/sprat-pipe';
import { formatirajTelefon } from '../../../shared/telefon';
import { AuthStore } from '../../auth/sesija/auth-store';
import {
  NAZIVI_KATEGORIJA_KVARA,
  NAZIVI_STATUSA_KVARA,
  StanjeNavigacijeKvara,
} from '../kvar-models';
import { BOJE_STATUSA, IKONICE_KATEGORIJA } from '../izgled-kvara';
import { DetaljKvaraStore } from '../detalj-kvara-store';
import { MojRad } from '../akcije/moj-rad/moj-rad';
import { PotvrdaKvara } from '../akcije/potvrda-kvara/potvrda-kvara';
import { TokKvara } from '../status/tok-kvara/tok-kvara';
import { UpravljanjeKvarom } from '../akcije/upravljanje-kvarom/upravljanje-kvarom';
import { SlikeKvara } from '../slike/slike-kvara/slike-kvara';
import { PracenjeKvara } from '../akcije/pracenje-kvara/pracenje-kvara';
import { BrojStanaraPipe } from '../../../shared/pipes/broj-stanara-pipe';
import { jeZavrsen, pratiRok, stanjeRoka } from '../pravila-kvara';
import { PovlacenjeKvara } from '../akcije/povlacenje-kvara/povlacenje-kvara';
import { RazlogPromene } from '../status/razlog-promene/razlog-promene';
import { KomentariKvara } from '../komentari/komentari-kvara/komentari-kvara';
import { KomentariKvaraStore } from '../komentari/komentari-kvara-store';

@Component({
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    SpratPipe,
    KomentariKvara,
    MojRad,
    PotvrdaKvara,
    TokKvara,
    UpravljanjeKvarom,
    SlikeKvara,
    PracenjeKvara,
    BrojStanaraPipe,
    PovlacenjeKvara,
    RazlogPromene,
  ],
  providers: [DetaljKvaraStore, KomentariKvaraStore],
  selector: 'app-detalj-kvara',
  styleUrl: './detalj-kvara.scss',
  templateUrl: './detalj-kvara.html',
})
export class DetaljKvara {
  protected readonly store = inject(DetaljKvaraStore);
  private komentariStore = inject(KomentariKvaraStore);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private readonly porukaAkcije = viewChild.required<ElementRef<HTMLElement>>('porukaAkcije');

  readonly id = input.required({ transform: numberAttribute });

  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;
  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;
  protected readonly ikonice = IKONICE_KATEGORIJA;
  protected readonly boje = BOJE_STATUSA;
  protected readonly jeZavrsen = jeZavrsen;

  protected readonly rok = computed(() => {
    const kvar = this.store.kvar();
    const stanje = kvar && stanjeRoka(kvar.status, kvar.rokResavanja);
    return stanje
      ? { prekoracen: 'Rok prekoračen', danas: 'Rok ističe danas', sutra: 'Rok ističe sutra' }[
          stanje
        ]
      : null;
  });

  protected readonly formatirajTelefon = formatirajTelefon;
  protected readonly pratiRok = pratiRok;

  protected readonly upravlja = computed(() => {
    const kvar = this.store.kvar();
    return !!kvar?.smeDaUpravlja && !jeZavrsen(kvar.status);
  });

  protected readonly potvrda = computed(() => {
    const kvar = this.store.kvar();
    return !!kvar?.smeDaPotvrdi && kvar.status === 'resen';
  });

  protected readonly mojRad = computed(() => {
    const kvar = this.store.kvar();
    const ja = this.authStore.korisnik();
    return (
      ja?.uloga === 'serviser' &&
      kvar?.serviser?.id === ja.id &&
      (kvar.status === 'dodeljen' || kvar.status === 'u_toku')
    );
  });

  constructor() {
    const navigacija = this.router.currentNavigation();
    if (navigacija?.trigger === 'imperative') {
      const stanje = navigacija.extras.state as StanjeNavigacijeKvara | undefined;
      this.store.prikaziPosleUcitavanja(stanje?.poruka);
    }
    this.store.ucitaj(this.id);
    this.komentariStore.ucitaj(this.id);
    afterRenderEffect(() => {
      if (this.store.porukaAkcije()?.fokus) {
        this.porukaAkcije().nativeElement.focus();
      }
    });
  }
}
