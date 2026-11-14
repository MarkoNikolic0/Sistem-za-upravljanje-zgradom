import { computed, DOCUMENT, inject, Service, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Service()
export class Instalacija {
  private readonly prozor = inject(DOCUMENT).defaultView!;
  private readonly zahtev = signal<BeforeInstallPromptEvent | null>(null);

  readonly instalirana = signal(
    this.prozor.matchMedia('(display-mode: standalone)').matches ||
      (this.prozor.navigator as Navigator & { standalone?: boolean }).standalone === true,
  );

  readonly jeIphone =
    /iPhone|iPad|iPod/.test(this.prozor.navigator.userAgent) ||
    (/Macintosh/.test(this.prozor.navigator.userAgent) && this.prozor.navigator.maxTouchPoints > 1);

  readonly mozeDaSeInstalira = computed(() => this.zahtev() !== null && !this.instalirana());
  readonly trebaUputstvo = computed(() => this.jeIphone && !this.instalirana());

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
}
