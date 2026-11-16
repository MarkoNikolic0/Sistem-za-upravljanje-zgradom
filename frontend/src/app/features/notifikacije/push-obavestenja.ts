import { computed, DOCUMENT, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { lokalnoSkladiste } from '../../shared/lokalno-skladiste';
import { AuthStore } from '../auth/sesija/auth-store';
import { Instalacija } from '../pwa/instalacija';
import { NotifikacijaService } from './notifikacija-service';

export type StanjePusha =
  'nepodrzano' | 'potrebna-instalacija' | 'odbijeno' | 'iskljuceno' | 'ukljuceno';

type Izbor = 'ukljuceno' | 'iskljuceno';

const kljucIzbora = (korisnikId: number) => `push-izbor-${korisnikId}`;

const PORUKE_GRESKE = {
  veza: 'Uključivanje nije uspelo. Proveri internet vezu i pokušaj ponovo.',
  brave:
    'Brave blokira obaveštenja. U podešavanjima Brave-a, u delu Privatnost i bezbednost, uključi Use Google services for push messaging, ponovo pokreni Brave i klikni Uključi.',
  pregledac:
    'Pregledač nije uspeo da uključi obaveštenja. Pokušaj ponovo ili koristi Chrome ili Edge.',
};

class GreskaPregledaca extends Error {}

@Service()
export class PushObavestenja {
  private swPush = inject(SwPush);
  private notifikacijaService = inject(NotifikacijaService);
  private authStore = inject(AuthStore);
  private instalacija = inject(Instalacija);
  private skladiste = lokalnoSkladiste();
  private readonly prozor = inject(DOCUMENT).defaultView!;

  private readonly podrzano =
    this.swPush.isEnabled && 'PushManager' in this.prozor && 'Notification' in this.prozor;
  private readonly dozvola = signal<NotificationPermission>(
    this.podrzano ? Notification.permission : 'default',
  );
  private readonly pretplata = toSignal(this.swPush.subscription, { initialValue: null });
  private readonly promenaIzbora = signal(0);
  private poslednjiPosao: Promise<unknown> = Promise.resolve();
  private uskladjenaSesija: string | null = null;

  private readonly izbor = computed((): Izbor | null => {
    this.promenaIzbora();
    const korisnik = this.authStore.korisnik();
    const izbor = korisnik && this.skladiste.procitaj(kljucIzbora(korisnik.id));
    return izbor === 'ukljuceno' || izbor === 'iskljuceno' ? izbor : null;
  });

  readonly iskljucio = computed(() => this.izbor() === 'iskljuceno');

  readonly stanje = computed((): StanjePusha => {
    if (!this.podrzano) {
      return this.instalacija.trebaUputstvo() ? 'potrebna-instalacija' : 'nepodrzano';
    }
    if (this.dozvola() === 'denied') {
      return 'odbijeno';
    }
    return this.dozvola() === 'granted' && this.pretplata() && this.izbor() === 'ukljuceno'
      ? 'ukljuceno'
      : 'iskljuceno';
  });

  async ukljuci(): Promise<void> {
    const dozvola = await Notification.requestPermission();
    this.dozvola.set(dozvola);
    if (dozvola !== 'granted') {
      return;
    }
    return this.redom(async () => {
      await this.pretplati();
      this.zapamtiIzbor('ukljuceno');
    });
  }

  porukaGreske(greska: unknown): string {
    if (!(greska instanceof GreskaPregledaca)) {
      return PORUKE_GRESKE.veza;
    }
    return 'brave' in this.prozor.navigator ? PORUKE_GRESKE.brave : PORUKE_GRESKE.pregledac;
  }

  iskljuci(): Promise<void> {
    return this.redom(async () => {
      await this.odvezi();
      this.zapamtiIzbor('iskljuceno');
    });
  }

  sinhronizuj(): Promise<void> {
    return this.redom(() => this.uskladiSaServerom());
  }

  private redom<T>(posao: () => Promise<T>): Promise<T> {
    const rezultat = this.poslednjiPosao.then(posao, posao);
    this.poslednjiPosao = rezultat.catch(() => undefined);
    return rezultat;
  }

  private async pretplati(): Promise<void> {
    const { kljuc } = await firstValueFrom(this.notifikacijaService.pushKljuc());
    const pretplata = await this.swPush
      .requestSubscription({ serverPublicKey: kljuc })
      .catch((greska: unknown) => {
        throw new GreskaPregledaca('Pretplata u pregledaču nije uspela.', { cause: greska });
      });
    try {
      await this.sacuvaj(pretplata);
    } catch (greska) {
      await this.swPush.unsubscribe().catch(() => undefined);
      throw greska;
    }
  }

  private async odvezi(): Promise<void> {
    if (!this.podrzano) {
      return;
    }
    const pretplata = await firstValueFrom(this.swPush.subscription);
    this.uskladjenaSesija = null;
    if (pretplata) {
      await firstValueFrom(this.notifikacijaService.obrisiPretplatu(pretplata.endpoint));
    }
  }

  private async uskladiSaServerom(): Promise<void> {
    const korisnik = this.authStore.korisnik();
    if (!this.podrzano || !korisnik) {
      return;
    }
    this.dozvola.set(Notification.permission);
    if (korisnik.sid === this.uskladjenaSesija) {
      return;
    }
    const pretplata = await firstValueFrom(this.swPush.subscription);
    if (this.izbor() !== 'ukljuceno' || this.dozvola() !== 'granted') {
      if (pretplata) {
        await firstValueFrom(this.notifikacijaService.obrisiPretplatu(pretplata.endpoint)).catch(
          () => undefined,
        );
      }
      this.uskladjenaSesija = korisnik.sid;
      return;
    }
    if (!pretplata) {
      await this.pretplati().catch(() => undefined);
      return;
    }
    await this.sacuvaj(pretplata).catch(() => undefined);
  }

  private async sacuvaj(pretplata: PushSubscription): Promise<void> {
    await firstValueFrom(this.notifikacijaService.sacuvajPretplatu(pretplata));
    this.uskladjenaSesija = this.authStore.korisnik()?.sid ?? null;
  }

  private zapamtiIzbor(izbor: Izbor): void {
    const korisnik = this.authStore.korisnik();
    if (korisnik) {
      this.skladiste.zapamti(kljucIzbora(korisnik.id), izbor);
      this.promenaIzbora.update((broj) => broj + 1);
    }
  }
}
