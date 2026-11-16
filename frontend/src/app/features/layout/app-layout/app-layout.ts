import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { AuthStore } from '../../auth/sesija/auth-store';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { STAVKE_NAVIGACIJE } from '../navigacija';
import { MenuItem, MessageService } from 'primeng/api';
import { Logo } from '../../../shared/logo/logo';
import { ButtonModule } from 'primeng/button';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { filter, skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ToastModule } from 'primeng/toast';
import { Zvonce } from '../../notifikacije/zvonce/zvonce';
import { KLJUC_TOASTA, Notifikacija } from '../../notifikacije/notifikacija-models';
import { IkonicaNotifikacije } from '../../notifikacije/ikonica-notifikacije/ikonica-notifikacije';
import {
  NotifikacijeActions,
  VezaActions,
} from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { notifikacijeFeature } from '../../notifikacije/notifikacija-store/notifikacije-reducer';
import { cekaGlasFeature } from '../../glasanje/ceka-glas-store/ceka-glas-reducer';
import { neprocitaniOglasiFeature } from '../../oglasi/neprocitani-oglasi-store/neprocitani-oglasi-reducer';
import { brojNaIkonici } from '../../pwa/broj-na-ikonici';
import { PushObavestenja } from '../../notifikacije/push-obavestenja';

const NAJMANJE_U_TRACI = 3;
const NAJVISE_U_TRACI = 5;

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    MenuModule,
    SidebarModule,
    ToastModule,
    Logo,
    Zvonce,
    IkonicaNotifikacije,
  ],
  selector: 'app-app-layout',
  styleUrl: './app-layout.scss',
  templateUrl: './app-layout.html',
})
export class AppLayout {
  private authStore = inject(AuthStore);
  private push = inject(PushObavestenja);
  private router = inject(Router);
  private store = inject(Store);
  private messageService = inject(MessageService);
  private readonly fokusiraj = fokusPosleCrtanja();
  protected readonly kljucToasta = KLJUC_TOASTA;
  protected readonly opisTacke = 'ima novo';
  private readonly brojOglasa = this.store.selectSignal(neprocitaniOglasiFeature.selectBroj);
  private readonly cekaGlas = this.store.selectSignal(cekaGlasFeature.selectIma);
  private readonly odeljciNeprocitanih = this.store.selectSignal(
    notifikacijeFeature.selectOdeljciNeprocitanih,
  );

  protected readonly nalogOtvoren = signal(false);
  protected readonly viseOtvoreno = signal(false);

  constructor() {
    this.store.dispatch(VezaActions.pokreni());
    inject(DestroyRef).onDestroy(() => this.store.dispatch(VezaActions.zaustavi()));
    brojNaIkonici(this.store.selectSignal(notifikacijeFeature.selectBrojNeprocitanih));
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.fokusiraj('#sadrzaj'));
  }

  protected otvori(notifikacija: Notifikacija): void {
    this.store.dispatch(NotifikacijeActions.procitaj({ notifikacija }));
    this.messageService.clear(KLJUC_TOASTA);
  }

  protected preskoci(event: Event): void {
    event.preventDefault();
    this.fokusiraj('#sadrzaj');
  }

  protected readonly stavke = computed(() => {
    const uloga = this.authStore.korisnik()?.uloga;
    const imaNovihOglasa = this.brojOglasa() > 0;
    const cekaGlas = this.cekaGlas();
    const odeljci = this.odeljciNeprocitanih();
    return uloga
      ? STAVKE_NAVIGACIJE.filter((s) => s.uloge.includes(uloga)).map((s) => {
          const cekaTvojGlas = s.putanja === '/glasanje' && cekaGlas;
          return {
            ...s,
            tacka:
              cekaTvojGlas || odeljci.has(s.putanja) || (s.putanja === '/oglasi' && imaNovihOglasa),
            opisTacke: cekaTvojGlas ? 'čeka tvoj glas' : this.opisTacke,
          };
        })
      : [];
  });

  protected readonly imaNavigaciju = computed(() => this.stavke().length >= NAJMANJE_U_TRACI);

  protected readonly stavkeTrake = computed(() => {
    const stavke = this.stavke();
    return stavke.length > NAJVISE_U_TRACI ? stavke.slice(0, NAJVISE_U_TRACI - 1) : stavke;
  });

  private readonly ostaleStavke = computed(() => this.stavke().slice(this.stavkeTrake().length));

  protected readonly tackaVise = computed(() => this.ostaleStavke().some((stavka) => stavka.tacka));

  protected readonly stavkeVise = computed((): MenuItem[] =>
    this.ostaleStavke().map((stavka) => ({
      label: stavka.naziv,
      icon: stavka.ikonica,
      routerLink: stavka.putanja,
      styleClass: stavka.tacka ? 'ima-novo' : undefined,
    })),
  );

  protected readonly meniNaloga = computed((): MenuItem[] => {
    const uloga = this.authStore.korisnik()?.uloga;
    const zivi = uloga === 'stanar' || uloga === 'upravnik';
    return [
      { label: 'Moj profil', icon: 'pi pi-user', routerLink: '/profil' },
      ...(zivi
        ? [{ label: 'Povezivanje sa stanom', icon: 'pi pi-link', routerLink: '/povezivanje' }]
        : []),
      { separator: true },
      { label: 'Odjavi se', icon: 'pi pi-sign-out', command: () => this.odjava() },
    ];
  });

  private async odjava() {
    await this.push.odjavi();
    await this.authStore.logout();
    await this.router.navigate(['/login']);
  }
}
