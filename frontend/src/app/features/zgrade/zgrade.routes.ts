import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./lista-zgrada/lista-zgrada').then((m) => m.ListaZgrada),
    title: 'Zgrade | Upravljanje zgradom',
  },
  {
    path: ':id',
    loadComponent: () => import('./detalj-zgrade/detalj-zgrade').then((m) => m.DetaljZgrade),
    title: 'Zgrada | Upravljanje zgradom',
  },
] satisfies Routes;
