import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./lista-oglasa/lista-oglasa').then((m) => m.ListaOglasa),
    title: 'Oglasi | Upravljanje zgradom',
  },
  {
    path: 'novi',
    loadComponent: () => import('./forma-oglasa/forma-oglasa').then((m) => m.FormaOglasa),
    title: 'Novi oglas | Upravljanje zgradom',
  },
  {
    path: ':id/izmena',
    loadComponent: () => import('./forma-oglasa/forma-oglasa').then((m) => m.FormaOglasa),
    title: 'Izmena oglasa | Upravljanje zgradom',
  },
] satisfies Routes;
