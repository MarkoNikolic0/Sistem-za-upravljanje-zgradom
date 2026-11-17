import { LokacijaTip } from '../src/shared/enums/kvar.enums.js';
import { VrstaSastanka } from '../src/shared/enums/sastanak.enums.js';
import { Uloga } from '../src/shared/enums/uloga.enum.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  dodeliZgradu,
  napraviKorisnika,
  napraviSadrzaj,
  napraviServisera,
  napraviSvet,
  napraviZgradu,
  novaAnketa,
  noviKontakt,
  noviKvar,
  noviSastanak,
  type Sadrzaj,
  type Svet,
  useli,
} from './pomoc/podaci.js';
import { sveRute, zahtevZaRutu } from './pomoc/rute.js';

const { STANAR, UPRAVNIK, SERVISER, ADMIN } = Uloga;

const JAVNE = [
  'GET /',
  'POST /auth/register',
  'POST /auth/potvrda-emaila',
  'POST /auth/ponovo-potvrda',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/logout',
  'POST /auth/zaboravljena-lozinka',
  'POST /auth/nova-lozinka',
];

const PO_ULOGAMA: Record<string, Uloga[]> = {
  'POST /zgrada': [ADMIN],
  'GET /zgrada/upravljanje': [ADMIN],
  'PATCH /zgrada/:id': [ADMIN],
  'DELETE /zgrada/:id': [ADMIN],
  'GET /zgrada/:id/upravnik': [ADMIN],
  'PUT /zgrada/:id/upravnik': [ADMIN],
  'DELETE /zgrada/:id/upravnik': [ADMIN],
  'PUT /zgrada/:id/arhiva': [ADMIN],
  'DELETE /zgrada/:id/arhiva': [ADMIN],
  'GET /korisnik': [ADMIN],
  'PUT /korisnik/:korisnikId/specijalnosti': [ADMIN],
  'PATCH /korisnik/:id/uloga': [ADMIN],
  'PUT /korisnik/:id/deaktivacija': [ADMIN],
  'DELETE /korisnik/:id/deaktivacija': [ADMIN],

  'GET /zgrada/pregled': [UPRAVNIK, ADMIN],
  'POST /stan': [UPRAVNIK, ADMIN],
  'POST /stan/grupno': [UPRAVNIK, ADMIN],
  'PATCH /stan/:id': [UPRAVNIK, ADMIN],
  'DELETE /stan/:id': [UPRAVNIK, ADMIN],
  'GET /zahtev-povezivanje': [UPRAVNIK, ADMIN],
  'PATCH /zahtev-povezivanje/:id/obradjen': [UPRAVNIK, ADMIN],
  'GET /zgrada/:zgradaId/stanar': [UPRAVNIK, ADMIN],
  'PATCH /zgrada/:zgradaId/stanar/:id': [UPRAVNIK, ADMIN],
  'DELETE /zgrada/:zgradaId/stanar/:id': [UPRAVNIK, ADMIN],
  'GET /kvar/serviseri/:kategorija': [UPRAVNIK, ADMIN],
  'PATCH /kvar/:id/prihvati': [UPRAVNIK, ADMIN],
  'PATCH /kvar/:id/odbij': [UPRAVNIK, ADMIN],
  'PATCH /kvar/:id/prioritet': [UPRAVNIK, ADMIN],
  'PATCH /kvar/:id/dodeli': [UPRAVNIK, ADMIN],
  'PATCH /kvar/:id/zatvori': [UPRAVNIK, ADMIN],
  'POST /glasanje': [UPRAVNIK, ADMIN],
  'GET /glasanje/odluke': [UPRAVNIK, ADMIN],
  'PATCH /glasanje/:id/zatvori': [UPRAVNIK, ADMIN],
  'DELETE /glasanje/:id': [UPRAVNIK, ADMIN],
  'POST /sastanak': [UPRAVNIK, ADMIN],
  'PATCH /sastanak/:id': [UPRAVNIK, ADMIN],
  'PATCH /sastanak/:id/otkazi': [UPRAVNIK, ADMIN],
  'GET /sastanak/:sastanakId/prisustvo': [UPRAVNIK, ADMIN],
  'PUT /sastanak/:sastanakId/prisustvo': [UPRAVNIK, ADMIN],
  'PUT /sastanak/:sastanakId/zapisnik': [UPRAVNIK, ADMIN],
  'DELETE /sastanak/:sastanakId/zapisnik': [UPRAVNIK, ADMIN],
  'POST /zgrada/:zgradaId/dokument': [UPRAVNIK, ADMIN],
  'PATCH /zgrada/:zgradaId/dokument/:id': [UPRAVNIK, ADMIN],
  'DELETE /zgrada/:zgradaId/dokument/:id': [UPRAVNIK, ADMIN],
  'POST /zgrada/:zgradaId/kontakt': [UPRAVNIK, ADMIN],
  'PATCH /zgrada/:zgradaId/kontakt/:id': [UPRAVNIK, ADMIN],
  'DELETE /zgrada/:zgradaId/kontakt/:id': [UPRAVNIK, ADMIN],

  'PATCH /kvar/:id/status': [SERVISER],
  'PATCH /kvar/:id/dolazak': [SERVISER],
  'GET /kvar/zgrade': [SERVISER, ADMIN],

  'POST /oglas': [STANAR, UPRAVNIK, ADMIN],
  'GET /oglas': [STANAR, UPRAVNIK, ADMIN],
  'GET /oglas/:id': [STANAR, UPRAVNIK, ADMIN],
  'PATCH /oglas/:id': [STANAR, UPRAVNIK, ADMIN],
  'PATCH /oglas/:id/sakrij': [STANAR, UPRAVNIK, ADMIN],
  'PATCH /oglas/:id/obnovi': [STANAR, UPRAVNIK, ADMIN],
  'POST /oglas/:id/prilog': [STANAR, UPRAVNIK, ADMIN],
  'DELETE /oglas/:id/prilog/:prilogId': [STANAR, UPRAVNIK, ADMIN],
  'DELETE /oglas/:id': [STANAR, UPRAVNIK, ADMIN],
  'GET /glasanje': [STANAR, UPRAVNIK, ADMIN],
  'GET /glasanje/:id': [STANAR, UPRAVNIK, ADMIN],
  'PUT /glasanje/:id/glas': [STANAR, UPRAVNIK, ADMIN],
  'DELETE /glasanje/:id/glas': [STANAR, UPRAVNIK, ADMIN],
  'GET /sastanak': [STANAR, UPRAVNIK, ADMIN],
  'GET /sastanak/:id': [STANAR, UPRAVNIK, ADMIN],
  'PUT /sastanak/:sastanakId/najava': [STANAR, UPRAVNIK, ADMIN],
  'DELETE /sastanak/:sastanakId/najava': [STANAR, UPRAVNIK, ADMIN],
  'GET /zgrada/:zgradaId/dokument': [STANAR, UPRAVNIK, ADMIN],
  'GET /zgrada/:zgradaId/kontakt': [STANAR, UPRAVNIK, ADMIN],

  'POST /zahtev-povezivanje': [STANAR, UPRAVNIK],
  'GET /oglas/broj-neprocitanih': [STANAR, UPRAVNIK],
  'PUT /oglas/procitano': [STANAR, UPRAVNIK],
};

