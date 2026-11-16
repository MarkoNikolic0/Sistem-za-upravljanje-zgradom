import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProfileService } from '../../profile/profile-service';
import { ZahtevService } from '../../zahtevi/zahtev-service';
import { DatePipe } from '@angular/common';
import { PregledZgrada } from '../pregled-zgrada/pregled-zgrada';
import { ZgradeUpravnika } from '../zgrade-upravnika/zgrade-upravnika';
import { Danas } from '../danas/danas';
import { VazniKontakti } from '../../kontakti/vazni-kontakti/vazni-kontakti';
import { DokumentiUkratko } from '../../dokumenti/dokumenti-ukratko/dokumenti-ukratko';
import { zgradeIzProfila } from '../../zgrade/zgrade-korisnika';
import { PozivObavestenja } from '../../notifikacije/poziv-obavestenja/poziv-obavestenja';
import { PozivInstalacije } from '../../pwa/poziv-instalacije/poziv-instalacije';

// Prvi korak za stanara koji jos nema stan
type PrviKorak = 'povezi' | 'ceka' | 'odbijen';

@Component({
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    PregledZgrada,
    ZgradeUpravnika,
    Danas,
    VazniKontakti,
    DokumentiUkratko,
    PozivObavestenja,
    PozivInstalacije,
  ],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private profileService = inject(ProfileService);
  private zahtevService = inject(ZahtevService);

  readonly zgrada = input(undefined, { transform: numberAttribute });

  protected readonly profil = this.profileService.osvezenProfil();
  protected readonly zahtevi = this.zahtevService.mojiZahtevi();
  protected readonly danas = new Date();

  private readonly kolona = viewChild<ElementRef<HTMLElement>>('kolona');
  protected readonly visinaKolone = signal(0);

  constructor() {
    const posmatrac = new ResizeObserver(([unos]) =>
      this.visinaKolone.set(unos.borderBoxSize[0].blockSize),
    );
    effect(() => {
      const kolona = this.kolona();
      posmatrac.disconnect();
      if (kolona) {
        posmatrac.observe(kolona.nativeElement);
      }
    });
    inject(DestroyRef).onDestroy(() => posmatrac.disconnect());
  }

  private readonly viseZgrada = computed(
    () => this.profil.hasValue() && this.profil.value().upravlja.length > 1,
  );

  protected readonly izabrana = computed(() => {
    if (!this.profil.hasValue()) {
      return null;
    }
    const upravlja = this.profil.value().upravlja;
    return upravlja.length > 1 ? (upravlja.find((z) => z.id === this.zgrada()) ?? null) : null;
  });

  protected readonly spisakZgrada = computed(() => this.viseZgrada() && this.izabrana() === null);

  protected readonly zgrade = computed(() => {
    const izabrana = this.izabrana();
    if (izabrana) {
      return [izabrana];
    }
    return this.profil.hasValue() ? zgradeIzProfila(this.profil.value()) : [];
  });

  protected readonly upravlja = computed(() => {
    const izabrana = this.izabrana();
    if (izabrana) {
      return [izabrana.id];
    }
    return this.profil.hasValue() ? this.profil.value().upravlja.map((z) => z.id) : [];
  });

  protected readonly zahteviStigli = computed(
    () => this.zahtevi.hasValue() && !this.zahtevi.isLoading(),
  );

  protected readonly zahtevNaCekanju = computed(() =>
    this.zahtevi.hasValue()
      ? this.zahtevi.value().find((zahtev) => zahtev.status === 'na_cekanju')
      : undefined,
  );

  protected readonly odbijenZahtev = computed(() => {
    const poslednji = this.zahtevi.hasValue() ? this.zahtevi.value()[0] : undefined;
    return poslednji?.status === 'odbijen' ? poslednji : undefined;
  });

  protected readonly prviKorak = computed((): PrviKorak | null => {
    if (!this.profil.hasValue()) {
      return null;
    }
    const profil = this.profil.value();
    if (profil.uloga !== 'stanar' || profil.stanovi.length > 0) {
      return null;
    }
    if (this.zahtevNaCekanju()) {
      return 'ceka';
    }
    return this.odbijenZahtev() ? 'odbijen' : 'povezi';
  });

  protected ponovo(): void {
    this.profil.reload();
    this.zahtevi.reload();
  }
}
