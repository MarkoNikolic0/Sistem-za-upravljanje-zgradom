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

const KLJUC_VLASNIKA = 'push-korisnik';

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
  private poslednjiPosao: Promise<unknown> = Promise.resolve();
  private uskladjenaSesija: string | null = null;

  readonly stanje = computed((): StanjePusha => {
    if (!this.podrzano) {
      return this.instalacija.trebaUputstvo() ? 'potrebna-instalacija' : 'nepodrzano';
    }
    if (this.dozvola() === 'denied') {
      return 'odbijeno';
    }
    return this.pretplata() ? 'ukljuceno' : 'iskljuceno';
  });

  async ukljuci(): Promise<void> {
    const dozvola = await Notification.requestPermission();
    this.dozvola.set(dozvola);
    if (dozvola !== 'granted') {
      return;
    }
    return this.redom(() => this.pretplati());
  }

  porukaGreske(greska: unknown): string {
    if (!(greska instanceof GreskaPregledaca)) {
      return PORUKE_GRESKE.veza;
    }
    return 'brave' in this.prozor.navigator ? PORUKE_GRESKE.brave : PORUKE_GRESKE.pregledac;
  }

  iskljuci(): Promise<void> {
    return this.redom(() => this.ukiniPretplatu());
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

  private async ukiniPretplatu(): Promise<void> {
    if (!this.podrzano) {
      return;
    }
    const pretplata = await firstValueFrom(this.swPush.subscription);
    if (!pretplata) {
      return;
    }
    await firstValueFrom(this.notifikacijaService.obrisiPretplatu(pretplata.endpoint)).catch(
      () => undefined,
    );
    await this.zaboravi();
  }

  private async uskladiSaServerom(): Promise<void> {
    if (!this.podrzano) {
      return;
    }
    const pretplata = await firstValueFrom(this.swPush.subscription);
    if (!pretplata) {
      return;
    }
    const korisnik = this.authStore.korisnik();
    if (!korisnik || this.vlasnik() !== korisnik.id) {
      await this.zaboravi();
      return;
    }
    if (korisnik.sid === this.uskladjenaSesija) {
      return;
    }
    await this.sacuvaj(pretplata).catch(() => undefined);
  }

  private async sacuvaj(pretplata: PushSubscription): Promise<void> {
    const korisnik = this.authStore.korisnik();
    await firstValueFrom(this.notifikacijaService.sacuvajPretplatu(pretplata));
    if (korisnik) {
      this.skladiste.zapamti(KLJUC_VLASNIKA, String(korisnik.id));
    } else {
      this.skladiste.obrisi(KLJUC_VLASNIKA);
    }
    this.uskladjenaSesija = korisnik?.sid ?? null;
  }

  private async zaboravi(): Promise<void> {
    await this.swPush.unsubscribe().catch(() => undefined);
    this.skladiste.obrisi(KLJUC_VLASNIKA);
    this.uskladjenaSesija = null;
  }

  private vlasnik(): number | null {
    const vrednost = this.skladiste.procitaj(KLJUC_VLASNIKA);
    return vrednost === null ? null : Number(vrednost);
  }
}
