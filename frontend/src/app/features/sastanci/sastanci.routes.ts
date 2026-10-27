import { Routes } from '@angular/router';
import { ulogaGuard } from '../auth/pristup/uloga-guard';

export default [
  {
    path: '',
    loadComponent: () => import('./lista-sastanaka/lista-sastanaka').then((m) => m.ListaSastanaka),
    title: 'Sastanci | Upravljanje zgradom',
  },
  {
    path: 'novi',
    canActivate: [ulogaGuard('upravnik', 'admin')],
    loadComponent: () => import('./forma-sastanka/forma-sastanka').then((m) => m.FormaSastanka),
    title: 'Zakazivanje sastanka | Upravljanje zgradom',
  },
  {
    path: ':id',
    loadComponent: () => import('./detalj-sastanka/detalj-sastanka').then((m) => m.DetaljSastanka),
    title: 'Sastanak | Upravljanje zgradom',
  },
  {
    path: ':id/izmena',
    canActivate: [ulogaGuard('upravnik', 'admin')],
    loadComponent: () => import('./forma-sastanka/forma-sastanka').then((m) => m.FormaSastanka),
    title: 'Izmena sastanka | Upravljanje zgradom',
  },
] satisfies Routes;
