import { NotFoundException } from '@nestjs/common';
import { Glas } from '../src/glasanje/glas.entity.js';
import { GlasanjeRezultatiService } from '../src/glasanje/glasanje-rezultati.service.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  napraviKorisnika,
  napraviZgradu,
  napraviZgraduSaLjudima,
  novaAnketa,
  novaOdluka,
  noviOglas,
  useli,
  zaDana,
  type ZgradaSveta,
} from './pomoc/podaci.js';

interface Opcija {
  id: number;
  tekst: string;
  brojGlasova: number | null;
}

interface PrikazGlasanja {
  id: number;
  opcije: Opcija[];
  [polje: string]: unknown;
}

describe('glasanje', () => {
  let t: TestAplikacija;
  let z: ZgradaSveta;
  let suvlasnik: Akter;
  let dvaStana: Akter;

  const napravi = async (telo: object, akter = z.upravnik) =>
    (await kao(t, akter).post('/glasanje').send(telo).expect(201))
      .body as PrikazGlasanja;

  const glasaj = (akter: Akter, glasanje: PrikazGlasanja, tekst: string) =>
    kao(t, akter)
      .put(`/glasanje/${glasanje.id}/glas`)
      .send({ opcijaId: glasanje.opcije.find((o) => o.tekst === tekst)?.id });

  const prikaz = async (akter: Akter, glasanje: PrikazGlasanja) =>
    (await kao(t, akter).get(`/glasanje/${glasanje.id}`).expect(200))
      .body as PrikazGlasanja;

  const brojevi = (glasanje: PrikazGlasanja) =>
    Object.fromEntries(glasanje.opcije.map((o) => [o.tekst, o.brojGlasova]));

  const istekni = (glasanje: PrikazGlasanja) =>
    t.baza.query(
      `UPDATE glasanje SET rok = now() - interval '1 second' WHERE id = $1`,
      [glasanje.id],
    );

  const obavestenjaOGlasanju = async (akter: Akter) => {
    const odgovor = await kao(t, akter)
      .get('/notifikacija?poStrani=50')
      .expect(200);
    return (odgovor.body.stavke as { tip: string; tekst: string }[])
      .filter((n) => n.tip === 'glasanje_novo')
      .map((n) => n.tekst);
  };

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    z = await napraviZgraduSaLjudima(t, 'Glasanje', 4);
    suvlasnik = await napraviKorisnika(t, 'Suvlasnik');
    dvaStana = await napraviKorisnika(t, 'DvaStana');
    await useli(t, suvlasnik, z.stanovi[0], true);
    await useli(t, dvaStana, z.stanovi[2], true);
    await useli(t, dvaStana, z.stanovi[3], true);
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('anketa', () => {
    it('rezultate vidi tek ko je glasao; jedan glas po korisniku, može da se promeni i povuče', async () => {
      const anketa = await napravi(novaAnketa(z.id));
      expect(await prikaz(z.vlasnik, anketa)).toMatchObject({
        mojGlas: null,
        smeDaGlasa: true,
        brojGlasaca: 0,
        ukupnoGlasaca: 5,
        zavrseno: false,
        ishod: null,
      });
      expect(brojevi(await prikaz(z.vlasnik, anketa))).toEqual({
        Siva: null,
        Zelena: null,
      });

      const prvi = await glasaj(z.vlasnik, anketa, 'Siva').expect(200);
      expect(brojevi(prvi.body)).toEqual({ Siva: 1, Zelena: 0 });
      await glasaj(z.ukucanin, anketa, 'Zelena').expect(200);
      expect(brojevi(await prikaz(z.sused, anketa))).toEqual({
        Siva: null,
        Zelena: null,
      });

      const promenjen = await glasaj(z.vlasnik, anketa, 'Zelena').expect(200);
      expect(brojevi(promenjen.body)).toEqual({ Siva: 0, Zelena: 2 });
      expect(promenjen.body.brojGlasaca).toBe(2);

      const povucen = await kao(t, z.vlasnik)
        .delete(`/glasanje/${anketa.id}/glas`)
        .expect(200);
      expect(povucen.body).toMatchObject({ mojGlas: null, brojGlasaca: 1 });
      expect(brojevi(povucen.body)).toEqual({ Siva: null, Zelena: null });
      expect(brojevi(await prikaz(z.upravnik, anketa))).toEqual({
        Siva: 0,
        Zelena: 1,
      });
    });

    it('istovremeni glasovi istog korisnika ostavljaju jedan glas', async () => {
      const anketa = await napravi(novaAnketa(z.id));
      const odgovori = await Promise.all([
        glasaj(z.vlasnik, anketa, 'Siva'),
        glasaj(z.vlasnik, anketa, 'Zelena'),
        glasaj(z.vlasnik, anketa, 'Siva'),
      ]);
      expect(odgovori.map((o) => o.status)).toEqual([200, 200, 200]);
      expect(
        await t.baza
          .getRepository(Glas)
          .countBy({ glasanje: { id: anketa.id } }),
      ).toBe(1);
    });

    it.each([
      ['rok', { rok: zaDana(-1) }],
      ['rok', { rok: zaDana(40) }],
      ['opcije', { opcije: ['Samo jedna'] }],
      ['opcije', { opcije: ['Siva', 'siva'] }],
      ['opcije', { opcije: ['Siva', '  '] }],
      ['opcije', { opcije: undefined }],
      ['pitanje', { pitanje: '   ' }],
      ['vecina', { vecina: 'obicna' }],
      ['zgradaId', { zgradaId: 'prva' }],
    ])('neispravno polje %s se odbija', async (polje, izmena) => {
      const odgovor = await kao(t, z.upravnik)
        .post('/glasanje')
        .send({ ...novaAnketa(z.id), ...izmena })
        .expect(400);
      expect(Object.keys(odgovor.body.greske)).toContain(polje);
    });

    it('ne prima opciju iz drugog glasanja', async () => {
      const prva = await napravi(novaAnketa(z.id));
      const druga = await napravi(novaAnketa(z.id));
      const odgovor = await kao(t, z.vlasnik)
        .put(`/glasanje/${prva.id}/glas`)
        .send({ opcijaId: druga.opcije[0].id })
        .expect(400);
      expect(Object.keys(odgovor.body.greske)).toEqual(['opcijaId']);
    });

    it('upravnik je zatvara ranije, posle čega se ne glasa', async () => {
      const anketa = await napravi(novaAnketa(z.id));
      await glasaj(z.vlasnik, anketa, 'Siva').expect(200);
      await kao(t, z.vlasnik)
        .patch(`/glasanje/${anketa.id}/zatvori`)
        .expect(403);

      const zatvorena = await kao(t, z.upravnik)
        .patch(`/glasanje/${anketa.id}/zatvori`)
        .expect(200);
      expect(zatvorena.body).toMatchObject({
        zavrseno: true,
        zatvorenoRanije: true,
        smeDaZatvori: false,
      });
      await glasaj(z.sused, anketa, 'Siva').expect(409);
      await kao(t, z.vlasnik).delete(`/glasanje/${anketa.id}/glas`).expect(409);
      await kao(t, z.upravnik)
        .patch(`/glasanje/${anketa.id}/zatvori`)
        .expect(409);
      expect(brojevi(await prikaz(z.sused, anketa))).toEqual({
        Siva: 1,
        Zelena: 0,
      });

      const ids = async (stanje: string) =>
        (
          await kao(t, z.sused)
            .get(`/glasanje?stanje=${stanje}&poStrani=50`)
            .expect(200)
        ).body.stavke.map((g: { id: number }) => g.id);
      expect(await ids('zavrsena')).toContain(anketa.id);
      expect(await ids('aktivna')).not.toContain(anketa.id);
    });

    it('glas i zatvaranje u istom trenutku: glas se broji samo ako je stigao pre zatvaranja', async () => {
      const anketa = await napravi(novaAnketa(z.id));
      const [glas, zatvaranje] = await Promise.all([
        glasaj(z.vlasnik, anketa, 'Siva'),
        kao(t, z.upravnik).patch(`/glasanje/${anketa.id}/zatvori`),
      ]);
      expect(zatvaranje.status).toBe(200);
      expect([200, 409]).toContain(glas.status);
      const posle = await prikaz(z.upravnik, anketa);
      expect(posle.zavrseno).toBe(true);
      expect(posle.brojGlasaca).toBe(glas.status === 200 ? 1 : 0);
    });

    it('posle roka se ne glasa', async () => {
      const anketa = await napravi(novaAnketa(z.id));
      await istekni(anketa);
      await glasaj(z.vlasnik, anketa, 'Siva').expect(409);
      expect(await prikaz(z.vlasnik, anketa)).toMatchObject({
        zavrseno: true,
        zatvorenoRanije: false,
        smeDaGlasa: false,
      });
    });

    it('brisanjem ankete nestaju i glasovi', async () => {
      const anketa = await napravi(novaAnketa(z.id));
      await glasaj(z.vlasnik, anketa, 'Siva').expect(200);
      await kao(t, z.vlasnik).delete(`/glasanje/${anketa.id}`).expect(403);
      await kao(t, z.upravnik).delete(`/glasanje/${anketa.id}`).expect(204);
      await kao(t, z.upravnik).get(`/glasanje/${anketa.id}`).expect(404);
      expect(
        await t.baza
          .getRepository(Glas)
          .countBy({ glasanje: { id: anketa.id } }),
      ).toBe(0);
    });

    it('ko ne vidi glasanje dobija 404, kao da ne postoji', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      await kao(t, z.ukucanin).get(`/glasanje/${odluka.id}`).expect(404);
      await kao(t, z.ukucanin)
        .put(`/glasanje/${odluka.id}/glas`)
        .send({ opcijaId: odluka.opcije[0].id })
        .expect(404);
      await kao(t, z.vlasnik).get('/glasanje?zgradaId=0').expect(400);
    });

    it('glasanje obrisano dok se računa odgovor daje 404', async () => {
      await expect(
        t.app.get(GlasanjeRezultatiService).jedno(2_000_000_000, z.vlasnik.id, {
          stanuje: [],
          poseduje: [],
          vlasnickiStanovi: [],
          zgrade: [],
          upravlja: [],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('o anketi se obaveštavaju svi stanari, o odluci samo vlasnici', async () => {
      const pre = {
        vlasnik: (await obavestenjaOGlasanju(z.vlasnik)).length,
        ukucanin: (await obavestenjaOGlasanju(z.ukucanin)).length,
      };
      await napravi({ ...novaAnketa(z.id), pitanje: 'Anketa za sve?' });
      await napravi({ ...novaOdluka(z.id), pitanje: 'Odluka za vlasnike?' });

      const vlasnik = await obavestenjaOGlasanju(z.vlasnik);
      const ukucanin = await obavestenjaOGlasanju(z.ukucanin);
      expect(vlasnik).toHaveLength(pre.vlasnik + 2);
      expect(ukucanin).toHaveLength(pre.ukucanin + 1);
      expect(ukucanin[0]).toBe('Nova anketa za glasanje: „Anketa za sve?“.');
      expect(await obavestenjaOGlasanju(z.upravnik)).toEqual([]);
    });
  });

  describe('odluka', () => {
    it('ima opcije Za, Protiv i Uzdržan i broji stanove zgrade', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      expect(odluka.opcije.map((o) => o.tekst)).toEqual([
        'Za',
        'Protiv',
        'Uzdržan',
      ]);
      expect(odluka).toMatchObject({
        vrsta: 'odluka',
        vecina: 'obicna',
        ukupnoGlasaca: 4,
        pragovi: { kvorum: 3, potrebnoZa: 1 },
      });
      await kao(t, z.upravnik)
        .post('/glasanje')
        .send({ ...novaOdluka(z.id), opcije: ['Da', 'Ne'] })
        .expect(400);
      await kao(t, z.upravnik)
        .post('/glasanje')
        .send({ ...novaOdluka(z.id), vecina: undefined })
        .expect(400);
    });

    it('za stan glasa jedan suvlasnik; vlasnik dva stana daje dva glasa', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      const prvi = await glasaj(z.vlasnik, odluka, 'Za').expect(200);
      expect(prvi.body).toMatchObject({ brojGlasaca: 1, brojZa: 1 });

      const drugi = await glasaj(suvlasnik, odluka, 'Protiv').expect(409);
      expect(drugi.body.message).toBe('Za tvoj stan je već glasao suvlasnik.');
      expect(await prikaz(suvlasnik, odluka)).toMatchObject({
        smeDaGlasa: false,
        mojGlas: null,
        glasaliSuvlasnici: ['1'],
        brojZa: 1,
      });
      await kao(t, suvlasnik).delete(`/glasanje/${odluka.id}/glas`).expect(200);
      expect((await prikaz(z.vlasnik, odluka)).brojGlasaca).toBe(1);

      const dva = await glasaj(dvaStana, odluka, 'Protiv').expect(200);
      expect(dva.body).toMatchObject({ brojGlasaca: 3, brojZa: 1 });
      expect(brojevi(dva.body)).toEqual({ Za: 1, Protiv: 2, Uzdržan: 0 });

      const promena = await glasaj(z.vlasnik, odluka, 'Uzdržan').expect(200);
      expect(brojevi(promena.body)).toEqual({ Za: 0, Protiv: 2, Uzdržan: 1 });
    });

    it('kad vlasnik povuče glas, suvlasnik može da glasa za isti stan', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      await glasaj(z.vlasnik, odluka, 'Za').expect(200);
      await kao(t, z.vlasnik).delete(`/glasanje/${odluka.id}/glas`).expect(200);
      await glasaj(suvlasnik, odluka, 'Protiv').expect(200);
      await glasaj(z.vlasnik, odluka, 'Za').expect(409);
    });

    it('istovremeni glasovi suvlasnika daju jedan glas za stan', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      const odgovori = await Promise.all([
        glasaj(z.vlasnik, odluka, 'Za'),
        glasaj(suvlasnik, odluka, 'Protiv'),
      ]);
      expect(odgovori.map((o) => o.status).toSorted((a, b) => a - b)).toEqual([
        200, 409,
      ]);
      expect(
        await t.baza
          .getRepository(Glas)
          .countBy({ glasanje: { id: odluka.id } }),
      ).toBe(1);
    });

    it('traje do roka: upravnik je ne zatvara ranije', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      await kao(t, z.upravnik)
        .patch(`/glasanje/${odluka.id}/zatvori`)
        .expect(409);
      expect(await prikaz(z.upravnik, odluka)).toMatchObject({
        zavrseno: false,
        ishod: null,
        smeDaZatvori: false,
      });
    });

    it.each([
      {
        naziv: 'obična većina, tri od četiri stana za',
        vecina: 'obicna',
        glasovi: { vlasnik: 'Za', dvaStana: 'Za', sused: 'Protiv' },
        ishod: 'usvojena',
        brojGlasaca: 4,
      },
      {
        naziv: 'obična većina, izjednačeno',
        vecina: 'obicna',
        glasovi: { vlasnik: 'Za', sused: 'Za', dvaStana: 'Protiv' },
        ishod: 'odbijena',
        brojGlasaca: 4,
      },
      {
        naziv: 'obična većina, uzdržani ulaze u kvorum ali ne u glasove za',
        vecina: 'obicna',
        glasovi: { vlasnik: 'Za', sused: 'Uzdržan', dvaStana: 'Uzdržan' },
        ishod: 'odbijena',
        brojGlasaca: 4,
      },
      {
        naziv: 'glasala dva od četiri stana',
        vecina: 'obicna',
        glasovi: { vlasnik: 'Za', sused: 'Za' },
        ishod: 'nema_kvoruma',
        brojGlasaca: 2,
      },
      {
        naziv: 'dvotrećinska većina, dva od četiri stana za',
        vecina: 'dve_trecine',
        glasovi: { vlasnik: 'Za', sused: 'Za', dvaStana: 'Protiv' },
        ishod: 'odbijena',
        brojGlasaca: 4,
      },
      {
        naziv: 'dvotrećinska većina, tri od četiri stana za',
        vecina: 'dve_trecine',
        glasovi: { vlasnik: 'Za', dvaStana: 'Za' },
        ishod: 'usvojena',
        brojGlasaca: 3,
      },
      {
        naziv: 'niko nije glasao',
        vecina: 'obicna',
        glasovi: {},
        ishod: 'nema_kvoruma',
        brojGlasaca: 0,
      },
    ])('ishod — $naziv: $ishod', async (slucaj) => {
      const glasaci: Record<string, Akter> = {
        vlasnik: z.vlasnik,
        sused: z.sused,
        dvaStana,
      };
      const odluka = await napravi(novaOdluka(z.id, slucaj.vecina));
      for (const [ko, glas] of Object.entries(slucaj.glasovi)) {
        await glasaj(glasaci[ko], odluka, glas).expect(200);
      }
      expect((await prikaz(z.upravnik, odluka)).ishod).toBeNull();

      await istekni(odluka);
      expect(await prikaz(z.sused, odluka)).toMatchObject({
        zavrseno: true,
        ishod: slucaj.ishod,
        brojGlasaca: slucaj.brojGlasaca,
        ukupnoGlasaca: 4,
      });
      await glasaj(z.vlasnik, odluka, 'Protiv').expect(409);
    });

    it('broj stanova prati stanove dodate i obrisane dok odluka traje, a posle roka se ne menja', async () => {
      const zgrada = await napraviZgradu(t, 'Rastuca', 2);
      const admin = await napraviKorisnika(t, 'Admin', {
        uloga: 'admin' as never,
      });
      const zavrsena = await napravi(novaOdluka(zgrada.id), admin);
      await istekni(zavrsena);
      const odluka = await napravi(novaOdluka(zgrada.id), admin);
      expect(odluka.ukupnoGlasaca).toBe(2);

      await kao(t, admin)
        .post('/stan/grupno')
        .send({
          zgradaId: zgrada.id,
          stanovi: [
            { broj: '3', sprat: 1, kvadratura: 60 },
            { broj: '4', sprat: 1, kvadratura: 60 },
          ],
        })
        .expect(201);
      expect((await prikaz(admin, odluka)).ukupnoGlasaca).toBe(4);

      const stanovi = await kao(t, admin)
        .get(`/stan/zgrada/${zgrada.id}`)
        .expect(200);
      const cetvrti = (stanovi.body as { id: number; broj: string }[]).find(
        (s) => s.broj === '4',
      );
      await kao(t, admin).delete(`/stan/${cetvrti?.id}`).expect(200);
      expect((await prikaz(admin, odluka)).ukupnoGlasaca).toBe(3);
      expect((await prikaz(admin, zavrsena)).ukupnoGlasaca).toBe(2);
    });

    it('briše se samo dok traje i niko nije glasao', async () => {
      const prazna = await napravi(novaOdluka(z.id));
      expect(prazna.smeDaObrise).toBe(true);
      await kao(t, z.upravnik).delete(`/glasanje/${prazna.id}`).expect(204);

      const saGlasom = await napravi(novaOdluka(z.id));
      await glasaj(z.vlasnik, saGlasom, 'Za').expect(200);
      expect((await prikaz(z.upravnik, saGlasom)).smeDaObrise).toBe(false);
      await kao(t, z.upravnik).delete(`/glasanje/${saGlasom.id}`).expect(409);

      const zavrsena = await napravi(novaOdluka(z.id));
      await istekni(zavrsena);
      expect((await prikaz(z.upravnik, zavrsena)).smeDaObrise).toBe(false);
      await kao(t, z.upravnik).delete(`/glasanje/${zavrsena.id}`).expect(409);
      await prikaz(z.upravnik, zavrsena);
    });

    it('objavljuje se kao obaveštenje, jednom i tek posle roka', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      const objavi = (akter = z.upravnik, vrsta = 'obavestenje') =>
        kao(t, akter)
          .post('/oglas')
          .send({
            ...noviOglas(z.id, vrsta as never),
            naslov: 'Ishod odluke',
            glasanjeId: odluka.id,
          });

      await objavi().expect(409);
      await istekni(odluka);
      expect((await prikaz(z.upravnik, odluka)).smeDaObjavi).toBe(true);
      await objavi(z.vlasnik).expect(403);
      await objavi(z.upravnik, 'prodaja').expect(400);

      const oglas = await objavi().expect(201);
      expect(await prikaz(z.upravnik, odluka)).toMatchObject({
        smeDaObjavi: false,
        oglasId: oglas.body.id,
      });
      await objavi().expect(409);

      const anketa = await napravi(novaAnketa(z.id));
      await istekni(anketa);
      await kao(t, z.upravnik)
        .post('/oglas')
        .send({
          ...noviOglas(z.id, 'obavestenje' as never),
          glasanjeId: anketa.id,
        })
        .expect(404);
    });

    it('spisak odluka za dnevni red sadrži samo odluke te zgrade', async () => {
      const odluka = await napravi(novaOdluka(z.id));
      const anketa = await napravi(novaAnketa(z.id));
      const odgovor = await kao(t, z.upravnik)
        .get(`/glasanje/odluke?zgradaId=${z.id}`)
        .expect(200);
      const ids = odgovor.body.map((o: { id: number }) => o.id);
      expect(ids).toContain(odluka.id);
      expect(ids).not.toContain(anketa.id);
      await kao(t, z.upravnik).get('/glasanje/odluke').expect(400);
    });
  });
});
