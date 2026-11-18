import { Routes } from '@angular/router';
import { prijavljenGuard } from './features/auth/pristup/prijavljen-guard';
import { gostGuard } from './features/auth/pristup/gost-guard';
import { ulogaGuard } from './features/auth/pristup/uloga-guard';
import { pozivUZgradu } from './features/auth/pristup/poziv-u-zgradu';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [gostGuard],
    title: 'Prijava | Upravljanje zgradom',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    canActivate: [gostGuard],
    title: 'Registracija | Upravljanje zgradom',
  },
  {
    path: 'zaboravljena-lozinka',
    loadComponent: () =>
      import('./features/auth/zahtev-linka/zahtev-linka').then((m) => m.ZahtevLinka),
    canActivate: [gostGuard],
    data: { vrsta: 'lozinka' },
    title: 'Zaboravljena lozinka | Upravljanje zgradom',
  },
  {
    path: 'ponovna-aktivacija',
    loadComponent: () =>
      import('./features/auth/zahtev-linka/zahtev-linka').then((m) => m.ZahtevLinka),
    canActivate: [gostGuard],
    data: { vrsta: 'aktivacija' },
    title: 'Nov link za aktivaciju | Upravljanje zgradom',
  },
  {
    path: 'potvrda-emaila',
    loadComponent: () =>
      import('./features/auth/potvrda-emaila/potvrda-emaila').then((m) => m.PotvrdaEmaila),
    title: 'Aktivacija naloga | Upravljanje zgradom',
  },
  {
    path: 'nova-lozinka',
    loadComponent: () =>
      import('./features/auth/nova-lozinka/nova-lozinka').then((m) => m.NovaLozinka),
    title: 'Nova lozinka | Upravljanje zgradom',
  },
  {
    path: 'poziv/:zgrada',
    redirectTo: pozivUZgradu,
  },
  {
    path: 'plakat',
    canActivate: [prijavljenGuard, ulogaGuard('upravnik', 'admin')],
    loadComponent: () =>
      import('./features/zgrade/plakat-zgrade/plakat-zgrade').then((m) => m.PlakatZgrade),
    title: 'QR kod za stanare | Upravljanje zgradom',
  },
  {
    path: '',
    canActivate: [prijavljenGuard],
    loadChildren: () => import('./features/layout/layout.routes'),
  },
];
