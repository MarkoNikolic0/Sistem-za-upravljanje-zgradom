import { computed, DOCUMENT, inject, Service, signal } from '@angular/core';
import { lokalnoSkladiste } from '../../shared/lokalno-skladiste';

const KLJUC_POZIV_ZATVOREN = 'poziv-instalacije-zatvoren';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Service()
export class Instalacija {
  private readonly prozor = inject(DOCUMENT).defaultView!;
  private readonly zahtev = signal<BeforeInstallPromptEvent | null>(null);
  private readonly skladiste = lokalnoSkladiste();
  private readonly pozivZatvoren = signal(this.skladiste.procitaj(KLJUC_POZIV_ZATVOREN) === '1');

  readonly instalirana = signal(
    this.prozor.matchMedia('(display-mode: standalone)').matches ||
      (this.prozor.navigator as Navigator & { standalone?: boolean }).standalone === true,
  );

  readonly jeIphone =
    /iPhone|iPad|iPod/.test(this.prozor.navigator.userAgent) ||
    (/Macintosh/.test(this.prozor.navigator.userAgent) && this.prozor.navigator.maxTouchPoints > 1);

  readonly mozeDaSeInstalira = computed(() => this.zahtev() !== null && !this.instalirana());
  readonly trebaUputstvo = computed(() => this.jeIphone && !this.instalirana());
  readonly pozivPrikazan = computed(
    () => !this.pozivZatvoren() && (this.mozeDaSeInstalira() || this.trebaUputstvo()),
  );

  pokreni(): void {
    this.prozor.addEventListener('beforeinstallprompt', (dogadjaj) => {
      dogadjaj.preventDefault();
      this.zahtev.set(dogadjaj as BeforeInstallPromptEvent);
    });
    this.prozor.addEventListener('appinstalled', () => {
      this.zahtev.set(null);
      this.instalirana.set(true);
    });
  }

  async instaliraj(): Promise<void> {
    const zahtev = this.zahtev();
    if (!zahtev) {
      return;
    }
    await zahtev.prompt();
    await zahtev.userChoice;
    this.zahtev.set(null);
  }

  zatvoriPoziv(): void {
    this.skladiste.zapamti(KLJUC_POZIV_ZATVOREN, '1');
    this.pozivZatvoren.set(true);
  }
}
