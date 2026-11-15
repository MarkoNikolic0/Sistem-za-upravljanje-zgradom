import { In, Not } from 'typeorm';
import { Notifikacija } from '../src/notifikacija/notifikacija.entity.js';
import { LokacijaTip } from '../src/shared/enums/kvar.enums.js';
import { VrstaSastanka } from '../src/shared/enums/sastanak.enums.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  napraviSadrzaj,
  napraviSvet,
  napraviZgraduSaLjudima,
  novaAnketa,
  noviKontakt,
  noviKvar,
  noviOglas,
  noviSastanak,
  pdf,
  type Sadrzaj,
  slika,
  type Svet,
  zaDana,
  type ZgradaSveta,
} from './pomoc/podaci.js';
import { otisakBaze, sveRute, zahtevZaRutu } from './pomoc/rute.js';

interface Meta {
  zgrada: ZgradaSveta;
  sadrzaj: Sadrzaj;
  svet: Svet;
}

interface Proba {
  putanja: (m: Meta) => string;
  telo?: (m: Meta) => object;
  fajl?: {
    polje: string;
    vrsta: 'slika' | 'pdf';
    polja?: Record<string, string>;
  };
  vecObradjenoUArhivi?: boolean;
}

const stan = (m: Meta) => m.zgrada.stanovi[0];
const zajednicki = (nastavak = '') => ({
  putanja: (m: Meta) => `/kvar/${m.sadrzaj.kvarZajednicki}${nastavak}`,
});
const razlog = () => ({ tekst: 'Razlog iz druge zgrade.' });

