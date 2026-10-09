import { Routes } from '@angular/router';
import { KvarStore } from './kvar-store';

export default [
  {
    path: '',
    providers: [KvarStore],
    children: [
      {
        path: '',
        loadComponent: () => import('./lista-kvarova/lista-kvarova').then((m) => m.ListaKvarova),
        title: 'Kvarovi | Upravljanje zgradom',
      },
      {
        path: 'novi',
        loadComponent: () => import('./prijava-kvara/prijava-kvara').then((m) => m.PrijavaKvara),
        title: 'Prijava kvara | Upravljanje zgradom',
      },
    ],
  },
] satisfies Routes;
