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
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { SpratPipe } from '../../../shared/sprat-pipe';
import { formatirajTelefon } from '../../../shared/telefon';
import { AuthStore } from '../../auth/sesija/auth-store';
import { KomentariKvara } from '../komentari-kvara/komentari-kvara';
import { NAZIVI_KATEGORIJA_KVARA } from '../kvar-models';
import { KvarStore } from '../kvar-store';
import { MojRad } from '../moj-rad/moj-rad';
import { OznakeKvara } from '../oznake-kvara/oznake-kvara';
import { PotvrdaKvara } from '../potvrda-kvara/potvrda-kvara';
import { TokKvara } from '../tok-kvara/tok-kvara';
import { UpravljanjeKvarom } from '../upravljanje-kvarom/upravljanje-kvarom';
import { SlikeKvara } from '../slike/slike-kvara/slike-kvara';

@Component({
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    SpratPipe,
    KomentariKvara,
    MojRad,
    OznakeKvara,
    PotvrdaKvara,
    TokKvara,
    UpravljanjeKvarom,
    SlikeKvara,
  ],
  selector: 'app-detalj-kvara',
  styleUrl: './detalj-kvara.scss',
  templateUrl: './detalj-kvara.html',
})
export class DetaljKvara {
  protected readonly store = inject(KvarStore);
  private authStore = inject(AuthStore);
  private readonly porukaAkcije = viewChild.required<ElementRef<HTMLElement>>('porukaAkcije');

  readonly id = input.required({ transform: numberAttribute });

  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;
  protected readonly formatirajTelefon = formatirajTelefon;

  protected readonly upravlja = computed(() => {
    const kvar = this.store.kvar();
    return !!kvar?.smeDaUpravlja && kvar.status !== 'zatvoren' && kvar.status !== 'odbijen';
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
    this.store.ucitajDetalj(this.id);
    afterRenderEffect(() => {
      if (this.store.porukaAkcije()?.fokus) {
        this.porukaAkcije().nativeElement.focus();
      }
    });
  }
}
