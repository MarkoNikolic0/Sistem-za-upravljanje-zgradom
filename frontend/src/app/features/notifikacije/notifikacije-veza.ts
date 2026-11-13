import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Observable, Subscription, switchMap, timer } from 'rxjs';
import { io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/sesija/auth-store';
import { TokenRefresh } from '../auth/sesija/token-refresh';
import { naPrijavu } from '../auth/pristup/povratak';
import { Notifikacija } from './notifikacija-models';

const DOGADJAJ_NOTIFIKACIJA = 'notifikacija';
const PRVA_PAUZA_MS = 1000;
const NAJDUZA_PAUZA_MS = 30_000;

export type DogadjajVeze = { tip: 'povezan' } | { tip: 'notifikacija'; notifikacija: Notifikacija };

@Service()
export class NotifikacijeVeza {
  private authStore = inject(AuthStore);
  private tokenRefresh = inject(TokenRefresh);
  private router = inject(Router);

  dogadjaji(): Observable<DogadjajVeze> {
    return new Observable<DogadjajVeze>((pretplatnik) => {
      const socket = io(`${environment.apiUrl}/notifikacije`, {
        auth: (posalji) => posalji({ token: this.authStore.accessToken() }),
      });
      const osvezavanje = new Subscription();
      let pokusaj = 0;
      let ceka = false;

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
            .pipe(
              switchMap(() => this.tokenRefresh.osvezi()),
              finalize(() => (ceka = false)),
            )
            .subscribe({
              next: () => socket.connect(),
              error: () => void this.router.navigateByUrl(naPrijavu(this.router)),
            }),
        );
      };

      socket.on('connect', () => {
        pokusaj = 0;
        pretplatnik.next({ tip: 'povezan' });
      });
      socket.on(DOGADJAJ_NOTIFIKACIJA, (notifikacija: Notifikacija) =>
        pretplatnik.next({ tip: 'notifikacija', notifikacija }),
      );
      socket.on('connect_error', () => {
        if (!socket.active) {
          poveziSaNovimTokenom();
        }
      });
      socket.on('disconnect', (razlog) => {
        if (razlog === 'io server disconnect') {
          poveziSaNovimTokenom();
        }
      });

      return () => {
        osvezavanje.unsubscribe();
        socket.disconnect();
      };
    });
  }
}
