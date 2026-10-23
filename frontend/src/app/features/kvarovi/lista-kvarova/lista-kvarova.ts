import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SpratPipe } from '../../../shared/pipes/sprat-pipe';
import { AuthStore } from '../../auth/sesija/auth-store';
import {
  Kvar,
  NAZIVI_KATEGORIJA_KVARA,
  NAZIVI_PRIORITETA_KVARA,
  NAZIVI_STATUSA_KVARA,
  StanjeKvara,
} from '../kvar-models';
import { BOJE_STATUSA, IKONICE_KATEGORIJA, KORACI_KVARA, predjenoKoraka } from '../izgled-kvara';
import { jeZavrsen, stanjeRoka } from '../pravila-kvara';
import { ProfileService } from '../../profile/profile-service';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { KvarService } from '../kvar-service';
import { ListaKvarovaStore } from '../lista-kvarova-store';
import { Paginacija } from '../../../shared/paginacija/paginacija';

const OZNAKE_ROKA = { prekoracen: 'Rok prekoračen', danas: 'Rok danas', sutra: 'Rok sutra' };

@Component({
  imports: [
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
  ],
  selector: 'app-lista-kvarova',
  styleUrl: './lista-kvarova.scss',
  templateUrl: './lista-kvarova.html',
})
export class ListaKvarova {
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
  protected readonly jeZavrsen = jeZavrsen;

  private readonly uloga = computed(() => this.authStore.korisnik()?.uloga);
  protected readonly prikaziZgradu = computed(
    () => this.uloga() === 'admin' || this.uloga() === 'serviser',
  );
  protected readonly serviser = computed(() => this.uloga() === 'serviser');
  protected readonly prikaziPratioce = computed(
    () => this.uloga() === 'upravnik' || this.uloga() === 'admin',
  );
  private readonly zgrade = this.kvarService.zgradeSaKvarovima(this.prikaziZgradu);
  protected readonly listaZgrada = computed(() =>
    this.zgrade.hasValue() ? this.zgrade.value() : [],
  );
  protected readonly opcijeZgrada = computed(() => [
    { id: null, naziv: 'Sve zgrade' },
    ...this.listaZgrada(),
  ]);

  private readonly profil = this.profileService.profile();
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

  protected rok(kvar: Kvar): string | null {
    const stanje = stanjeRoka(kvar.status, kvar.rokResavanja);
    return stanje ? OZNAKE_ROKA[stanje] : null;
  }

  constructor() {
    this.store.prikaziListu();
  }
}
