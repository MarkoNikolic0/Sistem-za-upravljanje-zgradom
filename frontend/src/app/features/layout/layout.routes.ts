import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { notifikacijeFeature } from '../notifikacije/notifikacija-store/notifikacije-reducer';
import * as notifikacijeEffects from '../notifikacije/notifikacija-store/notifikacije-effects';
import { neprocitaniOglasiFeature } from '../oglasi/neprocitani-oglasi-store/neprocitani-oglasi-reducer';
import * as neprocitaniOglasiEffects from '../oglasi/neprocitani-oglasi-store/neprocitani-oglasi-effects';
import { cekaGlasFeature } from '../glasanje/ceka-glas-store/ceka-glas-reducer';
import * as cekaGlasEffects from '../glasanje/ceka-glas-store/ceka-glas-effects';
import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthStore } from '../auth/sesija/auth-store';
import { AppLayout } from './app-layout/app-layout';
import { ulogaGuard } from '../auth/pristup/uloga-guard';
import { pocetnaGuard } from '../auth/pristup/pocetna-guard';

export default [
  {
    path: '',
    component: AppLayout,
    providers: [
      provideState(notifikacijeFeature),
      provideState(neprocitaniOglasiFeature),
      provideState(cekaGlasFeature),
      provideEffects(notifikacijeEffects, neprocitaniOglasiEffects, cekaGlasEffects),
    ],
    children: [
      {
        path: '',
        loadComponent: () => import('../dashboard/home/home').then((m) => m.Home),
        canActivate: [pocetnaGuard],
        title: 'Početna | Upravljanje zgradom',
      },
      {
        path: 'profil',
        loadComponent: () => import('../profile/my-profile/my-profile').then((m) => m.MyProfile),
        title: 'Moj profil | Upravljanje zgradom',
      },
      {
        path: 'notifikacije',
        loadComponent: () =>
          import('../notifikacije/notifikacije/notifikacije').then((m) => m.Notifikacije),
        title: 'Obaveštenja | Upravljanje zgradom',
      },
      {
        path: 'povezivanje',
        canActivate: [ulogaGuard('stanar', 'upravnik')],
        loadComponent: () => import('../zahtevi/novi-zahtev/novi-zahtev').then((m) => m.NoviZahtev),
        title: 'Povezivanje sa stanom | Upravljanje zgradom',
      },
      {
        path: 'kvarovi',
        canActivate: [ulogaGuard('stanar', 'upravnik', 'serviser', 'admin')],
        loadChildren: () => import('../kvarovi/kvarovi.routes'),
      },
      {
        path: 'oglasi',
        canActivate: [ulogaGuard('stanar', 'upravnik', 'admin')],
        loadChildren: () => import('../oglasi/oglasi.routes'),
      },
      {
        path: 'sastanci',
        canActivate: [ulogaGuard('stanar', 'upravnik', 'admin')],
        loadChildren: () => import('../sastanci/sastanci.routes'),
      },
      {
        path: 'glasanje',
        canActivate: [ulogaGuard('stanar', 'upravnik', 'admin')],
        loadChildren: () => import('../glasanje/glasanje.routes'),
      },
      {
        path: 'zahtevi',
        canActivate: [ulogaGuard('upravnik', 'admin')],
        loadComponent: () =>
          import('../zahtevi/zahtevi-upravnika/zahtevi-upravnika').then((m) => m.ZahteviUpravnika),
        title: 'Zahtevi | Upravljanje zgradom',
      },
      {
        path: 'dokumenti',
        canActivate: [ulogaGuard('stanar', 'upravnik', 'admin')],
        loadComponent: () =>
          import('../dokumenti/dokumenti-zgrade/dokumenti-zgrade').then((m) => m.DokumentiZgrade),
        title: 'Dokumenti | Upravljanje zgradom',
      },
      {
        path: 'kontakti',
        canActivate: [ulogaGuard('upravnik', 'admin')],
        loadComponent: () =>
          import('../kontakti/kontakti-zgrade/kontakti-zgrade').then((m) => m.KontaktiZgrade),
        title: 'Važni kontakti | Upravljanje zgradom',
      },
      {
        path: 'stanari',
        canActivate: [ulogaGuard('upravnik', 'admin')],
        loadComponent: () =>
          import('../stanari/stanari-zgrade/stanari-zgrade').then((m) => m.StanariZgrade),
        // Admin ovde vidi sve naloge, pa se stranica kod njega zove Korisnici
        title: () =>
          inject(AuthStore).korisnik()?.uloga === 'admin'
            ? 'Korisnici | Upravljanje zgradom'
            : 'Stanari | Upravljanje zgradom',
      },
      {
        path: 'zgrade',
        canActivate: [ulogaGuard('admin')],
        loadChildren: () => import('../zgrade/zgrade.routes'),
      },
    ],
  },
  { path: '**', redirectTo: '' },
] satisfies Routes;
