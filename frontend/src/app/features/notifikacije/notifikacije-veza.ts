import { DOCUMENT, inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription, switchMap, timer } from 'rxjs';
import { io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/sesija/auth-store';
import { TokenRefresh } from '../auth/sesija/token-refresh';
import { procitajJwtPayload } from '../auth/sesija/jwt-payload';
import { naPrijavu } from '../auth/pristup/povratak';
import { Notifikacija } from './notifikacija-models';

const DOGADJAJ_NOTIFIKACIJA = 'notifikacija';
const DOGADJAJ_NOV_OGLAS = 'nov-oglas';
const DOGADJAJ_VIDLJIVOST = 'vidljivost';
const DOGADJAJ_TOKEN = 'token';
const PRVA_PAUZA_MS = 1000;
const NAJDUZA_PAUZA_MS = 30_000;
const OBNOVA_PRE_ISTEKA_MS = 60_000;
const NAJKRACA_PAUZA_OBNOVE_MS = 30_000;

const jeIstekla = (greska: unknown) => greska instanceof HttpErrorResponse && greska.status === 401;

export type DogadjajVeze =
  { tip: 'povezan' } | { tip: 'notifikacija'; notifikacija: Notifikacija } | { tip: 'nov-oglas' };

@Service()
export class NotifikacijeVeza {
  private authStore = inject(AuthStore);
  private tokenRefresh = inject(TokenRefresh);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  dogadjaji(): Observable<DogadjajVeze> {
    return new Observable<DogadjajVeze>((pretplatnik) => {
      const vidljiv = () => this.document.visibilityState === 'visible';
      const socket = io(`${environment.apiUrl}/notifikacije`, {
        auth: (posalji) => posalji({ token: this.authStore.accessToken(), vidljiv: vidljiv() }),
        closeOnBeforeunload: true,
      });
      const javiVidljivost = () => {
        if (socket.connected) {
          socket.emit(DOGADJAJ_VIDLJIVOST, vidljiv());
        }
      };
      this.document.addEventListener('visibilitychange', javiVidljivost);
      const osvezavanje = new Subscription();
      let obnova = Subscription.EMPTY;
      let pokusaj = 0;
      let ceka = false;

      const idiNaPrijavu = () => void this.router.navigateByUrl(naPrijavu(this.router));

      const zakaziObnovu = () => {
        obnova.unsubscribe();
        const token = this.authStore.accessToken();
        if (!token) {
          return;
        }
        const pauza = Math.max(
          NAJKRACA_PAUZA_OBNOVE_MS,
          procitajJwtPayload(token).exp * 1000 - Date.now() - OBNOVA_PRE_ISTEKA_MS,
        );
        obnova = timer(pauza)
          .pipe(switchMap(() => this.tokenRefresh.osvezi()))
          .subscribe({
            next: (novi) => {
              if (socket.connected) {
                socket.emit(DOGADJAJ_TOKEN, novi);
                zakaziObnovu();
              }
            },
            error: (greska: unknown) => {
              if (jeIstekla(greska)) {
                idiNaPrijavu();
              }
            },
          });
      };

      const poveziSaNovimTokenom = () => {
        if (ceka) {
          return;
        }
        ceka = true;
        const pauza =
          pokusaj === 0 ? 0 : Math.min(PRVA_PAUZA_MS * 2 ** (pokusaj - 1), NAJDUZA_PAUZA_MS);
        pokusaj++;
        osvezavanje.add(
          timer(pauza)
            .pipe(switchMap(() => this.tokenRefresh.osvezi()))
            .subscribe({
              next: () => {
                ceka = false;
                socket.connect();
              },
              error: (greska: unknown) => {
                ceka = false;
                if (jeIstekla(greska)) {
                  idiNaPrijavu();
                } else {
                  poveziSaNovimTokenom();
                }
              },
            }),
        );
      };

      socket.on('connect', () => {
        pokusaj = 0;
        zakaziObnovu();
        pretplatnik.next({ tip: 'povezan' });
      });
      socket.on(DOGADJAJ_NOTIFIKACIJA, (notifikacija: Notifikacija) =>
        pretplatnik.next({ tip: 'notifikacija', notifikacija }),
      );
      socket.on(DOGADJAJ_NOV_OGLAS, () => pretplatnik.next({ tip: 'nov-oglas' }));
      socket.on('connect_error', () => {
        if (!socket.active) {
          poveziSaNovimTokenom();
        }
      });
      socket.on('disconnect', (razlog) => {
        obnova.unsubscribe();
        if (razlog === 'io server disconnect') {
          poveziSaNovimTokenom();
        }
      });

      return () => {
        this.document.removeEventListener('visibilitychange', javiVidljivost);
        osvezavanje.unsubscribe();
        obnova.unsubscribe();
        socket.disconnect();
      };
    });
  }
}
