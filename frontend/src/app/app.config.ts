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
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { ZgradaPreset } from './theme/zgrada-preset';
import { AuthStore } from './features/auth/sesija/auth-store';
import { authInterceptor } from './features/auth/sesija/auth-interceptor';
import { registerLocaleData } from '@angular/common';
import localeSrLatn from '@angular/common/locales/sr-Latn';
import { PREVOD_PRIMENG } from './theme/prevod-primeng';

registerLocaleData(localeSrLatn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withAutoCleanupInjectors(),
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(AuthStore).pokreniSesiju()),
    { provide: LOCALE_ID, useValue: 'sr-Latn' },
    providePrimeNG({
      license:
        'eyJpZCI6ImRjZTdjNTlkLWEzYmEtNDc0Yy1iOTNlLTU3YmY1Njc3YTUzZiIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3OTI3OTIyNTYsImV4cCI6MTgyNDMyODI1Nn0.7gZFgQqtT2nZ6Iyzi1IrFsfk6WBtPLo5zNuuBg7CTY547X9AzP2PUbHY9sQha5Qw77UIKPG37BMn4T27xoO0Bg',
      overlayAppendTo: 'body',
      translation: PREVOD_PRIMENG,
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
