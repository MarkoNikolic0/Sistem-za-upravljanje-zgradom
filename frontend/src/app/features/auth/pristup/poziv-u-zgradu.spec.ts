import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { tokenZa } from '../../../../testiranje/sesija';
import { Uloga } from '../auth-models';
import { AuthStore } from '../sesija/auth-store';
import { gostGuard } from './gost-guard';
import { povratakNaPovezivanje, pozivUZgradu, zgradaIzPovratka } from './poziv-u-zgradu';
import { prijavljenGuard } from './prijavljen-guard';
import { ulogaGuard } from './uloga-guard';

@Component({ template: '' })
class Prazna {}

describe('QR kod zgrade', () => {
  let router: Router;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'poziv/:zgrada', redirectTo: pozivUZgradu },
          { path: 'register', component: Prazna, canActivate: [gostGuard] },
          { path: 'login', component: Prazna, canActivate: [gostGuard] },
          {
            path: 'povezivanje',
            component: Prazna,
            canActivate: [prijavljenGuard, ulogaGuard('stanar', 'upravnik')],
          },
          { path: '', component: Prazna, canActivate: [prijavljenGuard] },
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

  it('gost sa koda ide na registraciju sa izabranom zgradom', async () => {
    expect(await otvori('/poziv/5')).toBe('/register?zgrada=5');
  });

  it('prijavljen stanar i upravnik idu pravo na povezivanje sa tom zgradom', async () => {
    prijavi('stanar');
    expect(await otvori('/poziv/5')).toBe('/povezivanje?zgrada=5');
    prijavi('upravnik');
    expect(await otvori('/poziv/7')).toBe('/povezivanje?zgrada=7');
  });

  it('admin se ne povezuje sa stanom, pa ide na početnu', async () => {
    prijavi('admin');
    expect(await otvori('/poziv/5')).toBe('/');
  });

  it('neispravan broj zgrade se ne prenosi dalje', async () => {
    for (const zgrada of ['abc', '0', '-3', '2.5', '1e999']) {
      expect(await otvori(`/poziv/${zgrada}`)).toBe('/register');
    }
  });

  it('povratak posle prijave vodi na povezivanje samo za ispravnu zgradu', () => {
    expect(povratakNaPovezivanje(5)).toEqual({ returnUrl: '/povezivanje?zgrada=5' });
    expect(povratakNaPovezivanje(undefined)).toEqual({});
  });

  it('zgrada se čita samo iz povratka na povezivanje unutar aplikacije', () => {
    expect(zgradaIzPovratka(router, '/povezivanje?zgrada=5')).toBe(5);
    expect(zgradaIzPovratka(router, '/povezivanje?zgrada=x')).toBeUndefined();
    expect(zgradaIzPovratka(router, '/kvarovi?zgrada=5')).toBeUndefined();
    expect(zgradaIzPovratka(router, '//zlo.example/povezivanje?zgrada=5')).toBeUndefined();
    expect(zgradaIzPovratka(router, 'https://zlo.example/povezivanje?zgrada=5')).toBeUndefined();
    expect(zgradaIzPovratka(router, undefined)).toBeUndefined();
  });
});
