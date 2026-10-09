import { Uloga } from '../auth/auth-models';

export interface StavkaNavigacije {
  naziv: string;
  ikonica: string;
  putanja: string;
  uloge: Uloga[];
}

export const STAVKE_NAVIGACIJE: StavkaNavigacije[] = [
  {
    naziv: 'Početna',
    ikonica: 'pi pi-home',
    putanja: '/',
    uloge: ['stanar', 'upravnik', 'serviser', 'admin'],
  },
  {
    naziv: 'Kvarovi',
    ikonica: 'pi pi-wrench',
    putanja: '/kvarovi',
    uloge: ['stanar', 'upravnik', 'admin'],
  },
  {
    naziv: 'Sastanci',
    ikonica: 'pi pi-calendar',
    putanja: '/sastanci',
    uloge: ['stanar', 'upravnik'],
  },
  {
    naziv: 'Glasanje',
    ikonica: 'pi pi-check-square',
    putanja: '/glasanje',
    uloge: ['stanar', 'upravnik'],
  },
  {
    naziv: 'Oglasi',
    ikonica: 'pi pi-megaphone',
    putanja: '/oglasi',
    uloge: ['stanar', 'upravnik'],
  },
  {
    naziv: 'Stanari',
    ikonica: 'pi pi-users',
    putanja: '/stanari',
    uloge: ['upravnik'],
  },
  {
    naziv: 'Zahtevi',
    ikonica: 'pi pi-inbox',
    putanja: '/zahtevi',
    uloge: ['upravnik', 'admin'],
  },
  {
    naziv: 'Zgrade',
    ikonica: 'pi pi-building',
    putanja: '/zgrade',
    uloge: ['admin'],
  },
  {
    naziv: 'Korisnici',
    ikonica: 'pi pi-users',
    putanja: '/korisnici',
    uloge: ['admin'],
  },
];
