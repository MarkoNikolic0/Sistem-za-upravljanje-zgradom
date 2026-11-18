import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import {
  PORUKA_LINK,
  PORUKA_POTVRDA,
  PORUKA_PRIJAVA,
  PORUKA_ZAKLJUCAN,
} from '../src/auth/auth.constants.js';
import { LozinkaService } from '../src/auth/token-naloga/lozinka.service.js';
import { PotvrdaEmailaService } from '../src/auth/token-naloga/potvrda-emaila.service.js';
import { Korisnik } from '../src/korisnik/korisnik.entity.js';
import { CORS_KES_SEKUNDI } from '../src/podesi-aplikaciju.js';
import { Uloga } from '../src/shared/enums/uloga.enum.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import { linkIzMejla, tokenIzMejla } from './pomoc/lazni-servisi.js';
import {
  kolacicSesije,
  LOZINKA,
  napraviKorisnika,
  novEmail,
  prijavi,
} from './pomoc/podaci.js';

const NOVA_LOZINKA = 'NovaLozinka456!';
const DRUGA_LOZINKA = 'DrugaLozinka789!';

describe('nalog i prijava', () => {
  let t: TestAplikacija;
  let admin: Akter;

  const javno = () => request(t.server);
  const korisnici = () => t.baza.getRepository(Korisnik);

  const registracija = (email: string, polja: object = {}) => ({
    ime: 'Jovana',
    prezime: 'Ilić',
    email,
    telefon: '0641234567',
    lozinka: LOZINKA,
    ...polja,
  });

  const registruj = async (email: string, polja: object = {}) => {
    await javno()
      .post('/auth/register')
      .send(registracija(email, polja))
      .expect(202, {});
  };

  const posleSlanja = async (posalji: () => PromiseLike<unknown>) => {
    const spijuni = [
      vi.spyOn(t.app.get(PotvrdaEmailaService), 'registruj'),
      vi.spyOn(t.app.get(PotvrdaEmailaService), 'posaljiPonovo'),
      vi.spyOn(t.app.get(LozinkaService), 'posaljiLink'),
    ];
    try {
      await posalji();
      await Promise.all(
        spijuni.flatMap((spijun) => spijun.mock.results.map((r) => r.value)),
      );
    } finally {
      for (const spijun of spijuni) {
        spijun.mockRestore();
      }
    }
  };

  const registrujIAktiviraj = async (ime: string) => {
    const email = novEmail(ime);
    await registruj(email);
    const mejl = await t.posta.sacekaj(email, 'Aktivacija naloga');
    await javno()
      .post('/auth/potvrda-emaila')
      .send({ token: tokenIzMejla(mejl) })
      .expect(204);
    return email;
  };

  const prijava = (email: string, lozinka = LOZINKA) =>
    javno().post('/auth/login').send({ email, lozinka });

  const osvezi = (kolacic: string) =>
    javno().post('/auth/refresh').set('Cookie', kolacic);

  const zastariTokene = (email: string) =>
    t.baza.query(
      `UPDATE token_naloga SET "datumKreiranja" = now() - interval '2 minutes'
       WHERE "korisnikId" = (SELECT id FROM korisnik WHERE email = $1)`,
      [email],
    );

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    admin = await napraviKorisnika(t, 'Admin', { uloga: Uloga.ADMIN });
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('registracija i potvrda emaila', () => {
    it('nalog radi tek posle aktivacije linkom iz mejla', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      const mejl = await t.posta.sacekaj(email, 'Aktivacija naloga');

      await prijava(email).expect(401);
      const token = tokenIzMejla(mejl);
      await javno().post('/auth/potvrda-emaila').send({ token }).expect(204);

      const odgovor = await prijava(email).expect(200);
      const profil = await javno()
        .get('/korisnik/moj-profil')
        .set('Authorization', `Bearer ${odgovor.body.accessToken}`)
        .expect(200);
      expect(profil.body).toMatchObject({
        ime: 'Jovana',
        prezime: 'Ilić',
        email,
        telefon: '+381641234567',
        uloga: Uloga.STANAR,
        stanovi: [],
      });
    });

    it('link za aktivaciju važi samo jednom', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      const token = tokenIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );
      await javno().post('/auth/potvrda-emaila').send({ token }).expect(204);
      const drugi = await javno()
        .post('/auth/potvrda-emaila')
        .send({ token })
        .expect(400);
      expect(drugi.body.message).toBe(PORUKA_POTVRDA);
    });

    it('istekao i izmišljen link se odbijaju', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      const token = tokenIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );
      await t.baza.query(
        `UPDATE token_naloga SET "datumIsteka" = now() - interval '1 minute'`,
      );
      await javno().post('/auth/potvrda-emaila').send({ token }).expect(400);
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: 'izmisljen-token' })
        .expect(400);
      await prijava(email).expect(401);
    });

    it('link za novu lozinku ne aktivira nalog', async () => {
      const email = await registrujIAktiviraj('Jovana');
      await javno().post('/auth/zaboravljena-lozinka').send({ email });
      const token = tokenIzMejla(
        await t.posta.sacekaj(email, 'Promena lozinke'),
      );
      await javno().post('/auth/potvrda-emaila').send({ token }).expect(400);
    });

    it('registracija na postojeći nalog odgovara isto i ne menja nalog', async () => {
      const email = await registrujIAktiviraj('Jovana');
      await registruj(email, {
        ime: 'Napadač',
        lozinka: NOVA_LOZINKA,
        zgradaId: 1,
      });
      const mejl = await t.posta.sacekaj(email, 'Nalog već postoji');
      expect(mejl.tekst).toContain('/nova-lozinka?token=');
      expect(linkIzMejla(mejl).searchParams.has('zgrada')).toBe(false);

      expect(await korisnici().countBy({ email })).toBe(1);
      expect(await korisnici().findOneBy({ email })).toMatchObject({
        ime: 'Jovana',
      });
      await prijava(email, NOVA_LOZINKA).expect(401);
      await prijava(email).expect(200);
    });

    it('ponovna registracija na neaktiviran nalog zamenjuje podatke', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      const stari = tokenIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );
      await zastariTokene(email);

      await posleSlanja(() =>
        registruj(email, { ime: 'Milica', lozinka: NOVA_LOZINKA }),
      );
      const novi = tokenIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: stari })
        .expect(400);
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: novi })
        .expect(204);

      expect(await korisnici().countBy({ email })).toBe(1);
      expect(await korisnici().findOneBy({ email })).toMatchObject({
        ime: 'Milica',
      });
      await prijava(email).expect(401);
      await prijava(email, NOVA_LOZINKA).expect(200);
    });

    it('ponovna registracija u istom minutu menja podatke, a važi link iz prvog mejla', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      const token = tokenIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );

      await posleSlanja(() =>
        registruj(email, { ime: 'Milica', lozinka: NOVA_LOZINKA }),
      );
      expect(t.posta.za(email)).toEqual([]);
      await javno().post('/auth/potvrda-emaila').send({ token }).expect(204);

      expect(await korisnici().findOneBy({ email })).toMatchObject({
        ime: 'Milica',
      });
      await prijava(email).expect(401);
      await prijava(email, NOVA_LOZINKA).expect(200);
    });

    it('drugi mejl u istom minutu se ne šalje', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      await t.posta.sacekaj(email, 'Aktivacija naloga');
      await posleSlanja(() => registruj(email));
      await posleSlanja(() =>
        javno().post('/auth/ponovo-potvrda').send({ email }).expect(202, {}),
      );
      expect(t.posta.za(email)).toEqual([]);
    });

    it('nov link za aktivaciju dobija samo neaktiviran nalog', async () => {
      const neaktiviran = novEmail('Jovana');
      await registruj(neaktiviran);
      const stari = tokenIzMejla(
        await t.posta.sacekaj(neaktiviran, 'Aktivacija naloga'),
      );
      await zastariTokene(neaktiviran);
      await posleSlanja(() =>
        javno()
          .post('/auth/ponovo-potvrda')
          .send({ email: neaktiviran })
          .expect(202, {}),
      );
      const novi = tokenIzMejla(
        await t.posta.sacekaj(neaktiviran, 'Aktivacija naloga'),
      );
      expect(novi).not.toBe(stari);
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: stari })
        .expect(400);
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: novi })
        .expect(204);

      const aktiviran = await registrujIAktiviraj('Jovana');
      const nepoznat = novEmail('Nepoznat');
      for (const email of [aktiviran, nepoznat]) {
        await posleSlanja(() =>
          javno().post('/auth/ponovo-potvrda').send({ email }).expect(202, {}),
        );
        expect(t.posta.za(email)).toEqual([]);
      }
    });

    it('kad mejl ne ode, link se briše pa može odmah da se zatraži nov', async () => {
      const email = novEmail('Jovana');
      t.posta.odbija = true;
      await t.app.get(PotvrdaEmailaService).registruj(registracija(email));
      t.posta.odbija = false;
      expect(
        await t.baza.query(
          `SELECT 1 FROM token_naloga WHERE "korisnikId" = (SELECT id FROM korisnik WHERE email = $1)`,
          [email],
        ),
      ).toEqual([]);
      await javno().post('/auth/ponovo-potvrda').send({ email }).expect(202);
      await t.posta.sacekaj(email, 'Aktivacija naloga');
    });

    it('email se čuva malim slovima i prijava ne zavisi od veličine slova', async () => {
      const email = novEmail('Jovana');
      await registruj(`  ${email.toUpperCase()} `);
      const mejl = await t.posta.sacekaj(email, 'Aktivacija naloga');
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: tokenIzMejla(mejl) })
        .expect(204);
      await prijava(email.toUpperCase()).expect(200);
    });

    it.each([
      ['lozinka', { lozinka: 'kratka' }],
      ['lozinka', { lozinka: 'š'.repeat(40) }],
      ['telefon', { telefon: '12345' }],
      ['email', { email: 'nije-email' }],
      ['ime', { ime: '   ' }],
      ['zgradaId', { zgradaId: 0 }],
      ['zgradaId', { zgradaId: 1.5 }],
      ['zgradaId', { zgradaId: '5' }],
    ])(
      'neispravno polje %s vraća grešku baš za to polje',
      async (polje, izmena) => {
        const odgovor = await javno()
          .post('/auth/register')
          .send(registracija(novEmail('Jovana'), izmena))
          .expect(400);
        expect(Object.keys(odgovor.body.greske)).toEqual([polje]);
      },
    );

    it('zgrada iz QR koda stiže u link za aktivaciju i ne daje pristup', async () => {
      const email = novEmail('Jovana');
      await registruj(email, { zgradaId: 987654 });
      const link = linkIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );
      expect(link.pathname).toBe('/potvrda-emaila');
      expect(link.searchParams.get('zgrada')).toBe('987654');
      await javno()
        .post('/auth/potvrda-emaila')
        .send({ token: link.searchParams.get('token') })
        .expect(204);
      expect(
        await t.baza.query(
          'SELECT 1 FROM stanar_stana s JOIN korisnik k ON k.id = s."korisnikId" WHERE k.email = $1',
          [email],
        ),
      ).toEqual([]);
    });

    it('link za aktivaciju bez zgrade nema parametar zgrade', async () => {
      const email = novEmail('Jovana');
      await registruj(email);
      const link = linkIzMejla(
        await t.posta.sacekaj(email, 'Aktivacija naloga'),
      );
      expect(link.searchParams.has('zgrada')).toBe(false);
    });

    it('registracija ne prima ulogu ni druga nepoznata polja', async () => {
      const email = novEmail('Jovana');
      await javno()
        .post('/auth/register')
        .send(registracija(email, { uloga: 'admin' }))
        .expect(400);
      expect(await korisnici().countBy({ email })).toBe(0);
    });

    it('neaktivirani nalozi stariji od 7 dana se brišu, skoriji ostaju', async () => {
      const stari = novEmail('Stari');
      const skori = novEmail('Skori');
      const aktiviran = await registrujIAktiviraj('Aktiviran');
      for (const email of [stari, skori]) {
        await registruj(email);
        await t.posta.sacekaj(email, 'Aktivacija naloga');
      }
      await t.baza.query(
        `UPDATE korisnik SET "kreiranDatum" = now() - interval '8 days' WHERE email = ANY($1)`,
        [[stari, aktiviran]],
      );
      await t.baza.query(
        `UPDATE token_naloga SET "datumIsteka" = now() - interval '1 day'
         WHERE "korisnikId" = (SELECT id FROM korisnik WHERE email = $1)`,
        [stari],
      );

      await t.app.get(PotvrdaEmailaService).obrisiNepotvrdjene();

      expect(await korisnici().countBy({ email: stari })).toBe(0);
      expect(await korisnici().countBy({ email: skori })).toBe(1);
      expect(await korisnici().countBy({ email: aktiviran })).toBe(1);
    });
  });

  describe('prijava', () => {
    it('pogrešna lozinka, nepoznat, neaktiviran i deaktiviran nalog daju isti odgovor', async () => {
      const aktivan = await napraviKorisnika(t, 'Aktivan');
      const deaktiviran = await napraviKorisnika(t, 'Deaktiviran');
      await kao(t, admin)
        .put(`/korisnik/${deaktiviran.id}/deaktivacija`)
        .expect(204);
      const neaktiviran = novEmail('Neaktiviran');
      await registruj(neaktiviran);
      await t.posta.sacekaj(neaktiviran, 'Aktivacija naloga');

      const odgovori = await Promise.all([
        prijava(aktivan.email, 'PogresnaLozinka1!'),
        prijava(novEmail('Nepoznat')),
        prijava(neaktiviran),
        prijava(deaktiviran.email),
      ]);
      for (const odgovor of odgovori) {
        expect(odgovor.status).toBe(401);
        expect(odgovor.body).toEqual({
          statusCode: 401,
          error: 'Unauthorized',
          message: PORUKA_PRIJAVA,
        });
        expect(odgovor.get('Set-Cookie')).toBeUndefined();
      }
    });

    it('kolačić sesije nije dostupan skriptama i šalje se samo na /auth', async () => {
      const korisnik = await napraviKorisnika(t, 'Kolacic');
      const odgovor = await prijava(korisnik.email).expect(200);
      const [kolacic] = odgovor.get('Set-Cookie') ?? [];
      expect(kolacic).toMatch(/^refresh_token=/);
      expect(kolacic).toContain('HttpOnly');
      expect(kolacic).toContain('SameSite=Strict');
      expect(kolacic).toContain('Path=/auth');
      expect(Object.keys(odgovor.body)).toEqual(['accessToken']);
    });

    it('posle 5 pogrešnih pokušaja prijava je zaključana i sa ispravnom lozinkom', async () => {
      const korisnik = await napraviKorisnika(t, 'Zakljucan');
      const drugi = await napraviKorisnika(t, 'Nezakljucan');
      for (let i = 0; i < 4; i += 1) {
        await prijava(korisnik.email, 'PogresnaLozinka1!').expect(401);
      }
      const peti = await prijava(korisnik.email, 'PogresnaLozinka1!').expect(
        429,
      );
      expect(peti.body.message).toBe(PORUKA_ZAKLJUCAN);
      await prijava(korisnik.email).expect(429);
      await prijava(drugi.email).expect(200);

      await t.baza.query(
        `UPDATE neuspela_prijava SET "zakljucanDo" = now() - interval '1 second' WHERE email = $1`,
        [korisnik.email],
      );
      await prijava(korisnik.email).expect(200);
      expect(
        await t.baza.query(`SELECT 1 FROM neuspela_prijava WHERE email = $1`, [
          korisnik.email,
        ]),
      ).toEqual([]);
    });

    it('zaključava se i adresa koja nema nalog, da se ne vidi razlika', async () => {
      const nepoznat = novEmail('Nepoznat');
      for (let i = 0; i < 4; i += 1) {
        await prijava(nepoznat).expect(401);
      }
      await prijava(nepoznat).expect(429);
    });

    it('uspešna prijava briše brojač pogrešnih pokušaja', async () => {
      const korisnik = await napraviKorisnika(t, 'Brojac');
      for (let i = 0; i < 4; i += 1) {
        await prijava(korisnik.email, 'PogresnaLozinka1!').expect(401);
      }
      await prijava(korisnik.email).expect(200);
      for (let i = 0; i < 4; i += 1) {
        await prijava(korisnik.email, 'PogresnaLozinka1!').expect(401);
      }
      await prijava(korisnik.email).expect(200);
    });

    it('token bez oznake sesije se odbija', async () => {
      const korisnik = await napraviKorisnika(t, 'BezSesije');
      const token = await t.app.get(JwtService).signAsync({
        sub: korisnik.id,
        email: korisnik.email,
        uloga: Uloga.ADMIN,
      });
      await javno()
        .get('/korisnik/moj-profil')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('uloga se čita iz baze, a ne iz tokena', async () => {
      const korisnik = await napraviKorisnika(t, 'LazniAdmin');
      const token = await t.app.get(JwtService).signAsync({
        sub: korisnik.id,
        email: korisnik.email,
        uloga: Uloga.ADMIN,
        sid: '00000000-0000-4000-8000-000000000000',
      });
      await javno()
        .get('/korisnik')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('token potpisan drugim ključem i istekao token se odbijaju', async () => {
      const korisnik = await napraviKorisnika(t, 'Token');
      const sadrzaj = {
        sub: korisnik.id,
        email: korisnik.email,
        uloga: Uloga.STANAR,
        sid: '00000000-0000-4000-8000-000000000000',
      };
      const jwt = t.app.get(JwtService);
      const tudj = await jwt.signAsync(sadrzaj, { secret: 'tudji-kljuc' });
      const istekao = await jwt.signAsync(sadrzaj, { expiresIn: -10 });
      for (const token of [tudj, istekao, 'nije-token']) {
        await javno()
          .get('/korisnik/moj-profil')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });
  });

  describe('osvežavanje sesije', () => {
    it('svako osvežavanje daje nov kolačić, a stari prestaje da važi', async () => {
      const korisnik = await napraviKorisnika(t, 'Sesija');
      const { kolacic } = await prijavi(t, korisnik.email);

      const prvo = await osvezi(kolacic).expect(200);
      const novi = kolacicSesije(prvo);
      expect(novi).not.toBe(kolacic);
      await javno()
        .get('/korisnik/moj-profil')
        .set('Authorization', `Bearer ${prvo.body.accessToken}`)
        .expect(200);

      const drugo = await osvezi(novi).expect(200);
      expect(kolacicSesije(drugo)).not.toBe(novi);
    });

    it('ponovna upotreba starog kolačića gasi celu sesiju', async () => {
      const korisnik = await napraviKorisnika(t, 'Ukraden');
      const { kolacic } = await prijavi(t, korisnik.email);
      const novi = kolacicSesije(await osvezi(kolacic).expect(200));

      await osvezi(kolacic).expect(401);
      await osvezi(novi).expect(401);
    });

    it('gašenje jedne sesije ne dira drugu sesiju istog korisnika', async () => {
      const korisnik = await napraviKorisnika(t, 'DvaUredjaja');
      const telefon = await prijavi(t, korisnik.email);
      const racunar = await prijavi(t, korisnik.email);
      const noviTelefon = kolacicSesije(await osvezi(telefon.kolacic));
      await osvezi(telefon.kolacic).expect(401);
      await osvezi(noviTelefon).expect(401);
      await osvezi(racunar.kolacic).expect(200);
    });

    it('bez kolačića, sa izmišljenim i sa isteklim kolačićem vraća 401', async () => {
      const korisnik = await napraviKorisnika(t, 'Istekla');
      const { kolacic } = await prijavi(t, korisnik.email);
      await t.baza.query(
        `UPDATE refresh_token SET "datumIsteka" = now() - interval '1 minute' WHERE "korisnikId" = $1`,
        [korisnik.id],
      );
      await javno().post('/auth/refresh').expect(401);
      await osvezi('refresh_token=izmisljen').expect(401);
      await osvezi(kolacic).expect(401);
    });

    it('istovremena osvežavanja istim kolačićem ne daju dve sesije', async () => {
      const korisnik = await napraviKorisnika(t, 'Trka');
      const { kolacic } = await prijavi(t, korisnik.email);
      const odgovori = await Promise.all([osvezi(kolacic), osvezi(kolacic)]);
      expect(odgovori.map((o) => o.status).toSorted((a, b) => a - b)).toEqual([
        200, 401,
      ]);
    });

    it('kad upis novog kolačića ne uspe, stari kolačić i dalje važi', async () => {
      const korisnik = await napraviKorisnika(t, 'PadUpisa');
      const { kolacic } = await prijavi(t, korisnik.email);
      await t.baza.query(
        `CREATE FUNCTION pad_upisa_sesije() RETURNS trigger LANGUAGE plpgsql
         AS $$ BEGIN RAISE EXCEPTION 'pad upisa'; END $$`,
      );
      await t.baza.query(
        `CREATE TRIGGER pad_upisa_sesije BEFORE INSERT ON refresh_token
         FOR EACH ROW WHEN (NEW."korisnikId" = ${korisnik.id})
         EXECUTE FUNCTION pad_upisa_sesije()`,
      );
      try {
        await osvezi(kolacic).expect(500);
      } finally {
        await t.baza.query('DROP TRIGGER pad_upisa_sesije ON refresh_token');
        await t.baza.query('DROP FUNCTION pad_upisa_sesije()');
      }
      await osvezi(kolacic).expect(200);
    });

    it('odjava gasi sesiju i briše kolačić', async () => {
      const korisnik = await napraviKorisnika(t, 'Odjava');
      const { kolacic } = await prijavi(t, korisnik.email);
      const odgovor = await javno()
        .post('/auth/logout')
        .set('Cookie', kolacic)
        .expect(204);
      expect(odgovor.get('Set-Cookie')?.[0]).toMatch(/^refresh_token=;/);
      await osvezi(kolacic).expect(401);
      await javno().post('/auth/logout').expect(204);
    });
  });

  describe('promena lozinke', () => {
    const promeni = (token: string, kolacic: string, telo: object) =>
      javno()
        .patch('/auth/lozinka')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', kolacic)
        .send(telo);

    it('traži ispravnu trenutnu i drugačiju novu lozinku', async () => {
      const korisnik = await napraviKorisnika(t, 'Promena');
      const { token, kolacic } = await prijavi(t, korisnik.email);
      const pogresna = await promeni(token, kolacic, {
        trenutnaLozinka: 'PogresnaLozinka1!',
        novaLozinka: NOVA_LOZINKA,
      }).expect(400);
      expect(Object.keys(pogresna.body.greske)).toEqual(['trenutnaLozinka']);
      const ista = await promeni(token, kolacic, {
        trenutnaLozinka: LOZINKA,
        novaLozinka: LOZINKA,
      }).expect(400);
      expect(Object.keys(ista.body.greske)).toEqual(['novaLozinka']);
      await prijava(korisnik.email).expect(200);
    });

    it('odjavljuje ostale uređaje, a uređaj na kom je promenjena ostaje prijavljen', async () => {
      const korisnik = await napraviKorisnika(t, 'Promena');
      const ovaj = await prijavi(t, korisnik.email);
      const drugi = await prijavi(t, korisnik.email);

      await promeni(ovaj.token, ovaj.kolacic, {
        trenutnaLozinka: LOZINKA,
        novaLozinka: NOVA_LOZINKA,
      }).expect(204);

      await osvezi(drugi.kolacic).expect(401);
      await osvezi(ovaj.kolacic).expect(200);
      await prijava(korisnik.email).expect(401);
      await prijava(korisnik.email, NOVA_LOZINKA).expect(200);
      await t.posta.sacekaj(korisnik.email, 'Lozinka je promenjena');
    });

    it('uređaj na kom je promenjena ostaje prijavljen i kad zahtev ne nosi kolačić', async () => {
      const korisnik = await napraviKorisnika(t, 'Promena');
      const ovaj = await prijavi(t, korisnik.email);
      const drugi = await prijavi(t, korisnik.email);

      await javno()
        .patch('/auth/lozinka')
        .set('Authorization', `Bearer ${ovaj.token}`)
        .send({ trenutnaLozinka: LOZINKA, novaLozinka: NOVA_LOZINKA })
        .expect(204);

      await osvezi(drugi.kolacic).expect(401);
      await osvezi(ovaj.kolacic).expect(200);
    });

    it('čeka istovremenu promenu lozinke i ne gazi je', async () => {
      const korisnik = await napraviKorisnika(t, 'Promena');
      const { token, kolacic } = await prijavi(t, korisnik.email);
      const upit = t.baza.createQueryRunner();
      await upit.connect();
      try {
        const [{ pid }]: { pid: number }[] = await upit.query(
          'SELECT pg_backend_pid() AS pid',
        );
        await upit.startTransaction();
        await upit.query('UPDATE korisnik SET lozinka = $1 WHERE id = $2', [
          await bcrypt.hash(DRUGA_LOZINKA, 10),
          korisnik.id,
        ]);
        const zahtev = promeni(token, kolacic, {
          trenutnaLozinka: LOZINKA,
          novaLozinka: NOVA_LOZINKA,
        }).then((odgovor) => odgovor);
        await vi.waitFor(
          async () => {
            const [{ broj }]: { broj: number }[] = await t.baza.query(
              `SELECT count(*)::int AS broj FROM pg_stat_activity
               WHERE $1 = ANY(pg_blocking_pids(pid))`,
              [pid],
            );
            expect(broj).toBeGreaterThan(0);
          },
          { timeout: 5000 },
        );
        await upit.commitTransaction();
        expect((await zahtev).status).toBe(400);
      } finally {
        if (upit.isTransactionActive) {
          await upit.rollbackTransaction();
        }
        await upit.release();
      }
      await prijava(korisnik.email, DRUGA_LOZINKA).expect(200);
    });
  });

  describe('zaboravljena lozinka', () => {
    const zatrazi = (email: string) =>
      javno().post('/auth/zaboravljena-lozinka').send({ email });

    it('odgovara isto za postojeću i nepostojeću adresu, a link šalje samo postojećoj', async () => {
      const korisnik = await napraviKorisnika(t, 'Zaboravio');
      const nepoznat = novEmail('Nepoznat');
      await zatrazi(korisnik.email).expect(202, {});
      await posleSlanja(() => zatrazi(nepoznat).expect(202, {}));
      await t.posta.sacekaj(korisnik.email, 'Promena lozinke');
      expect(t.posta.za(nepoznat)).toEqual([]);
    });

    it('nova lozinka važi, stara ne, a sve sesije su ugašene', async () => {
      const korisnik = await napraviKorisnika(t, 'Zaboravio');
      const { kolacic } = await prijavi(t, korisnik.email);
      await zatrazi(korisnik.email).expect(202);
      const token = tokenIzMejla(
        await t.posta.sacekaj(korisnik.email, 'Promena lozinke'),
      );

      await javno()
        .post('/auth/nova-lozinka')
        .send({ token, lozinka: NOVA_LOZINKA })
        .expect(204);

      await osvezi(kolacic).expect(401);
      await prijava(korisnik.email).expect(401);
      await prijava(korisnik.email, NOVA_LOZINKA).expect(200);
      await t.posta.sacekaj(korisnik.email, 'Lozinka je promenjena');
    });

    it('link važi jednom, a istekao i izmišljen se odbijaju', async () => {
      const korisnik = await napraviKorisnika(t, 'Zaboravio');
      await zatrazi(korisnik.email).expect(202);
      const token = tokenIzMejla(
        await t.posta.sacekaj(korisnik.email, 'Promena lozinke'),
      );
      const nova = (lozinka: string, t0 = token) =>
        javno().post('/auth/nova-lozinka').send({ token: t0, lozinka });

      await nova('kratka').expect(400);
      await nova(NOVA_LOZINKA, 'izmisljen-token').expect(400);
      await nova(NOVA_LOZINKA).expect(204);
      const ponovo = await nova('JosJednaLozinka789!').expect(400);
      expect(ponovo.body.message).toBe(PORUKA_LINK);

      await zastariTokene(korisnik.email);
      await zatrazi(korisnik.email).expect(202);
      const drugi = tokenIzMejla(
        await t.posta.sacekaj(korisnik.email, 'Promena lozinke'),
      );
      await t.baza.query(
        `UPDATE token_naloga SET "datumIsteka" = now() - interval '1 minute'
         WHERE "korisnikId" = $1`,
        [korisnik.id],
      );
      await nova('JosJednaLozinka789!', drugi).expect(400);
      await prijava(korisnik.email, NOVA_LOZINKA).expect(200);
    });

    it('kad nov mejl ne ode, link iz prethodnog mejla i dalje važi', async () => {
      const korisnik = await napraviKorisnika(t, 'Zaboravio');
      await zatrazi(korisnik.email).expect(202);
      const token = tokenIzMejla(
        await t.posta.sacekaj(korisnik.email, 'Promena lozinke'),
      );
      await zastariTokene(korisnik.email);

      t.posta.odbija = true;
      try {
        await posleSlanja(() => zatrazi(korisnik.email).expect(202));
      } finally {
        t.posta.odbija = false;
      }

      await javno()
        .post('/auth/nova-lozinka')
        .send({ token, lozinka: NOVA_LOZINKA })
        .expect(204);
    });

    it('nova lozinka otključava zaključanu prijavu', async () => {
      const korisnik = await napraviKorisnika(t, 'Zakljucan');
      for (let i = 0; i < 4; i += 1) {
        await prijava(korisnik.email, 'PogresnaLozinka1!').expect(401);
      }
      await prijava(korisnik.email, 'PogresnaLozinka1!').expect(429);
      await zatrazi(korisnik.email).expect(202);
      const token = tokenIzMejla(
        await t.posta.sacekaj(korisnik.email, 'Promena lozinke'),
      );
      await javno()
        .post('/auth/nova-lozinka')
        .send({ token, lozinka: NOVA_LOZINKA })
        .expect(204);
      await prijava(korisnik.email, NOVA_LOZINKA).expect(200);
    });

    it('neaktiviran i deaktiviran nalog ne dobijaju link', async () => {
      const neaktiviran = novEmail('Neaktiviran');
      await registruj(neaktiviran);
      await t.posta.sacekaj(neaktiviran, 'Aktivacija naloga');
      const deaktiviran = await napraviKorisnika(t, 'Deaktiviran');
      await kao(t, admin)
        .put(`/korisnik/${deaktiviran.id}/deaktivacija`)
        .expect(204);
      for (const email of [neaktiviran, deaktiviran.email]) {
        await posleSlanja(() => zatrazi(email).expect(202, {}));
        expect(t.posta.za(email)).toEqual([]);
      }
    });
  });

  describe('deaktiviran nalog', () => {
    it('odmah gubi pristup, a posle aktivacije se ponovo prijavljuje', async () => {
      const korisnik = await napraviKorisnika(t, 'Deaktiviran');
      const { token, kolacic } = await prijavi(t, korisnik.email);
      await zatraziLink(korisnik.email);
      const link = tokenIzMejla(
        await t.posta.sacekaj(korisnik.email, 'Promena lozinke'),
      );

      await kao(t, admin)
        .put(`/korisnik/${korisnik.id}/deaktivacija`)
        .expect(204);

      await javno()
        .get('/korisnik/moj-profil')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      await osvezi(kolacic).expect(401);
      await prijava(korisnik.email).expect(401);
      await javno()
        .post('/auth/nova-lozinka')
        .send({ token: link, lozinka: NOVA_LOZINKA })
        .expect(400);

      await kao(t, admin)
        .delete(`/korisnik/${korisnik.id}/deaktivacija`)
        .expect(204);
      await osvezi(kolacic).expect(401);
      await prijava(korisnik.email).expect(200);
    });

    it('registracija na adresu deaktiviranog naloga ne šalje ništa i ne menja nalog', async () => {
      const korisnik = await napraviKorisnika(t, 'Deaktiviran');
      await kao(t, admin)
        .put(`/korisnik/${korisnik.id}/deaktivacija`)
        .expect(204);
      await posleSlanja(() =>
        registruj(korisnik.email, { lozinka: NOVA_LOZINKA }),
      );
      expect(t.posta.za(korisnik.email)).toEqual([]);
      expect(await korisnici().countBy({ email: korisnik.email })).toBe(1);
    });

    const zatraziLink = (email: string) =>
      javno().post('/auth/zaboravljena-lozinka').send({ email }).expect(202);
  });
});

describe('ograničenje broja zahteva', () => {
  let t: TestAplikacija;

  beforeAll(async () => {
    t = await pokreniAplikaciju({ ogranicenjeZahteva: true });
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('šesti pokušaj prijave u minutu se odbija pre provere lozinke', async () => {
    const pokusaj = () =>
      request(t.server)
        .post('/auth/login')
        .send({ email: novEmail('Uporni'), lozinka: LOZINKA });
    for (let i = 0; i < 5; i += 1) {
      await pokusaj().expect(401);
    }
    const sesti = await pokusaj().expect(429);
    expect(sesti.body.message).toBe(
      'Previše pokušaja. Sačekaj minut pa pokušaj ponovo.',
    );
  });

  it('ograničenje važi posebno za svaku rutu', async () => {
    await request(t.server)
      .post('/auth/zaboravljena-lozinka')
      .send({ email: novEmail('Uporni') })
      .expect(202);
  });
});

describe('CORS', () => {
  let t: TestAplikacija;

  beforeAll(async () => {
    t = await pokreniAplikaciju();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('pregledač pamti preflight odgovor da ne bi pitao pre svakog zahteva', async () => {
    const frontend = t.app.get(ConfigService).get<string>('FRONTEND_URL')!;
    const odgovor = await request(t.server)
      .options('/kvar')
      .set('Origin', frontend)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
      .expect(204);
    expect(odgovor.headers['access-control-max-age']).toBe(
      String(CORS_KES_SEKUNDI),
    );
  });
});
