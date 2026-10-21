import { Routes } from '@angular/router';
import { ListaKvarovaStore } from './lista-kvarova-store';

export default [
  {
    path: '',
    providers: [ListaKvarovaStore],
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
      {
        path: ':id',
        loadComponent: () => import('./detalj-kvara/detalj-kvara').then((m) => m.DetaljKvara),
        title: 'Kvar | Upravljanje zgradom',
      },
    ],
  },
] satisfies Routes;