const SVI_PRIJAVLJENI = [
  'PATCH /auth/lozinka',
  'GET /notifikacija',
  'GET /notifikacija/broj-neprocitanih',
  'PUT /notifikacija/procitano',
  'GET /notifikacija/push-kljuc',
  'PUT /notifikacija/push-pretplata',
  'DELETE /notifikacija/push-pretplata',
  'PUT /notifikacija/:id/procitano',
  'GET /zgrada',
  'GET /zgrada/:id',
  'GET /korisnik/moj-profil',
  'PATCH /korisnik/moj-profil',
  'GET /stan',
  'GET /stan/zgrada/:zgradaId',
  'GET /zahtev-povezivanje/moji-zahtevi',
  'POST /kvar',
  'GET /kvar',
  'GET /kvar/slicni',
  'GET /kvar/:id',
  'PATCH /kvar/:id/povuci',
  'PATCH /kvar/:id/potvrdi',
  'PATCH /kvar/:id/vrati',
  'POST /kvar/:kvarId/komentar',
  'GET /kvar/:kvarId/komentar',
  'DELETE /kvar/:kvarId/komentar/:id',
  'GET /kvar/:kvarId/slika',
  'POST /kvar/:kvarId/slika',
  'DELETE /kvar/:kvarId/slika/:id',
  'PUT /kvar/:kvarId/pracenje',
  'DELETE /kvar/:kvarId/pracenje',
];

