import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  inject,
  provideAppInitializer,
} from '@angular/core';
import {
  provideRouter,
  withAutoCleanupInjectors,
  withComponentInputBinding,
} from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { ZgradaPreset } from './theme/zgrada-preset';
import { AuthStore } from './features/auth/sesija/auth-store';
import { authInterceptor } from './features/auth/sesija/auth-interceptor';
import { registerLocaleData } from '@angular/common';
import localeSrLatn from '@angular/common/locales/sr-Latn';

registerLocaleData(localeSrLatn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withAutoCleanupInjectors(), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(AuthStore).pokreniSesiju()),
    { provide: LOCALE_ID, useValue: 'sr-Latn' },
    providePrimeNG({
      overlayAppendTo: 'body',
      theme: {
        preset: ZgradaPreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
  ],
};