const TUDJI_PODACI: Record<string, Proba | Proba[]> = {
  'POST /kvar': [
    {
      putanja: () => '/kvar',
      telo: (m) => noviKvar(stan(m), LokacijaTip.PRIVATNI_STAN),
    },
    {
      putanja: () => '/kvar',
      telo: (m) => noviKvar(stan(m), LokacijaTip.ZAJEDNICKI_PROSTOR),
    },
  ],
  'GET /kvar/slicni': {
    putanja: (m) => `/kvar/slicni?stanId=${stan(m)}&kategorija=vodovod`,
  },
  'GET /kvar/:id': [
    zajednicki(),
    { putanja: (m) => `/kvar/${m.sadrzaj.kvarStan}` },
    { putanja: (m) => `/kvar/${m.sadrzaj.kvarServisera}` },
  ],
  'PATCH /kvar/:id/prihvati': zajednicki('/prihvati'),
  'PATCH /kvar/:id/odbij': { ...zajednicki('/odbij'), telo: razlog },
  'PATCH /kvar/:id/povuci': { ...zajednicki('/povuci'), telo: () => ({}) },
  'PATCH /kvar/:id/prioritet': {
    ...zajednicki('/prioritet'),
    telo: () => ({ prioritet: 'hitno' }),
  },
  'PATCH /kvar/:id/dodeli': {
    ...zajednicki('/dodeli'),
    telo: (m) => ({ serviserId: m.svet.serviser.id }),
  },
  'PATCH /kvar/:id/status': {
    putanja: (m) => `/kvar/${m.sadrzaj.kvarServisera}/status`,
    telo: () => ({ status: 'u_toku' }),
  },
  'PATCH /kvar/:id/dolazak': {
    putanja: (m) => `/kvar/${m.sadrzaj.kvarServisera}/dolazak`,
    telo: () => ({ dolazak: zaDana(1) }),
  },
  'PATCH /kvar/:id/potvrdi': zajednicki('/potvrdi'),
  'PATCH /kvar/:id/vrati': { ...zajednicki('/vrati'), telo: razlog },
  'PATCH /kvar/:id/zatvori': zajednicki('/zatvori'),
  'POST /kvar/:kvarId/komentar': { ...zajednicki('/komentar'), telo: razlog },
  'GET /kvar/:kvarId/komentar': zajednicki('/komentar'),
  'DELETE /kvar/:kvarId/komentar/:id': {
    putanja: (m) =>
      `/kvar/${m.sadrzaj.kvarZajednicki}/komentar/${m.sadrzaj.komentar}`,
  },
  'GET /kvar/:kvarId/slika': zajednicki('/slika'),
  'POST /kvar/:kvarId/slika': {
    ...zajednicki('/slika'),
    fajl: { polje: 'slika', vrsta: 'slika' },
  },
  'DELETE /kvar/:kvarId/slika/:id': {
    putanja: (m) =>
      `/kvar/${m.sadrzaj.kvarZajednicki}/slika/${m.sadrzaj.slika}`,
  },
  'PUT /kvar/:kvarId/pracenje': zajednicki('/pracenje'),
  'DELETE /kvar/:kvarId/pracenje': zajednicki('/pracenje'),

  'POST /oglas': [
    { putanja: () => '/oglas', telo: (m) => noviOglas(m.zgrada.id) },
    {
      putanja: () => '/oglas',
      telo: (m) => ({
        ...noviOglas(m.zgrada.id),
        glasanjeId: m.sadrzaj.odluka,
      }),
    },
  ],
  'GET /oglas/:id': [
    { putanja: (m) => `/oglas/${m.sadrzaj.oglas}` },
    { putanja: (m) => `/oglas/${m.sadrzaj.obavestenje}` },
  ],
  'PATCH /oglas/:id': {
    putanja: (m) => `/oglas/${m.sadrzaj.oglas}`,
    telo: () => ({ naslov: 'Izmenjeno iz druge zgrade' }),
  },
  'PATCH /oglas/:id/sakrij': {
    putanja: (m) => `/oglas/${m.sadrzaj.oglas}/sakrij`,
    telo: () => ({ razlog: 'Razlog iz druge zgrade.' }),
  },
  'PATCH /oglas/:id/obnovi': {
    putanja: (m) => `/oglas/${m.sadrzaj.oglas}/obnovi`,
  },
  'POST /oglas/:id/prilog': {
    putanja: (m) => `/oglas/${m.sadrzaj.oglas}/prilog`,
    fajl: { polje: 'prilog', vrsta: 'slika' },
  },
  'DELETE /oglas/:id/prilog/:prilogId': {
    putanja: (m) => `/oglas/${m.sadrzaj.oglas}/prilog/${m.sadrzaj.prilog}`,
  },
  'DELETE /oglas/:id': { putanja: (m) => `/oglas/${m.sadrzaj.oglas}` },

  'POST /glasanje': {
    putanja: () => '/glasanje',
    telo: (m) => novaAnketa(m.zgrada.id),
  },
  'GET /glasanje/odluke': {
    putanja: (m) => `/glasanje/odluke?zgradaId=${m.zgrada.id}`,
  },
  'GET /glasanje/:id': [
    { putanja: (m) => `/glasanje/${m.sadrzaj.anketa}` },
    { putanja: (m) => `/glasanje/${m.sadrzaj.odluka}` },
  ],
  'PUT /glasanje/:id/glas': [
    {
      putanja: (m) => `/glasanje/${m.sadrzaj.anketa}/glas`,
      telo: (m) => ({ opcijaId: m.sadrzaj.opcijaAnkete }),
    },
    {
      putanja: (m) => `/glasanje/${m.sadrzaj.odluka}/glas`,
      telo: (m) => ({ opcijaId: m.sadrzaj.opcijaOdluke }),
    },
  ],
  'DELETE /glasanje/:id/glas': {
    putanja: (m) => `/glasanje/${m.sadrzaj.anketa}/glas`,
  },
  'PATCH /glasanje/:id/zatvori': {
    putanja: (m) => `/glasanje/${m.sadrzaj.anketa}/zatvori`,
  },
  'DELETE /glasanje/:id': [
    { putanja: (m) => `/glasanje/${m.sadrzaj.anketa}` },
    { putanja: (m) => `/glasanje/${m.sadrzaj.odluka}` },
  ],

  'POST /stan': {
    putanja: () => '/stan',
    telo: (m) => ({
      broj: '99',
      sprat: 4,
      kvadratura: 40,
      zgradaId: m.zgrada.id,
    }),
  },
  'POST /stan/grupno': {
    putanja: () => '/stan/grupno',
    telo: (m) => ({
      zgradaId: m.zgrada.id,
      stanovi: [{ broj: '98', sprat: 4, kvadratura: 40 }],
    }),
  },
  'PATCH /stan/:id': {
    putanja: (m) => `/stan/${m.zgrada.stanovi[2]}`,
    telo: () => ({ kvadratura: 999 }),
  },
  'DELETE /stan/:id': { putanja: (m) => `/stan/${m.zgrada.stanovi[2]}` },

  'PATCH /zahtev-povezivanje/:id/obradjen': {
    putanja: (m) => `/zahtev-povezivanje/${m.sadrzaj.zahtev}/obradjen`,
    telo: () => ({ status: 'prihvacen', vlasnik: true }),
    vecObradjenoUArhivi: true,
  },

  'POST /sastanak': [
    {
      putanja: () => '/sastanak',
      telo: (m) => noviSastanak(m.zgrada.id, VrstaSastanka.ZBOR),
    },
    {
      putanja: () => '/sastanak',
      telo: (m) => noviSastanak(m.zgrada.id, VrstaSastanka.SKUPSTINA),
    },
  ],
  'GET /sastanak/:id': [
    { putanja: (m) => `/sastanak/${m.sadrzaj.zbor}` },
    { putanja: (m) => `/sastanak/${m.sadrzaj.skupstina}` },
  ],
  'PATCH /sastanak/:id': {
    putanja: (m) => `/sastanak/${m.sadrzaj.zbor}`,
    telo: () => ({ naslov: 'Izmenjeno iz druge zgrade' }),
  },
  'PATCH /sastanak/:id/otkazi': {
    putanja: (m) => `/sastanak/${m.sadrzaj.zbor}/otkazi`,
    telo: () => ({ razlog: 'Razlog iz druge zgrade.' }),
  },
  'PUT /sastanak/:sastanakId/najava': [
    {
      putanja: (m) => `/sastanak/${m.sadrzaj.zbor}/najava`,
      telo: () => ({ dolazi: true }),
    },
    {
      putanja: (m) => `/sastanak/${m.sadrzaj.skupstina}/najava`,
      telo: () => ({ dolazi: true }),
    },
  ],
  'DELETE /sastanak/:sastanakId/najava': {
    putanja: (m) => `/sastanak/${m.sadrzaj.zbor}/najava`,
  },
  'GET /sastanak/:sastanakId/prisustvo': {
    putanja: (m) => `/sastanak/${m.sadrzaj.skupstina}/prisustvo`,
  },
  'PUT /sastanak/:sastanakId/prisustvo': {
    putanja: (m) => `/sastanak/${m.sadrzaj.skupstina}/prisustvo`,
    telo: (m) => ({ stanovi: [stan(m)] }),
  },
  'PUT /sastanak/:sastanakId/zapisnik': {
    putanja: (m) => `/sastanak/${m.sadrzaj.skupstina}/zapisnik`,
    fajl: { polje: 'fajl', vrsta: 'pdf', polja: { naziv: 'Zapisnik' } },
  },
  'DELETE /sastanak/:sastanakId/zapisnik': {
    putanja: (m) => `/sastanak/${m.sadrzaj.skupstina}/zapisnik`,
  },

  'GET /zgrada/:zgradaId/dokument': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/dokument`,
  },
  'POST /zgrada/:zgradaId/dokument': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/dokument`,
    fajl: {
      polje: 'fajl',
      vrsta: 'pdf',
      polja: {
        naziv: 'Podmetnut',
        kategorija: 'ostalo',
        samoVlasnici: 'false',
      },
    },
  },
  'PATCH /zgrada/:zgradaId/dokument/:id': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/dokument/${m.sadrzaj.dokument}`,
    telo: () => ({ naziv: 'Izmenjeno iz druge zgrade' }),
  },
  'DELETE /zgrada/:zgradaId/dokument/:id': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/dokument/${m.sadrzaj.dokument}`,
  },
  'GET /zgrada/:zgradaId/kontakt': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/kontakt`,
  },
  'POST /zgrada/:zgradaId/kontakt': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/kontakt`,
    telo: noviKontakt,
  },
  'PATCH /zgrada/:zgradaId/kontakt/:id': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/kontakt/${m.sadrzaj.kontakt}`,
    telo: () => ({ naziv: 'Izmenjeno iz druge zgrade' }),
  },
  'DELETE /zgrada/:zgradaId/kontakt/:id': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/kontakt/${m.sadrzaj.kontakt}`,
  },
  'GET /zgrada/:zgradaId/stanar': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/stanar`,
  },
  'PATCH /zgrada/:zgradaId/stanar/:id': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/stanar/${m.zgrada.vezaUkucanina}`,
    telo: () => ({ vlasnik: true }),
  },
  'DELETE /zgrada/:zgradaId/stanar/:id': {
    putanja: (m) => `/zgrada/${m.zgrada.id}/stanar/${m.zgrada.vezaUkucanina}`,
  },

  'PUT /notifikacija/:id/procitano': {
    putanja: (m) => `/notifikacija/${m.sadrzaj.notifikacija}/procitano`,
  },
};

