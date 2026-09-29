import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { ZgradaPreset } from './theme/zgrada-preset';
import { AuthStore } from './features/auth/auth-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAppInitializer(() => inject(AuthStore).pokreniSesiju()),
    providePrimeNG({
      theme: {
        preset: ZgradaPreset,
      },
    }),
  ],
};
