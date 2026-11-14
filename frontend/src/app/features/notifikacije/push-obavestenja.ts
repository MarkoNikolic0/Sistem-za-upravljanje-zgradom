import { computed, DOCUMENT, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/sesija/auth-store';
import { Instalacija } from '../pwa/instalacija';
import { NotifikacijaService } from './notifikacija-service';

export type StanjePusha =
  'nepodrzano' | 'potrebna-instalacija' | 'odbijeno' | 'iskljuceno' | 'ukljuceno';

const KLJUC_VLASNIKA = 'push-korisnik';

@Service()
export class PushObavestenja {
  private swPush = inject(SwPush);
  private notifikacijaService = inject(NotifikacijaService);
  private authStore = inject(AuthStore);
  private instalacija = inject(Instalacija);
  private readonly prozor = inject(DOCUMENT).defaultView!;

  private readonly podrzano =
    this.swPush.isEnabled && 'PushManager' in this.prozor && 'Notification' in this.prozor;
  private readonly dozvola = signal<NotificationPermission>(
    this.podrzano ? Notification.permission : 'default',
  );
  private readonly pretplata = toSignal(this.swPush.subscription, { initialValue: null });
  private poslednjiPosao: Promise<unknown> = Promise.resolve();

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
    const pretplata = await this.swPush.requestSubscription({ serverPublicKey: kljuc });
    try {
      await firstValueFrom(this.notifikacijaService.sacuvajPretplatu(pretplata));
      this.zapamtiVlasnika(this.authStore.korisnik()?.id ?? null);
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
    await this.swPush.unsubscribe().catch(() => undefined);
    this.zapamtiVlasnika(null);
  }

  private async uskladiSaServerom(): Promise<void> {
    if (!this.podrzano) {
      return;
    }
    const pretplata = await firstValueFrom(this.swPush.subscription);
    if (!pretplata) {
      return;
    }
    if (this.vlasnik() !== this.authStore.korisnik()?.id) {
      await this.swPush.unsubscribe().catch(() => undefined);
      this.zapamtiVlasnika(null);
      return;
    }
    await firstValueFrom(this.notifikacijaService.sacuvajPretplatu(pretplata)).catch(
      () => undefined,
    );
  }

  private vlasnik(): number | null {
    try {
      const vrednost = this.prozor.localStorage.getItem(KLJUC_VLASNIKA);
      return vrednost === null ? null : Number(vrednost);
    } catch {
      return null;
    }
  }

  private zapamtiVlasnika(korisnikId: number | null): void {
    try {
      if (korisnikId === null) {
        this.prozor.localStorage.removeItem(KLJUC_VLASNIKA);
      } else {
        this.prozor.localStorage.setItem(KLJUC_VLASNIKA, String(korisnikId));
      }
    } catch {
      return;
    }
  }
}