interface Lista {
  upit?: string;
  poZgradi?: boolean;
  tudje: (s: Sadrzaj) => number[];
  svoje: (s: Sadrzaj) => number[];
}

const LISTE: Record<string, Lista> = {
  'GET /kvar': {
    poZgradi: true,
    tudje: (s) => [s.kvarStan, s.kvarZajednicki, s.kvarServisera],
    svoje: (s) => [s.kvarZajednicki],
  },
  'GET /oglas': {
    poZgradi: true,
    tudje: (s) => [s.oglas, s.obavestenje],
    svoje: (s) => [s.oglas],
  },
  'GET /glasanje': {
    poZgradi: true,
    tudje: (s) => [s.anketa, s.odluka],
    svoje: (s) => [s.anketa],
  },
  'GET /sastanak': {
    poZgradi: true,
    tudje: (s) => [s.zbor, s.skupstina],
    svoje: (s) => [s.zbor],
  },
};

const SAMO_UPRAVNIK_SVOJE_ZGRADE = [
  'GET /zahtev-povezivanje',
  'GET /zgrada/pregled',
];

const BROJACI = [
  'GET /oglas/broj-neprocitanih',
  'GET /notifikacija/broj-neprocitanih',
  'GET /notifikacija',
];

const SAMO_ADMIN = [
  'POST /zgrada',
  'GET /zgrada/upravljanje',
  'PATCH /zgrada/:id',
  'DELETE /zgrada/:id',
  'GET /zgrada/:id/upravnik',
  'PUT /zgrada/:id/upravnik',
  'DELETE /zgrada/:id/upravnik',
  'PUT /zgrada/:id/arhiva',
  'DELETE /zgrada/:id/arhiva',
  'GET /korisnik',
  'PUT /korisnik/:korisnikId/specijalnosti',
  'PATCH /korisnik/:id/uloga',
  'PUT /korisnik/:id/deaktivacija',
  'DELETE /korisnik/:id/deaktivacija',
];