const NEPOSTOJECI_ID = '987654';
const ODBIJENO_PO_ULOZI = 'Forbidden resource';

describe('prava pristupa', () => {
  let t: TestAplikacija;
  let svet: Svet;
  let sadrzaj: Sadrzaj;
  let poUlozi: Record<Uloga, Akter>;

  const zahtev = (ruta: string, akter?: Akter) =>
    zahtevZaRutu(
      t,
      ruta,
      akter,
      ruta
        .split(' ')[1]
        .replace(':kategorija', 'vodovod')
        .replace(/:\w+/g, NEPOSTOJECI_ID),
    );

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    svet = await napraviSvet(t);
    sadrzaj = await napraviSadrzaj(t, svet, svet.a);
    poUlozi = {
      [STANAR]: svet.a.vlasnik,
      [UPRAVNIK]: svet.a.upravnik,
      [SERVISER]: svet.serviser,
      [ADMIN]: svet.admin,
    };
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('ko sme da pozove rutu', () => {
    it('svaka ruta ima zapisano ko sme da je pozove', () => {
      const razvrstane = [
        ...JAVNE,
        ...SVI_PRIJAVLJENI,
        ...Object.keys(PO_ULOGAMA),
      ];
      expect(razvrstane.toSorted()).toEqual(sveRute(t).toSorted());
    });

    it.each([...SVI_PRIJAVLJENI, ...Object.keys(PO_ULOGAMA)])(
      '%s bez prijave vraća 401',
      async (ruta) => {
        await zahtev(ruta).expect(401);
      },
    );

    it.each(JAVNE.filter((ruta) => ruta !== 'POST /auth/refresh'))(
      '%s radi bez prijave',
      async (ruta) => {
        const odgovor = await zahtev(ruta);
        expect(odgovor.status).not.toBe(401);
        expect(odgovor.status).not.toBe(403);
      },
    );

    describe.each(Object.values(Uloga))('uloga %s', (uloga) => {
      it.each(Object.entries(PO_ULOGAMA))('%s', async (ruta, dozvoljene) => {
        const odgovor = await zahtev(ruta, poUlozi[uloga]);
        const odbijenPoUlozi =
          odgovor.status === 403 && odgovor.body.message === ODBIJENO_PO_ULOZI;
        expect(odbijenPoUlozi).toBe(!dozvoljene.includes(uloga));
      });

      it.each(SVI_PRIJAVLJENI)('%s nije zatvoreno po ulozi', async (ruta) => {
        const odgovor = await zahtev(ruta, poUlozi[uloga]);
        expect(odgovor.status).not.toBe(401);
        expect(odgovor.body.message).not.toBe(ODBIJENO_PO_ULOZI);
      });
    });
  });

  describe('serviser', () => {
    let drugiServiser: Akter;

    beforeAll(async () => {
      drugiServiser = await napraviServisera(t, 'DrugiServiser');
    });

    it('u spisku vidi samo kvarove koji su mu dodeljeni', async () => {
      const odgovor = await kao(t, svet.serviser).get('/kvar').expect(200);
      expect(odgovor.body.stavke.map((k: { id: number }) => k.id)).toEqual([
        sadrzaj.kvarServisera,
      ]);
      const prazno = await kao(t, drugiServiser).get('/kvar').expect(200);
      expect(prazno.body).toEqual({ stavke: [], ukupno: 0 });
    });

    it('otvara dodeljen kvar, a tuđ i nedodeljen ne', async () => {
      await kao(t, svet.serviser)
        .get(`/kvar/${sadrzaj.kvarServisera}`)
        .expect(200);
      await kao(t, svet.serviser)
        .get(`/kvar/${sadrzaj.kvarZajednicki}`)
        .expect(404);
      await kao(t, drugiServiser)
        .get(`/kvar/${sadrzaj.kvarServisera}`)
        .expect(404);
    });

    it('ne čita i ne piše komentare i slike na kvaru koji mu nije dodeljen', async () => {
      const kvar = `/kvar/${sadrzaj.kvarServisera}`;
      await kao(t, drugiServiser).get(`${kvar}/komentar`).expect(404);
      await kao(t, drugiServiser)
        .post(`${kvar}/komentar`)
        .send({ tekst: 'Nije moj kvar.' })
        .expect(404);
      await kao(t, drugiServiser).get(`${kvar}/slika`).expect(404);
      await kao(t, svet.serviser).get(`${kvar}/komentar`).expect(200);
    });

    it('ne menja status ni dolazak na tuđem kvaru', async () => {
      const kvar = `/kvar/${sadrzaj.kvarServisera}`;
      await kao(t, drugiServiser)
        .patch(`${kvar}/status`)
        .send({ status: 'u_toku' })
        .expect(403);
      await kao(t, drugiServiser)
        .patch(`${kvar}/dolazak`)
        .send({ dolazak: null })
        .expect(403);
    });

    it('među zgradama vidi samo one u kojima ima dodeljen kvar', async () => {
      const moje = await kao(t, svet.serviser).get('/kvar/zgrade').expect(200);
      expect(moje.body.map((z: { id: number }) => z.id)).toEqual([svet.a.id]);
      const nista = await kao(t, drugiServiser).get('/kvar/zgrade').expect(200);
      expect(nista.body).toEqual([]);
    });

    it('ne vidi oglase, glasanja, sastanke ni dokumente zgrade', async () => {
      for (const putanja of ['/oglas', '/glasanje', '/sastanak']) {
        await kao(t, svet.serviser).get(putanja).expect(403);
      }
      await kao(t, svet.serviser).get(`/oglas/${sadrzaj.oglas}`).expect(403);
      await kao(t, svet.serviser)
        .get(`/glasanje/${sadrzaj.anketa}`)
        .expect(403);
      await kao(t, svet.serviser).get(`/sastanak/${sadrzaj.zbor}`).expect(403);
      await kao(t, svet.serviser)
        .get(`/zgrada/${svet.a.id}/dokument`)
        .expect(403);
    });

    it('ne može da prijavi kvar ni da glasa', async () => {
      await kao(t, svet.serviser)
        .post('/kvar')
        .send(noviKvar(svet.a.stanovi[0], LokacijaTip.PRIVATNI_STAN))
        .expect(403);
      await kao(t, svet.serviser)
        .put(`/glasanje/${sadrzaj.anketa}/glas`)
        .send({ opcijaId: sadrzaj.opcijaAnkete })
        .expect(403);
    });
  });

  describe('vlasnik i ukućanin', () => {
    const ids = async (akter: Akter, putanja: string) => {
      const odgovor = await kao(t, akter).get(putanja).expect(200);
      return (odgovor.body.stavke as { id: number }[]).map((s) => s.id);
    };

    it('odluku vidi vlasnik, a ukućanin ne', async () => {
      await kao(t, svet.a.vlasnik)
        .get(`/glasanje/${sadrzaj.odluka}`)
        .expect(200);
      await kao(t, svet.a.ukucanin)
        .get(`/glasanje/${sadrzaj.odluka}`)
        .expect(404);
      expect(await ids(svet.a.vlasnik, '/glasanje')).toContain(sadrzaj.odluka);
      expect(await ids(svet.a.ukucanin, '/glasanje')).toEqual([sadrzaj.anketa]);
    });

    it('skupštinu vidi vlasnik, a ukućanin samo zbor', async () => {
      await kao(t, svet.a.vlasnik)
        .get(`/sastanak/${sadrzaj.skupstina}`)
        .expect(200);
      await kao(t, svet.a.ukucanin)
        .get(`/sastanak/${sadrzaj.skupstina}`)
        .expect(404);
      await kao(t, svet.a.ukucanin)
        .get(`/sastanak/${sadrzaj.zbor}`)
        .expect(200);
      expect(await ids(svet.a.ukucanin, '/sastanak')).toEqual([sadrzaj.zbor]);
      expect(
        (await ids(svet.a.vlasnik, '/sastanak')).toSorted((a, b) => a - b),
      ).toEqual([sadrzaj.zbor, sadrzaj.skupstina].toSorted((a, b) => a - b));
    });

    it('dokument samo za vlasnike ukućanin ne dobija', async () => {
      const dokumenti = `/zgrada/${svet.a.id}/dokument`;
      expect(
        (await ids(svet.a.vlasnik, dokumenti)).toSorted((a, b) => a - b),
      ).toEqual(
        [sadrzaj.dokument, sadrzaj.dokumentVlasnika].toSorted((a, b) => a - b),
      );
      expect(await ids(svet.a.ukucanin, dokumenti)).toEqual([sadrzaj.dokument]);
    });

    it('na skupštinu dolazak najavljuje samo vlasnik, na zbor oboje', async () => {
      const najava = (akter: Akter, sastanak: number) =>
        kao(t, akter)
          .put(`/sastanak/${sastanak}/najava`)
          .send({ dolazi: true });
      await najava(svet.a.ukucanin, sadrzaj.skupstina).expect(404);
      await najava(svet.a.vlasnik, sadrzaj.skupstina).expect(200);
      await najava(svet.a.ukucanin, sadrzaj.zbor).expect(200);
      await najava(svet.a.vlasnik, sadrzaj.zbor).expect(200);
    });

    it('u anketi glasaju oboje, u odluci samo vlasnik', async () => {
      const glas = (akter: Akter, glasanje: number, opcijaId: number) =>
        kao(t, akter).put(`/glasanje/${glasanje}/glas`).send({ opcijaId });
      await glas(svet.a.ukucanin, sadrzaj.anketa, sadrzaj.opcijaAnkete).expect(
        200,
      );
      await glas(svet.a.vlasnik, sadrzaj.anketa, sadrzaj.opcijaAnkete).expect(
        200,
      );
      await glas(svet.a.ukucanin, sadrzaj.odluka, sadrzaj.opcijaOdluke).expect(
        404,
      );
      await glas(svet.a.vlasnik, sadrzaj.odluka, sadrzaj.opcijaOdluke).expect(
        200,
      );
    });

    it('kvar iz tuđeg stana ne vidi ni komšija iz iste zgrade', async () => {
      await kao(t, svet.a.sused).get(`/kvar/${sadrzaj.kvarStan}`).expect(404);
      await kao(t, svet.a.ukucanin)
        .get(`/kvar/${sadrzaj.kvarStan}`)
        .expect(200);
      expect(await ids(svet.a.sused, '/kvar')).not.toContain(sadrzaj.kvarStan);
      await kao(t, svet.a.sused)
        .get(`/kvar/${sadrzaj.kvarZajednicki}`)
        .expect(200);
    });

    it('stanar ne upravlja zgradom u kojoj živi', async () => {
      await kao(t, svet.a.vlasnik)
        .post(`/oglas`)
        .send({
          naslov: 'Obaveštenje',
          tekst: 'Tekst',
          vrsta: 'obavestenje',
          zgradaId: svet.a.id,
        })
        .expect(403);
      await kao(t, svet.a.sused)
        .patch(`/oglas/${sadrzaj.oglas}`)
        .send({ naslov: 'Tuđ oglas' })
        .expect(403);
      await kao(t, svet.a.sused)
        .patch(`/oglas/${sadrzaj.oglas}/sakrij`)
        .send({ razlog: 'Ne sviđa mi se.' })
        .expect(403);
      await kao(t, svet.a.sused).delete(`/oglas/${sadrzaj.oglas}`).expect(403);
      await kao(t, svet.a.sused)
        .delete(`/kvar/${sadrzaj.kvarZajednicki}/komentar/${sadrzaj.komentar}`)
        .expect(403);
      await kao(t, svet.a.sused)
        .delete(`/kvar/${sadrzaj.kvarZajednicki}/slika/${sadrzaj.slika}`)
        .expect(403);
      await kao(t, svet.a.sused)
        .patch(`/kvar/${sadrzaj.kvarZajednicki}/povuci`)
        .send({})
        .expect(403);
    });
  });

  describe('korisnik bez stana', () => {
    it('ne vidi ništa iz zgrada i ne može da prijavi kvar', async () => {
      for (const putanja of ['/kvar', '/oglas', '/glasanje', '/sastanak']) {
        const odgovor = await kao(t, svet.bezStana).get(putanja).expect(200);
        expect(odgovor.body).toEqual({ stavke: [], ukupno: 0 });
      }
      await kao(t, svet.bezStana)
        .post('/kvar')
        .send(noviKvar(svet.a.stanovi[2], LokacijaTip.PRIVATNI_STAN))
        .expect(403);
      await kao(t, svet.bezStana)
        .get(`/zgrada/${svet.a.id}/kontakt`)
        .expect(403);
    });

    it('zahtev na čekanju mu ne daje pristup zgradi', async () => {
      const moji = await kao(t, svet.bezStana)
        .get('/zahtev-povezivanje/moji-zahtevi')
        .expect(200);
      expect(moji.body).toHaveLength(1);
      await kao(t, svet.bezStana)
        .get(`/kvar/${sadrzaj.kvarZajednicki}`)
        .expect(404);
      await kao(t, svet.bezStana).get(`/oglas/${sadrzaj.oglas}`).expect(404);
    });
  });

  describe('upravnik jedne zgrade koji stanuje u drugoj', () => {
    let upravnik: Akter;
    let njegova: { id: number; stanovi: number[] };
    let tudjKvar: number;

    beforeAll(async () => {
      njegova = await napraviZgradu(t, 'Delta');
      upravnik = await napraviKorisnika(t, 'UpravnikDelta', {
        uloga: UPRAVNIK,
      });
      await dodeliZgradu(t, upravnik, njegova.id);
      await useli(t, upravnik, svet.a.stanovi[1], false);
      const odgovor = await kao(t, svet.a.sused)
        .post('/kvar')
        .send(noviKvar(svet.a.stanovi[1], LokacijaTip.PRIVATNI_STAN))
        .expect(201);
      tudjKvar = odgovor.body.id;
    });

    it('u zgradi u kojoj stanuje ima prava stanara, ne upravnika', async () => {
      const detalj = await kao(t, upravnik)
        .get(`/kvar/${sadrzaj.kvarZajednicki}`)
        .expect(200);
      expect(detalj.body.smeDaUpravlja).toBe(false);
      await kao(t, upravnik).get(`/kvar/${tudjKvar}`).expect(200);
      await kao(t, upravnik).get(`/kvar/${sadrzaj.kvarStan}`).expect(404);
      await kao(t, upravnik)
        .patch(`/kvar/${sadrzaj.kvarZajednicki}/prihvati`)
        .expect(403);
      await kao(t, upravnik).get(`/zgrada/${svet.a.id}/stanar`).expect(403);
      await kao(t, upravnik)
        .post('/glasanje')
        .send(novaAnketa(svet.a.id))
        .expect(403);
      await kao(t, upravnik).get(`/glasanje/${sadrzaj.anketa}`).expect(200);
      await kao(t, upravnik).get(`/glasanje/${sadrzaj.odluka}`).expect(404);
      await kao(t, upravnik).get(`/sastanak/${sadrzaj.skupstina}`).expect(404);
    });

    it('svojom zgradom upravlja', async () => {
      await kao(t, upravnik).get(`/zgrada/${njegova.id}/stanar`).expect(200);
      await kao(t, upravnik)
        .post('/glasanje')
        .send(novaAnketa(njegova.id))
        .expect(201);
      await kao(t, upravnik)
        .post(`/zgrada/${njegova.id}/kontakt`)
        .send(noviKontakt())
        .expect(201);
    });
  });

  describe('upravnik dve zgrade', () => {
    let upravnik: Akter;
    let zgrade: { id: number; stanovi: number[] }[];

    beforeAll(async () => {
      zgrade = [
        await napraviZgradu(t, 'Epsilon'),
        await napraviZgradu(t, 'Zeta'),
      ];
      upravnik = await napraviKorisnika(t, 'UpravnikDveZgrade', {
        uloga: UPRAVNIK,
      });
      for (const zgrada of zgrade) {
        await dodeliZgradu(t, upravnik, zgrada.id);
      }
    });

    it('upravlja obema zgradama', async () => {
      for (const zgrada of zgrade) {
        await kao(t, upravnik).get(`/zgrada/${zgrada.id}/stanar`).expect(200);
        await kao(t, upravnik)
          .post('/glasanje')
          .send(novaAnketa(zgrada.id))
          .expect(201);
        await kao(t, upravnik)
          .post('/sastanak')
          .send(noviSastanak(zgrada.id, VrstaSastanka.ZBOR))
          .expect(201);
        await kao(t, upravnik)
          .post(`/zgrada/${zgrada.id}/kontakt`)
          .send(noviKontakt())
          .expect(201);
      }
    });

    it('treću zgradu ne vidi i njome ne upravlja', async () => {
      await kao(t, upravnik).get(`/zgrada/${svet.a.id}/stanar`).expect(403);
      await kao(t, upravnik)
        .post('/glasanje')
        .send(novaAnketa(svet.a.id))
        .expect(403);
      await kao(t, upravnik).get(`/kvar/${sadrzaj.kvarZajednicki}`).expect(404);
      await kao(t, upravnik)
        .patch(`/kvar/${sadrzaj.kvarZajednicki}/prihvati`)
        .expect(403);
      await kao(t, upravnik).get(`/glasanje/${sadrzaj.anketa}`).expect(404);
    });
  });

  describe('admin', () => {
    it('radi sve što i upravnik, u svakoj zgradi', async () => {
      for (const zgrada of [svet.a, svet.b]) {
        await kao(t, svet.admin).get(`/zgrada/${zgrada.id}/stanar`).expect(200);
        await kao(t, svet.admin)
          .post('/glasanje')
          .send(novaAnketa(zgrada.id))
          .expect(201);
        await kao(t, svet.admin)
          .post('/sastanak')
          .send(noviSastanak(zgrada.id, VrstaSastanka.ZBOR))
          .expect(201);
        await kao(t, svet.admin)
          .post(`/zgrada/${zgrada.id}/kontakt`)
          .send(noviKontakt())
          .expect(201);
        await kao(t, svet.admin)
          .post('/stan')
          .send({ broj: '50', sprat: 5, kvadratura: 70, zgradaId: zgrada.id })
          .expect(201);
      }
      await kao(t, svet.admin)
        .patch(`/kvar/${sadrzaj.kvarZajednicki}/prioritet`)
        .send({ prioritet: 'hitno' })
        .expect(200);
      await kao(t, svet.admin).get(`/glasanje/${sadrzaj.odluka}`).expect(200);
      await kao(t, svet.admin)
        .get(`/sastanak/${sadrzaj.skupstina}`)
        .expect(200);
      await kao(t, svet.admin).get(`/kvar/${sadrzaj.kvarStan}`).expect(200);
    });

    it('bez stana ne glasa, ne najavljuje dolazak i ne prijavljuje kvar', async () => {
      await kao(t, svet.admin)
        .put(`/glasanje/${sadrzaj.anketa}/glas`)
        .send({ opcijaId: sadrzaj.opcijaAnkete })
        .expect(403);
      await kao(t, svet.admin)
        .put(`/sastanak/${sadrzaj.zbor}/najava`)
        .send({ dolazi: true })
        .expect(403);
      await kao(t, svet.admin)
        .post('/kvar')
        .send(noviKvar(svet.a.stanovi[0], LokacijaTip.PRIVATNI_STAN))
        .expect(403);
    });

    it('ne može da menja svoj ni drugi administratorski nalog', async () => {
      const drugiAdmin = await napraviKorisnika(t, 'DrugiAdmin', {
        uloga: ADMIN,
      });
      await kao(t, svet.admin)
        .put(`/korisnik/${svet.admin.id}/deaktivacija`)
        .expect(403);
      await kao(t, svet.admin)
        .put(`/korisnik/${drugiAdmin.id}/deaktivacija`)
        .expect(403);
      await kao(t, svet.admin)
        .patch(`/korisnik/${drugiAdmin.id}/uloga`)
        .send({ uloga: 'stanar' })
        .expect(403);
    });

    it('nikome ne može da dodeli ulogu admina ni upravnika preko promene uloge', async () => {
      for (const uloga of ['admin', 'upravnik']) {
        await kao(t, svet.admin)
          .patch(`/korisnik/${svet.bezStana.id}/uloga`)
          .send({ uloga })
          .expect(400);
      }
    });
  });

  describe('lični podaci', () => {
    const kljucevi = (vrednost: unknown): string[] =>
      Array.isArray(vrednost)
        ? vrednost.flatMap(kljucevi)
        : vrednost !== null && typeof vrednost === 'object'
          ? Object.entries(vrednost).flatMap(([kljuc, v]) => [
              kljuc,
              ...kljucevi(v),
            ])
          : [];

    const putanje = () => [
      '/kvar',
      `/kvar/${sadrzaj.kvarZajednicki}`,
      `/kvar/${sadrzaj.kvarZajednicki}/komentar`,
      `/kvar/${sadrzaj.kvarZajednicki}/slika`,
      '/oglas',
      `/oglas/${sadrzaj.oglas}`,
      '/glasanje',
      `/glasanje/${sadrzaj.anketa}`,
      '/sastanak',
      `/sastanak/${sadrzaj.zbor}`,
      `/zgrada/${svet.a.id}/dokument`,
      `/zgrada/${svet.a.id}/kontakt`,
      '/notifikacija',
    ];

    it('stanar ne dobija email ni telefon drugih korisnika', async () => {
      for (const putanja of putanje()) {
        const odgovor = await kao(t, svet.a.sused).get(putanja).expect(200);
        const polja = kljucevi(odgovor.body);
        expect(polja, putanja).not.toContain('email');
        if (!putanja.endsWith('/kontakt')) {
          expect(polja, putanja).not.toContain('telefon');
        }
      }
    });

    it('upravnik uz kvar dobija kontakt onoga ko ga je prijavio', async () => {
      const odgovor = await kao(t, svet.a.upravnik)
        .get(`/kvar/${sadrzaj.kvarZajednicki}`)
        .expect(200);
      expect(odgovor.body.korisnik).toMatchObject({
        email: svet.a.vlasnik.email,
        telefon: '+381641234567',
      });
    });

    it('serviser uz dodeljen kvar dobija kontakt onoga ko ga je prijavio', async () => {
      const odgovor = await kao(t, svet.serviser)
        .get(`/kvar/${sadrzaj.kvarServisera}`)
        .expect(200);
      expect(odgovor.body.korisnik.email).toBe(svet.a.vlasnik.email);
    });

    it('nijedan odgovor ne sadrži lozinku, ključeve fajlova ni interne datume naloga', async () => {
      const zabranjena = [
        'lozinka',
        'kljuc',
        'kljucSlicice',
        'emailPotvrdjen',
        'oglasiProcitaniDo',
        'tokenHash',
      ];
      const sve = [
        ...putanje(),
        '/korisnik',
        '/korisnik/moj-profil',
        `/zgrada/${svet.a.id}/stanar`,
        '/zgrada/upravljanje',
        `/zgrada/${svet.a.id}/upravnik`,
        '/zahtev-povezivanje',
        `/sastanak/${sadrzaj.skupstina}/prisustvo`,
        '/kvar/serviseri/vodovod',
      ];
      for (const putanja of sve) {
        const odgovor = await kao(t, svet.admin).get(putanja).expect(200);
        const polja = kljucevi(odgovor.body);
        expect(
          polja.filter((p) => zabranjena.includes(p)),
          putanja,
        ).toEqual([]);
        expect(JSON.stringify(odgovor.body), putanja).not.toContain('$2b$');
      }
    });
  });
});
