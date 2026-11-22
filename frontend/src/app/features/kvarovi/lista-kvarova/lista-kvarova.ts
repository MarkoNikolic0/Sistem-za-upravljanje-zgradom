import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SpratPipe } from '../../../shared/spratovi/sprat-pipe';
import { AuthStore } from '../../auth/sesija/auth-store';
import {
  NAZIVI_KATEGORIJA_KVARA,
  NAZIVI_PRIORITETA_KVARA,
  NAZIVI_STATUSA_KVARA,
  StanjeKvara,
} from '../kvar-models';
import {
  BOJE_STATUSA,
  IKONICE_KATEGORIJA,
  KORACI_KVARA,
  OZNAKE_ROKA,
  predjenoKoraka,
} from '../izgled-kvara';
import { jeHitan, jeZavrsen, stanjeRoka } from '../pravila-kvara';
import { ProfileService } from '../../profile/profile-service';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { KvarService } from '../kvar-service';
import { ListaKvarovaStore } from '../lista-kvarova-store';
import { Paginacija } from '../../../shared/liste/paginacija/paginacija';
import { BrojStanaraPipe } from '../broj-stanara-pipe';
import { Store } from '@ngrx/store';
import { notifikacijeFeature } from '../../notifikacije/notifikacija-store/notifikacije-reducer';
import { PozivObavestenja } from '../../notifikacije/poziv-obavestenja/poziv-obavestenja';
import { NovoObavestenje } from '../../notifikacije/novo-obavestenje/novo-obavestenje';
import { osveziNaNotifikaciju } from '../../notifikacije/osvezi-na-notifikaciju';
import { PokusajPonovo } from '../../../shared/pokusaj-ponovo';

@Component({
  imports: [
    PokusajPonovo,
    NovoObavestenje,
    DatePipe,
    FormsModule,
    ButtonModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    SpratPipe,
    RouterLink,
    Paginacija,
    BrojStanaraPipe,
    PozivObavestenja,
  ],
  selector: 'app-lista-kvarova',
  styleUrl: './lista-kvarova.scss',
  templateUrl: './lista-kvarova.html',
})
export class ListaKvarova {
  protected readonly neprocitane = inject(Store).selectSignal(notifikacijeFeature.selectLinkovi);
  protected readonly store = inject(ListaKvarovaStore);
  private authStore = inject(AuthStore);
  private profileService = inject(ProfileService);
  private kvarService = inject(KvarService);

  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;
  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;
  protected readonly ikonice = IKONICE_KATEGORIJA;
  protected readonly boje = BOJE_STATUSA;
  protected readonly koraci = KORACI_KVARA;
  protected readonly predjeno = predjenoKoraka;
  protected readonly oznakeRoka = OZNAKE_ROKA;
  protected readonly stanjeRoka = stanjeRoka;
  protected readonly jeZavrsen = jeZavrsen;
  protected readonly jeHitan = jeHitan;

  private readonly uloga = computed(() => this.authStore.korisnik()?.uloga);
  private readonly profil = this.profileService.osvezenProfil();
  private readonly upravlja = computed(() =>
    this.profil.hasValue() ? this.profil.value().upravlja : [],
  );
  private readonly sveZgrade = computed(
    () => this.uloga() === 'admin' || this.uloga() === 'serviser',
  );
  protected readonly prikaziZgradu = computed(() => this.sveZgrade() || this.upravlja().length > 1);
  protected readonly serviser = computed(() => this.uloga() === 'serviser');
  protected readonly prikaziPratioce = computed(
    () => this.uloga() === 'upravnik' || this.uloga() === 'admin',
  );
  private readonly zgrade = this.kvarService.zgradeSaKvarovima(this.sveZgrade);
  protected readonly listaZgrada = computed(() => {
    if (!this.sveZgrade()) {
      return this.upravlja();
    }
    return this.zgrade.hasValue() ? this.zgrade.value() : [];
  });
  protected readonly opcijeZgrada = computed(() => [
    { id: null, naziv: 'Sve zgrade' },
    ...this.listaZgrada(),
  ]);

  protected readonly imaStan = computed(
    () => this.profil.hasValue() && this.profil.value().stanovi.length > 0,
  );
  protected readonly stanarBezStana = computed(
    () =>
      this.profil.hasValue() &&
      this.profil.value().uloga === 'stanar' &&
      this.profil.value().stanovi.length === 0,
  );

  protected readonly filteri: { label: string; value: StanjeKvara }[] = [
    { label: 'Aktivni', value: 'aktivni' },
    { label: 'Završeni', value: 'zavrseni' },
  ];

  protected readonly opcijeVrsta = [
    { label: 'Sve vrste', value: null },
    ...Object.entries(NAZIVI_KATEGORIJA_KVARA).map(([value, label]) => ({ label, value })),
  ];

  protected readonly opcijePrioriteta = [
    { label: 'Svi prioriteti', value: null },
    ...Object.entries(NAZIVI_PRIORITETA_KVARA).map(([value, label]) => ({ label, value })),
  ];

  protected readonly opisPrazneListe = computed(() => {
    if (this.store.stanje() === 'zavrseni') {
      return 'Ovde će biti kvarovi koji su zatvoreni, odbijeni ili povučeni.';
    }
    if (this.serviser()) {
      return 'Kad ti upravnik dodeli kvar, pojaviće se ovde.';
    }
    if (this.stanarBezStana()) {
      return 'Kad povežeš nalog sa stanom, ovde ćeš videti kvarove svog stana i zgrade.';
    }
    return this.imaStan()
      ? 'Sve radi kako treba. Kad nešto prijaviš, pojaviće se ovde.'
      : 'Sve radi kako treba. Prijave stanara pojaviće se ovde.';
  });

  constructor() {
    this.store.prikaziListu();
    osveziNaNotifikaciju(
      ({ tip, link }) => tip !== 'kvar_komentar' && !!link?.startsWith('/kvarovi/'),
      () => this.store.ucitaj(),
    );
  }
}