const SAMO_SERVISER_I_ADMIN = ['GET /kvar/zgrade'];

const NISU_PODACI_ZGRADE: Record<string, string> = {
  'GET /': 'pozdrav servera',
  'POST /auth/register': 'nalog',
  'POST /auth/potvrda-emaila': 'nalog',
  'POST /auth/ponovo-potvrda': 'nalog',
  'POST /auth/login': 'nalog',
  'POST /auth/refresh': 'nalog',
  'POST /auth/logout': 'nalog',
  'PATCH /auth/lozinka': 'nalog',
  'POST /auth/zaboravljena-lozinka': 'nalog',
  'POST /auth/nova-lozinka': 'nalog',
  'GET /korisnik/moj-profil': 'sopstveni profil',
  'PATCH /korisnik/moj-profil': 'sopstveni profil',
  'PUT /notifikacija/procitano': 'sopstvena obaveštenja',
  'GET /notifikacija/push-kljuc': 'javni ključ servera',
  'PUT /notifikacija/push-pretplata': 'sopstveni uređaj',
  'DELETE /notifikacija/push-pretplata': 'sopstveni uređaj',
  'PUT /oglas/procitano': 'sopstveni datum čitanja',
  'GET /zgrada': 'spisak zgrada za izbor stana pri povezivanju',
  'GET /zgrada/:id': 'naziv i adresa za izbor stana pri povezivanju',
  'GET /stan': 'spisak stanova za izbor pri povezivanju',
  'GET /stan/zgrada/:zgradaId': 'spisak stanova za izbor pri povezivanju',
  'POST /zahtev-povezivanje': 'zahtev se šalje za bilo koju zgradu',
  'GET /zahtev-povezivanje/moji-zahtevi': 'sopstveni zahtevi',
  'GET /kvar/serviseri/:kategorija': 'serviseri nisu vezani za zgradu',
};

