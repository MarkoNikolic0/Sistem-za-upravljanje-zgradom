import { Routes } from '@angular/router';
import { ulogaGuard } from '../auth/pristup/uloga-guard';

export default [
  {
    path: '',
    loadComponent: () => import('./lista-glasanja/lista-glasanja').then((m) => m.ListaGlasanja),
    title: 'Glasanje | Upravljanje zgradom',
  },
  {
    path: 'nova',
    canActivate: [ulogaGuard('upravnik', 'admin')],
    loadComponent: () => import('./novo-glasanje/novo-glasanje').then((m) => m.NovoGlasanje),
    title: 'Novo glasanje | Upravljanje zgradom',
  },
] satisfies Routes;
