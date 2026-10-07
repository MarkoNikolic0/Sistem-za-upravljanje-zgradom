import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth-service';
import { Uloga } from '../auth-models';
import { procitajJwtPayload } from './jwt-payload';

export interface PrijavljenKorisnik {
  id: number;
  email: string;
  uloga: Uloga;
}

type StatusSesije = 'provera' | 'prijavljen' | 'odjavljen';

interface AuthState {
  accessToken: string | null;
  status: StatusSesije;
}

const pocetnoStanje: AuthState = {
  accessToken: null,
  status: 'provera',
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(pocetnoStanje),
  withComputed(({ accessToken, status }) => ({
    jePrijavljen: computed(() => status() === 'prijavljen'),
    korisnik: computed((): PrijavljenKorisnik | null => {
      const token = accessToken();
      if (!token) {
        return null;
      }
      const { sub, email, uloga } = procitajJwtPayload(token);
      return { id: sub, email, uloga };
    }),
  })),
  withMethods((store, authService = inject(AuthService)) => {
    function postaviToken(accessToken: string): void {
      patchState(store, { accessToken, status: 'prijavljen' });
    }

    function ocistiSesiju(): void {
      patchState(store, { accessToken: null, status: 'odjavljen' });
    }

    return {
      postaviToken,
      ocistiSesiju,

      async login(email: string, lozinka: string): Promise<void> {
        const { accessToken } = await firstValueFrom(authService.login(email, lozinka));
        postaviToken(accessToken);
      },

      async pokreniSesiju(): Promise<void> {
        try {
          const { accessToken } = await firstValueFrom(authService.refresh());
          postaviToken(accessToken);
        } catch {
          ocistiSesiju();
        }
      },

      async logout(): Promise<void> {
        try {
          await firstValueFrom(authService.logout());
        } catch {
          // Backend nedostupan: lokalno odjavljujemo svakako
        }
        ocistiSesiju();
      },
    };
  }),
);