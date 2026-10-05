import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Home } from './features/dashboard/home/home';
import { prijavljenGuard } from './features/auth/prijavljen-guard';
import { gostGuard } from './features/auth/gost-guard';

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
    ],
  },
  { path: '**', redirectTo: '' },
];
