import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Home } from './features/dashboard/home/home';
import { prijavljenGuard } from './features/auth/pristup/prijavljen-guard';
import { gostGuard } from './features/auth/pristup/gost-guard';
import { ulogaGuard } from './features/auth/pristup/uloga-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
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
    path: '',
    loadComponent: () => import('./features/layout/app-layout/app-layout').then((m) => m.AppLayout),
    canActivate: [prijavljenGuard],
    children: [
      {
        path: '',
        component: Home,
        title: 'Početna | Upravljanje zgradom',
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profile/my-profile/my-profile').then((m) => m.MyProfile),
        title: 'Moj profil | Upravljanje zgradom',
      },
      {
        path: 'povezivanje',
        loadComponent: () =>
          import('./features/zahtevi/novi-zahtev/novi-zahtev').then((m) => m.NoviZahtev),
        title: 'Povezivanje sa stanom | Upravljanje zgradom',
      },
      {
        path: 'kvarovi',
        canActivate: [ulogaGuard('stanar', 'upravnik', 'admin')],
        loadChildren: () => import('./features/kvarovi/kvarovi.routes'),
      },
      {
        path: 'zahtevi',
        canActivate: [ulogaGuard('upravnik', 'admin')],
        loadComponent: () =>
          import('./features/zahtevi/zahtevi-upravnika/zahtevi-upravnika').then(
            (m) => m.ZahteviUpravnika,
          ),
        title: 'Zahtevi | Upravljanje zgradom',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
