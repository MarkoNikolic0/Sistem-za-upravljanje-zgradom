import { inspect } from 'node:util';
import { Logger } from '@nestjs/common';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';
import { PotvrdaEmailaService } from '../src/auth/token-naloga/potvrda-emaila.service.js';
import { Uloga } from '../src/shared/enums/uloga.enum.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  kolacicSesije,
  LOZINKA,
  napraviKorisnika,
  novEmail,
  prijavi,
} from './pomoc/podaci.js';

const NOVA_LOZINKA = 'NovaLozinka456!';

interface Spijun {
  mock: { calls: unknown[][] };
}

describe('bezbednosni događaji u logu', () => {
  let t: TestAplikacija;
  let admin: Akter;
  let upozorenja: Spijun;
  let zapisi: Spijun;
  let greske: Spijun;

  const tekst = (spijun: Spijun) =>
    spijun.mock.calls
      .map((poziv) =>
        poziv
          .map((deo) => (typeof deo === 'string' ? deo : inspect(deo)))
          .join(' '),
      )
      .join('\n');

  const prijava = (email: string, lozinka: string) =>
    request(t.server).post('/auth/login').send({ email, lozinka });

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    admin = await napraviKorisnika(t, 'Admin', { uloga: Uloga.ADMIN });
  });

  beforeEach(() => {
    upozorenja = vi.spyOn(Logger.prototype, 'warn');
    zapisi = vi.spyOn(Logger.prototype, 'log');
    greske = vi.spyOn(Logger.prototype, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('neuspela prijava se beleži sa brojem naloga i adresom, bez emaila i lozinke', async () => {
    const korisnik = await napraviKorisnika(t, 'Pogresni');
    const nepoznat = novEmail('Nepoznati');

    await prijava(korisnik.email, 'PogresnaLozinka1!').expect(401);
    await prijava(nepoznat, 'PogresnaLozinka1!').expect(401);

    const log = tekst(upozorenja);
    expect(log).toContain(`Neuspela prijava (nalog ${korisnik.id}, IP `);
    expect(log).toContain('Neuspela prijava (nepostojeći nalog, IP ');
    expect(log).not.toContain(korisnik.email);
    expect(log).not.toContain(nepoznat);
    expect(log).not.toContain('PogresnaLozinka1!');
  });

  it('zaključavanje i pokušaj dok je prijava zaključana se beleže', async () => {
    const korisnik = await napraviKorisnika(t, 'Zakljucani');
    for (let i = 0; i < 5; i += 1) {
      await prijava(korisnik.email, 'PogresnaLozinka1!');
    }
    await prijava(korisnik.email, LOZINKA).expect(429);

    const log = tekst(upozorenja);
    expect(log).toContain(
      `Prijava zaključana posle više pogrešnih pokušaja (nalog ${korisnik.id}, IP `,
    );
    expect(log).toContain(
      `Prijava odbijena dok je zaključana (nalog ${korisnik.id}, IP `,
    );
  });

  it('ponovna upotreba starog kolačića sesije se beleži', async () => {
    const korisnik = await napraviKorisnika(t, 'Ukradeni');
    const { kolacic } = await prijavi(t, korisnik.email);
    const osvezi = (k: string) =>
      request(t.server).post('/auth/refresh').set('Cookie', k);
    kolacicSesije(await osvezi(kolacic).expect(200));

    await osvezi(kolacic).expect(401);

    expect(tekst(upozorenja)).toContain(
      'Ponovo upotrebljen stari kolačić sesije',
    );
  });

  it('promena uloge, deaktivacija i aktivacija se beleže sa adminom i nalogom', async () => {
    const korisnik = await napraviKorisnika(t, 'Menjani');

    await kao(t, admin)
      .patch(`/korisnik/${korisnik.id}/uloga`)
      .send({ uloga: Uloga.SERVISER })
      .expect(204);
    await kao(t, admin)
      .put(`/korisnik/${korisnik.id}/deaktivacija`)
      .expect(204);
    await kao(t, admin)
      .delete(`/korisnik/${korisnik.id}/deaktivacija`)
      .expect(204);
    await kao(t, admin)
      .delete(`/korisnik/${korisnik.id}/deaktivacija`)
      .expect(204);

    const log = tekst(zapisi);
    expect(log).toContain(
      `Admin ${admin.id} je nalogu ${korisnik.id} promenio ulogu iz stanar u serviser.`,
    );
    expect(log).toContain(
      `Admin ${admin.id} je deaktivirao nalog ${korisnik.id}.`,
    );
    expect(
      log.split(`Admin ${admin.id} je aktivirao nalog ${korisnik.id}.`),
    ).toHaveLength(2);
  });

  it('promena lozinke se beleži bez lozinke', async () => {
    const korisnik = await napraviKorisnika(t, 'NovaLozinka');

    await kao(t, korisnik)
      .patch('/auth/lozinka')
      .send({ trenutnaLozinka: LOZINKA, novaLozinka: NOVA_LOZINKA })
      .expect(204);

    const log = tekst(zapisi);
    expect(log).toContain(`Nalog ${korisnik.id} je promenio lozinku.`);
    expect(log).not.toContain(NOVA_LOZINKA);
  });

  it('greška baze pri registraciji ne upisuje u log heš lozinke, telefon ni email', async () => {
    const email = novEmail('Registracija');
    const servis = t.app.get(PotvrdaEmailaService);
    vi.spyOn(t.baza, 'transaction').mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT INTO "korisnik" ...',
        [email, '$2b$10$TAJNIHESLOZINKE', '+381641234567'],
        new Error('duplicate key value violates unique constraint'),
      ),
    );

    await servis.registruj({
      ime: 'Jovana',
      prezime: 'Ilić',
      email,
      telefon: '0641234567',
      lozinka: LOZINKA,
    });

    const log = tekst(greske);
    expect(log).toContain('Registracija nije obrađena.');
    expect(log).toContain('duplicate key value violates unique constraint');
    expect(log).not.toContain('TAJNIHESLOZINKE');
    expect(log).not.toContain('+381641234567');
    expect(log).not.toContain(email);
  });
});
