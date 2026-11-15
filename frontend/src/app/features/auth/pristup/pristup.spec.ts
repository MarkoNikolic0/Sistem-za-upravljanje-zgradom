import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { tokenZa } from '../../../../testiranje/sesija';
import { Uloga } from '../auth-models';
import { AuthStore } from '../sesija/auth-store';
import { gostGuard } from './gost-guard';
import { pocetnaGuard } from './pocetna-guard';
import { bezbednaAdresa } from './povratak';
import { prijavljenGuard } from './prijavljen-guard';
import { ulogaGuard } from './uloga-guard';

@Component({ template: '' })
class Prazna {}

describe('pristup stranicama', () => {
  let router: Router;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Prazna, canActivate: [gostGuard] },
          { path: 'kvarovi', component: Prazna, canActivate: [prijavljenGuard] },
          { path: 'kvarovi/:id', component: Prazna, canActivate: [prijavljenGuard] },
          {
            path: 'zgrade',
            component: Prazna,
            canActivate: [prijavljenGuard, ulogaGuard('admin')],
          },
          {
            path: 'zahtevi',
            component: Prazna,
            canActivate: [prijavljenGuard, ulogaGuard('upravnik', 'admin')],
          },
          { path: '', component: Prazna, canActivate: [prijavljenGuard, pocetnaGuard] },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    store = TestBed.inject(AuthStore);
  });

  const prijavi = (uloga: Uloga) => store.postaviToken(tokenZa(uloga));
  const otvori = async (adresa: string) => {
    await router.navigateByUrl(adresa);
    return router.url;
  };

  it('gost sa zaštićene stranice ide na prijavu sa adresom za povratak', async () => {
    expect(await otvori('/kvarovi/7?tab=slike')).toBe(
      '/login?returnUrl=%2Fkvarovi%2F7%3Ftab%3Dslike',
    );
    expect(await otvori('/')).toBe('/login');
  });

  it('prijavljen ne može na prijavu', async () => {
    prijavi('stanar');
    expect(await otvori('/login')).toBe('/');
  });

  it('stranica samo za neke uloge vraća ostale na početnu', async () => {
    prijavi('stanar');
    expect(await otvori('/zgrade')).toBe('/');
    expect(await otvori('/zahtevi')).toBe('/');
    prijavi('upravnik');
    expect(await otvori('/zahtevi')).toBe('/zahtevi');
    expect(await otvori('/zgrade')).toBe('/');
    prijavi('admin');
    expect(await otvori('/zgrade')).toBe('/zgrade');
  });

  it('serviseru je početna lista kvarova', async () => {
    prijavi('serviser');
    expect(await otvori('/')).toBe('/kvarovi');
    expect(await otvori('/zgrade')).toBe('/kvarovi');
  });

  it('povratak posle prijave samo na adresu unutar aplikacije', () => {
    expect(bezbednaAdresa('/kvarovi/7')).toBe('/kvarovi/7');
    expect(bezbednaAdresa(undefined)).toBe('/');
    expect(bezbednaAdresa('https://zlo.example.com')).toBe('/');
    expect(bezbednaAdresa('//zlo.example.com')).toBe('/');
    expect(bezbednaAdresa('/\\zlo.example.com')).toBe('/');
  });
});
