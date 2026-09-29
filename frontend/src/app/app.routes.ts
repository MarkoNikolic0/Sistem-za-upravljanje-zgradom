import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Home } from './features/dashboard/home/home';
import { prijavljenGuard } from './features/auth/prijavljen-guard';
import { gostGuard } from './features/auth/gost-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: Home,
    canActivate: [prijavljenGuard],
    title: 'Početna | Upravljanje zgradom',
  },
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
  { path: '**', redirectTo: '' },
];
