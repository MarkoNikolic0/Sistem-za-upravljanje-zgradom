import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { AuthStore } from '../../auth/sesija/auth-store';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { STAVKE_NAVIGACIJE } from '../navigacija';
import { MenuItem } from 'primeng/api';
import { Logo } from '../../../shared/logo/logo';
import { ButtonModule } from 'primeng/button';
import { filter, skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    Logo,
  ],
  selector: 'app-app-layout',
  styleUrl: './app-layout.scss',
  templateUrl: './app-layout.html',
})
export class AppLayout {
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private injector = inject(Injector);
  private readonly sadrzaj = viewChild.required<ElementRef<HTMLElement>>('sadrzaj');

  protected readonly nalogOtvoren = signal(false);
  protected readonly viseOtvoreno = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() =>
        afterNextRender(() => this.sadrzaj().nativeElement.focus(), { injector: this.injector }),
      );
  }

  protected preskoci(event: Event): void {
    event.preventDefault();
    this.sadrzaj().nativeElement.focus();
  }

  protected readonly stavke = computed(() => {
    const uloga = this.authStore.korisnik()?.uloga;
    return uloga ? STAVKE_NAVIGACIJE.filter((s) => s.uloge.includes(uloga)) : [];
  });

  protected readonly imaNavigaciju = computed(() => this.stavke().length >= NAJMANJE_U_TRACI);

  protected readonly stavkeTrake = computed(() => {
    const stavke = this.stavke();
    return stavke.length > NAJVISE_U_TRACI ? stavke.slice(0, NAJVISE_U_TRACI - 1) : stavke;
  });

  protected readonly stavkeVise = computed((): MenuItem[] =>
    this.stavke()
      .slice(this.stavkeTrake().length)
      .map((stavka) => ({
        label: stavka.naziv,
        icon: stavka.ikonica,
        routerLink: stavka.putanja,
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
    await this.authStore.logout();
    await this.router.navigate(['/login']);
  }
}