const SOPSTVENO_OBAVESTENJE = 'PUT /notifikacija/:id/procitano';

const probe = Object.entries(TUDJI_PODACI).flatMap(([ruta, zadate]) =>
  [zadate].flat().map((proba, i) => ({
    naziv: i === 0 ? ruta : `${ruta} (${i + 1})`,
    ruta,
    proba,
  })),
);

describe('izolacija podataka po zgradi', () => {
  let t: TestAplikacija;
  let svet: Svet;
  let gama: ZgradaSveta;
  let sadrzaj: { a: Sadrzaj; b: Sadrzaj; gama: Sadrzaj };
  let fajlovi: { slika: Buffer; pdf: Buffer };

  const posalji = (akter: Akter, ruta: string, proba: Proba, m: Meta) => {
    const zahtev = zahtevZaRutu(t, ruta, akter, proba.putanja(m));
    if (proba.fajl) {
      for (const [polje, vrednost] of Object.entries(proba.fajl.polja ?? {})) {
        void zahtev.field(polje, vrednost);
      }
      return zahtev.attach(
        proba.fajl.polje,
        fajlovi[proba.fajl.vrsta],
        proba.fajl.vrsta === 'pdf' ? 'fajl.pdf' : 'fajl.png',
      );
    }
    return proba.telo ? zahtev.send(proba.telo(m)) : zahtev;
  };

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    svet = await napraviSvet(t);
    gama = await napraviZgraduSaLjudima(t, 'Gama');
    sadrzaj = {
      a: await napraviSadrzaj(t, svet, svet.a),
      b: await napraviSadrzaj(t, svet, svet.b),
      gama: await napraviSadrzaj(t, svet, gama),
    };
    await kao(t, svet.admin).put(`/zgrada/${gama.id}/arhiva`).expect(204);
    fajlovi = { slika: await slika(), pdf: pdf() };
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('svaka ruta je ili u tabeli izolacije ili ima razlog zašto nije', () => {
    const razvrstane = [
      ...Object.keys(TUDJI_PODACI),
      ...Object.keys(LISTE),
      ...SAMO_UPRAVNIK_SVOJE_ZGRADE,
      ...BROJACI,
      ...SAMO_ADMIN,
      ...SAMO_SERVISER_I_ADMIN,
      ...Object.keys(NISU_PODACI_ZGRADE),
    ];
    expect(new Set(razvrstane).size).toBe(razvrstane.length);
    expect(razvrstane.toSorted()).toEqual(sveRute(t).toSorted());
  });

  describe.each(['ukucanin', 'vlasnik', 'upravnik'] as const)(
    '%s zgrade Alfa nad podacima zgrade Beta',
    (uloga) => {
      it.each(probe)('$naziv', async ({ ruta, proba }) => {
        const pre = await otisakBaze(t);
        const odgovor = await posalji(svet.a[uloga], ruta, proba, {
          zgrada: svet.b,
          sadrzaj: sadrzaj.b,
          svet,
        });
        expect([403, 404]).toContain(odgovor.status);
        expect(await otisakBaze(t)).toEqual(pre);
      });

      it.each(Object.entries(LISTE))(
        '%s ne vraća ništa iz zgrade Beta',
        async (ruta, lista) => {
          const putanja = ruta.split(' ')[1];
          const ids = async (upit: string) => {
            const odgovor = await kao(t, svet.a[uloga])
              .get(`${putanja}${upit}`)
              .expect(200);
            return (odgovor.body.stavke as { id: number }[]).map((s) => s.id);
          };
          const tudje = lista.tudje(sadrzaj.b);

          const bezFiltera = await ids('');
          expect(bezFiltera).toEqual(
            expect.arrayContaining(lista.svoje(sadrzaj.a)),
          );
          expect(bezFiltera.filter((id) => tudje.includes(id))).toEqual([]);

          const saFilterom = await ids(`?zgradaId=${svet.b.id}`);
          expect(saFilterom.filter((id) => tudje.includes(id))).toEqual([]);
        },
      );

      it.each([...SAMO_ADMIN, ...SAMO_SERVISER_I_ADMIN])(
        '%s je zabranjeno',
        async (ruta) => {
          const [metoda, putanja] = ruta.split(' ');
          const pre = await otisakBaze(t);
          const odgovor = await posalji(
            svet.a[uloga],
            metoda,
            { putanja: () => putanja.replace(/:\w+/g, String(svet.b.id)) },
            { zgrada: svet.b, sadrzaj: sadrzaj.b, svet },
          );
          expect(odgovor.status).toBe(403);
          expect(await otisakBaze(t)).toEqual(pre);
        },
      );

      it('obaveštenja su samo njegova', async () => {
        const odgovor = await kao(t, svet.a[uloga])
          .get('/notifikacija?poStrani=50')
          .expect(200);
        const ids = (odgovor.body.stavke as { id: number }[]).map((s) => s.id);
        const tudja = await t.baza.getRepository(Notifikacija).countBy({
          id: In(ids),
          korisnik: { id: Not(svet.a[uloga].id) },
        });
        expect(tudja).toBe(0);
      });
    },
  );

  it('upravnik u spisku zahteva i pregledu vidi samo svoju zgradu', async () => {
    const zahtevi = await kao(t, svet.a.upravnik)
      .get('/zahtev-povezivanje')
      .expect(200);
    expect(zahtevi.body.stavke.map((z: { id: number }) => z.id)).toEqual([
      sadrzaj.a.zahtev,
    ]);

    const pregled = await kao(t, svet.a.upravnik)
      .get('/zgrada/pregled')
      .expect(200);
    expect(pregled.body).toHaveLength(1);
    expect(pregled.body[0]).toMatchObject({
      zgrada: { id: svet.a.id },
      zahteviNaCekanju: 1,
      noviKvarovi: 2,
    });
  });

  it.each(SAMO_UPRAVNIK_SVOJE_ZGRADE)(
    '%s stanaru nije dostupno',
    async (ruta) => {
      await kao(t, svet.a.vlasnik).get(ruta.split(' ')[1]).expect(403);
    },
  );

  describe('arhivirana zgrada Gama', () => {
    const akteri = {
      'bivši upravnik': () => gama.upravnik,
      'bivši vlasnik': () => gama.vlasnik,
      admin: () => svet.admin,
    };

    describe.each(Object.entries(akteri))('%s', (_, akter) => {
      it.each(probe.filter(({ ruta }) => ruta !== SOPSTVENO_OBAVESTENJE))(
        '$naziv',
        async ({ ruta, proba }) => {
          const pre = await otisakBaze(t);
          const odgovor = await posalji(akter(), ruta, proba, {
            zgrada: gama,
            sadrzaj: sadrzaj.gama,
            svet,
          });
          expect(
            proba.vecObradjenoUArhivi ? [403, 404, 409] : [403, 404],
          ).toContain(odgovor.status);
          expect(await otisakBaze(t)).toEqual(pre);
        },
      );

      it.each(Object.entries(LISTE))(
        '%s ne vraća ništa iz arhivirane zgrade',
        async (ruta, lista) => {
          const putanja = ruta.split(' ')[1];
          const tudje = lista.tudje(sadrzaj.gama);
          for (const upit of ['', `?zgradaId=${gama.id}`]) {
            for (const stanje of ['', 'zavrseni', 'zavrsena', 'odrzani']) {
              const spoj = upit ? '&' : '?';
              const odgovor = await kao(t, akter()).get(
                `${putanja}${upit}${stanje && `${spoj}stanje=${stanje}`}`,
              );
              if (odgovor.status === 400) {
                continue;
              }
              expect(odgovor.status).toBe(200);
              const ids = (odgovor.body.stavke as { id: number }[]).map(
                (s) => s.id,
              );
              expect(ids.filter((id) => tudje.includes(id))).toEqual([]);
            }
          }
        },
      );
    });

    it('admin je ne vidi u spisku zgrada, stanova ni u pregledu', async () => {
      const zgrade = await kao(t, svet.admin).get('/zgrada').expect(200);
      expect(zgrade.body.map((z: { id: number }) => z.id)).not.toContain(
        gama.id,
      );
      const stanovi = await kao(t, svet.admin).get('/stan').expect(200);
      expect(
        stanovi.body.filter((s: { id: number }) => gama.stanovi.includes(s.id)),
      ).toEqual([]);
      await kao(t, svet.admin).get(`/zgrada/${gama.id}`).expect(404);
      await kao(t, svet.admin).get(`/stan/zgrada/${gama.id}`).expect(200, []);
      const pregled = await kao(t, svet.admin)
        .get('/zgrada/pregled')
        .expect(200);
      expect(
        pregled.body.map((p: { zgrada: { id: number } }) => p.zgrada.id),
      ).not.toContain(gama.id);
    });

    it('za stan u njoj ne može da se pošalje zahtev za povezivanje', async () => {
      await kao(t, svet.bezStana)
        .post('/zahtev-povezivanje')
        .send({ stanId: gama.stanovi[1] })
        .expect(404);
    });
  });

  describe('podmetanje tuđeg podresursa pod svoju zgradu', () => {
    const a = () => svet.a;
    const pokusaji: [
      string,
      () => ReturnType<ReturnType<typeof kao>['get']>,
    ][] = [
      [
        'izmena dokumenta zgrade Beta preko putanje zgrade Alfa',
        () =>
          kao(t, a().upravnik)
            .patch(`/zgrada/${a().id}/dokument/${sadrzaj.b.dokument}`)
            .send({ naziv: 'Podmetnuto' }),
      ],
      [
        'brisanje dokumenta zgrade Beta preko putanje zgrade Alfa',
        () =>
          kao(t, a().upravnik).delete(
            `/zgrada/${a().id}/dokument/${sadrzaj.b.dokument}`,
          ),
      ],
      [
        'izmena kontakta zgrade Beta preko putanje zgrade Alfa',
        () =>
          kao(t, a().upravnik)
            .patch(`/zgrada/${a().id}/kontakt/${sadrzaj.b.kontakt}`)
            .send({ naziv: 'Podmetnuto' }),
      ],
      [
        'brisanje kontakta zgrade Beta preko putanje zgrade Alfa',
        () =>
          kao(t, a().upravnik).delete(
            `/zgrada/${a().id}/kontakt/${sadrzaj.b.kontakt}`,
          ),
      ],
      [
        'proglašenje stanara zgrade Beta vlasnikom preko putanje zgrade Alfa',
        () =>
          kao(t, a().upravnik)
            .patch(`/zgrada/${a().id}/stanar/${svet.b.vezaUkucanina}`)
            .send({ vlasnik: true }),
      ],
      [
        'iseljenje stanara zgrade Beta preko putanje zgrade Alfa',
        () =>
          kao(t, a().upravnik).delete(
            `/zgrada/${a().id}/stanar/${svet.b.vezaUkucanina}`,
          ),
      ],
      [
        'brisanje komentara zgrade Beta preko svog kvara',
        () =>
          kao(t, a().upravnik).delete(
            `/kvar/${sadrzaj.a.kvarZajednicki}/komentar/${sadrzaj.b.komentar}`,
          ),
      ],
      [
        'brisanje slike zgrade Beta preko svog kvara',
        () =>
          kao(t, a().upravnik).delete(
            `/kvar/${sadrzaj.a.kvarZajednicki}/slika/${sadrzaj.b.slika}`,
          ),
      ],
      [
        'brisanje priloga zgrade Beta preko svog oglasa',
        () =>
          kao(t, a().vlasnik).delete(
            `/oglas/${sadrzaj.a.oglas}/prilog/${sadrzaj.b.prilog}`,
          ),
      ],
      [
        'prijava kvara u svojoj zgradi za stan zgrade Beta',
        () =>
          kao(t, a().upravnik)
            .post('/kvar')
            .send(noviKvar(svet.b.stanovi[0], LokacijaTip.PRIVATNI_STAN)),
      ],
      [
        'objava odluke zgrade Beta kao oglasa u svojoj zgradi',
        () =>
          kao(t, a().upravnik)
            .post('/oglas')
            .send({ ...noviOglas(a().id), glasanjeId: sadrzaj.b.odluka }),
      ],
      [
        'skupština u svojoj zgradi sa odlukom zgrade Beta na dnevnom redu',
        () =>
          kao(t, a().upravnik)
            .post('/sastanak')
            .send({
              ...noviSastanak(a().id, VrstaSastanka.SKUPSTINA),
              tacke: [{ naslov: 'Tuđa odluka', odlukaId: sadrzaj.b.odluka }],
            }),
      ],
      [
        'dodavanje odluke zgrade Beta u dnevni red svoje skupštine',
        () =>
          kao(t, a().upravnik)
            .patch(`/sastanak/${sadrzaj.a.skupstina}`)
            .send({
              tacke: [{ naslov: 'Tuđa odluka', odlukaId: sadrzaj.b.odluka }],
            }),
      ],
      [
        'glas opcijom iz glasanja zgrade Beta',
        () =>
          kao(t, a().vlasnik)
            .put(`/glasanje/${sadrzaj.a.anketa}/glas`)
            .send({ opcijaId: sadrzaj.b.opcijaAnkete }),
      ],
      [
        'dodela kvara korisniku koji nije serviser',
        () =>
          kao(t, a().upravnik)
            .patch(`/kvar/${sadrzaj.a.kvarStan}/dodeli`)
            .send({ serviserId: svet.b.vlasnik.id }),
      ],
    ];

    it.each(pokusaji)('%s', async (_, pokusaj) => {
      const pre = await otisakBaze(t);
      const odgovor = await pokusaj();
      expect(odgovor.status).toBeGreaterThanOrEqual(400);
      expect(odgovor.status).toBeLessThan(500);
      expect(await otisakBaze(t)).toEqual(pre);
    });

    it('evidencija prisustva ne prima stan iz zgrade Beta', async () => {
      await t.baza.query(
        `UPDATE sastanak SET pocetak = now() - interval '1 hour' WHERE id = $1`,
        [sadrzaj.a.skupstina],
      );
      const pre = await otisakBaze(t);
      await kao(t, a().upravnik)
        .put(`/sastanak/${sadrzaj.a.skupstina}/prisustvo`)
        .send({ stanovi: [svet.a.stanovi[0], svet.b.stanovi[0]] })
        .expect(400);
      expect(await otisakBaze(t)).toEqual(pre);
    });
  });

  describe('brojači ne zavise od druge zgrade', () => {
    it('nova dešavanja u zgradi Beta ne menjaju brojače u zgradi Alfa', async () => {
      const stanje = async () =>
        Object.fromEntries(
          await Promise.all(
            (['ukucanin', 'vlasnik', 'upravnik'] as const).flatMap((uloga) =>
              [...BROJACI, 'GET /zgrada/pregled'].map(async (ruta) => {
                const odgovor = await kao(t, svet.a[uloga]).get(
                  ruta.split(' ')[1],
                );
                return [`${uloga} ${ruta}`, odgovor.body] as const;
              }),
            ),
          ),
        );
      const pre = await stanje();

      const b = svet.b;
      await kao(t, b.upravnik)
        .post('/oglas')
        .send({ ...noviOglas(b.id, 'obavestenje' as never), vazno: true })
        .expect(201);
      await kao(t, b.sused)
        .post('/kvar')
        .send({
          ...noviKvar(b.stanovi[1], LokacijaTip.ZAJEDNICKI_PROSTOR),
          prioritet: 'hitno',
        })
        .expect(201);
      await kao(t, b.upravnik)
        .post('/glasanje')
        .send(novaAnketa(b.id))
        .expect(201);
      await kao(t, b.upravnik)
        .post('/sastanak')
        .send(noviSastanak(b.id, VrstaSastanka.ZBOR))
        .expect(201);
      await kao(t, b.upravnik)
        .patch(`/kvar/${sadrzaj.b.kvarZajednicki}/prihvati`)
        .expect(200);

      expect(await stanje()).toEqual(pre);
    });
  });
});
