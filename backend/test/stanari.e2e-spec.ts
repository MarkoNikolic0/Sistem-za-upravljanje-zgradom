import { Glas } from '../src/glasanje/glas.entity.js';
import { Korisnik } from '../src/korisnik/korisnik.entity.js';
import { PratilacKvara } from '../src/pratilac-kvara/pratilac-kvara.entity.js';
import { ServiserSpecijalnost } from '../src/serviser-specijalnost/serviser-specijalnost.entity.js';
import { LokacijaTip } from '../src/shared/enums/kvar.enums.js';
import { Uloga } from '../src/shared/enums/uloga.enum.js';
import { StanarStana } from '../src/stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../src/zgrada/zgrada.entity.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  napraviKorisnika,
  napraviServisera,
  napraviZgradu,
  napraviZgraduSaLjudima,
  novaAnketa,
  novaOdluka,
  noviKvar,
  noviOglas,
  prijavi,
  useli,
  type ZgradaSveta,
} from './pomoc/podaci.js';

const { PRIVATNI_STAN, ZAJEDNICKI_PROSTOR } = LokacijaTip;

describe('stanari, nalozi i zgrade', () => {
  let t: TestAplikacija;
  let admin: Akter;
  let brojZgrade = 0;

  const novaZgrada = (brojStanova = 3) => {
    brojZgrade += 1;
    return napraviZgraduSaLjudima(t, `Naselje${brojZgrade}`, brojStanova);
  };

  const id = async (zahtev: PromiseLike<{ body: { id: number } }>) =>
    (await zahtev).body.id;

  const veze = (korisnik: Akter) =>
    t.baza
      .getRepository(StanarStana)
      .countBy({ korisnik: { id: korisnik.id } });

  const uBazi = async (korisnik: Akter) => {
    const { uloga } = await t.baza
      .getRepository(Korisnik)
      .findOneByOrFail({ id: korisnik.id });
    const zgrade = await t.baza.getRepository(Zgrada).find({
      where: { upravnikId: korisnik.id },
      order: { id: 'ASC' },
    });
    return { uloga, zgrade: zgrade.map((z) => z.id) };
  };

  const oglas = async (akter: Akter, oglasId: number) =>
    (await kao(t, akter).get(`/oglas/${oglasId}`).expect(200)).body;

  const obavestenja = async (akter: Akter) =>
    (
      await kao(t, akter).get('/notifikacija?poStrani=50').expect(200)
    ).body.stavke.map((n: { tekst: string }) => n.tekst) as string[];

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    admin = await napraviKorisnika(t, 'Admin', { uloga: Uloga.ADMIN });
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('zahtev za povezivanje sa stanom', () => {
    let z: ZgradaSveta;
    let novajlija: Akter;

    const posalji = (akter: Akter, stanId: number) =>
      kao(t, akter).post('/zahtev-povezivanje').send({ stanId });
    const obradi = (zahtev: number, telo: object, akter = z.upravnik) =>
      kao(t, akter).patch(`/zahtev-povezivanje/${zahtev}/obradjen`).send(telo);

    beforeAll(async () => {
      z = await novaZgrada();
      novajlija = await napraviKorisnika(t, 'Novajlija');
    });

    it('prihvaćen zahtev useljava korisnika i daje mu pristup zgradi', async () => {
      const zahtev = await id(posalji(novajlija, z.stanovi[2]).expect(201));
      await posalji(novajlija, z.stanovi[2]).expect(409);
      expect(await obavestenja(z.upravnik)).toContain(
        'Nov zahtev za povezivanje sa stanom 3.',
      );
      const kvar = await id(
        kao(t, z.vlasnik)
          .post('/kvar')
          .send(noviKvar(z.stanovi[0], ZAJEDNICKI_PROSTOR))
          .expect(201),
      );
      await kao(t, novajlija).get(`/kvar/${kvar}`).expect(403);

      await obradi(zahtev, { status: 'na_cekanju' }).expect(400);
      await obradi(zahtev, { status: 'prihvacen', vlasnik: true }).expect(200);
      await obradi(zahtev, { status: 'odbijen' }).expect(409);

      await kao(t, novajlija).get(`/kvar/${kvar}`).expect(200);
      const profil = await kao(t, novajlija)
        .get('/korisnik/moj-profil')
        .expect(200);
      expect(profil.body.stanovi).toEqual([
        expect.objectContaining({ id: z.stanovi[2], vlasnik: true }),
      ]);
      expect(await obavestenja(novajlija)).toContain(
        'Zahtev za stan 3 je prihvaćen.',
      );
      await posalji(novajlija, z.stanovi[2]).expect(409);
    });

    it('odbijen zahtev ne useljava, a nov zahtev može ponovo da se pošalje', async () => {
      const drugi = await napraviKorisnika(t, 'Odbijen');
      const zahtev = await id(posalji(drugi, z.stanovi[1]).expect(201));
      await obradi(zahtev, { status: 'odbijen' }).expect(200);
      expect(await veze(drugi)).toBe(0);
      await posalji(drugi, z.stanovi[1]).expect(201);
    });

    it('dva istovremena prihvatanja useljavaju jednom', async () => {
      const treci = await napraviKorisnika(t, 'Trka');
      const zahtev = await id(posalji(treci, z.stanovi[1]).expect(201));
      const odgovori = await Promise.all([
        obradi(zahtev, { status: 'prihvacen' }),
        obradi(zahtev, { status: 'prihvacen' }, admin),
      ]);
      expect(odgovori.map((o) => o.status).toSorted((a, b) => a - b)).toEqual([
        200, 409,
      ]);
      expect(await veze(treci)).toBe(1);
    });

    it('zahtev ne šalju serviser i admin, niti se šalje za nepostojeći stan', async () => {
      const serviser = await napraviServisera(t, 'Serviser');
      await posalji(serviser, z.stanovi[1]).expect(403);
      await posalji(admin, z.stanovi[1]).expect(403);
      await posalji(novajlija, 987654).expect(404);
      await posalji(novajlija, -1).expect(400);
    });
  });

  describe('iseljenje stanara', () => {
    it('briše glasove, praćenja i sakriva oglase, a stanar gubi pristup', async () => {
      const z = await novaZgrada();
      const stanar = z.sused;
      const veza = (
        await t.baza
          .getRepository(StanarStana)
          .findOneByOrFail({ korisnik: { id: stanar.id } })
      ).id;

      const anketa = (
        await kao(t, z.upravnik).post('/glasanje').send(novaAnketa(z.id))
      ).body;
      const odluka = (
        await kao(t, z.upravnik).post('/glasanje').send(novaOdluka(z.id))
      ).body;
      const zavrsena = (
        await kao(t, z.upravnik).post('/glasanje').send(novaAnketa(z.id))
      ).body;
      for (const glasanje of [anketa, odluka, zavrsena]) {
        await kao(t, stanar)
          .put(`/glasanje/${glasanje.id}/glas`)
          .send({ opcijaId: glasanje.opcije[0].id })
          .expect(200);
      }
      await t.baza.query(
        `UPDATE glasanje SET rok = now() - interval '1 second' WHERE id = $1`,
        [zavrsena.id],
      );
      const tudjKvar = await id(
        kao(t, z.vlasnik)
          .post('/kvar')
          .send(noviKvar(z.stanovi[0], ZAJEDNICKI_PROSTOR))
          .expect(201),
      );
      await kao(t, stanar).put(`/kvar/${tudjKvar}/pracenje`).expect(200);
      const mojKvar = await id(
        kao(t, stanar)
          .post('/kvar')
          .send(noviKvar(z.stanovi[1], ZAJEDNICKI_PROSTOR))
          .expect(201),
      );
      const mojOglas = await id(
        kao(t, stanar).post('/oglas').send(noviOglas(z.id)).expect(201),
      );

      await kao(t, z.vlasnik)
        .delete(`/zgrada/${z.id}/stanar/${veza}`)
        .expect(403);
      await kao(t, z.upravnik)
        .delete(`/zgrada/${z.id}/stanar/${veza}`)
        .expect(204);
      await kao(t, z.upravnik)
        .delete(`/zgrada/${z.id}/stanar/${veza}`)
        .expect(404);

      expect(await veze(stanar)).toBe(0);
      const glasovi = await t.baza.getRepository(Glas).find({
        where: { korisnik: { id: stanar.id } },
        relations: { glasanje: true },
      });
      expect(glasovi.map((g) => g.glasanje.id)).toEqual([zavrsena.id]);
      expect(
        await t.baza
          .getRepository(PratilacKvara)
          .countBy({ korisnik: { id: stanar.id } }),
      ).toBe(0);
      expect(await oglas(z.upravnik, mojOglas)).toMatchObject({
        razlogSakrivanja: 'Autor se odselio iz zgrade.',
      });
      await kao(t, z.vlasnik).get(`/oglas/${mojOglas}`).expect(403);

      for (const putanja of [
        `/kvar/${mojKvar}`,
        `/kvar/${tudjKvar}`,
        `/oglas/${mojOglas}`,
        `/glasanje/${anketa.id}`,
        `/zgrada/${z.id}/dokument`,
        `/zgrada/${z.id}/kontakt`,
      ]) {
        await kao(t, stanar).get(putanja).expect(403);
      }
      for (const putanja of ['/kvar', '/oglas', '/glasanje', '/sastanak']) {
        const odgovor = await kao(t, stanar).get(putanja).expect(200);
        expect(odgovor.body.ukupno).toBe(0);
      }
      await kao(t, stanar).patch(`/oglas/${mojOglas}/obnovi`).expect(403);
      await kao(t, stanar).delete(`/oglas/${mojOglas}`).expect(403);
      await kao(t, stanar)
        .patch(`/kvar/${mojKvar}/povuci`)
        .send({})
        .expect(403);
    });

    it('iseljen stanar više ne dobija obaveštenja o kvaru koji je prijavio', async () => {
      const z = await novaZgrada();
      const kvar = await id(
        kao(t, z.sused)
          .post('/kvar')
          .send(noviKvar(z.stanovi[1], ZAJEDNICKI_PROSTOR))
          .expect(201),
      );
      const veza = (
        await t.baza
          .getRepository(StanarStana)
          .findOneByOrFail({ korisnik: { id: z.sused.id } })
      ).id;
      await kao(t, z.upravnik)
        .delete(`/zgrada/${z.id}/stanar/${veza}`)
        .expect(204);
      const pre = await obavestenja(z.sused);

      await kao(t, z.upravnik).patch(`/kvar/${kvar}/prihvati`).expect(200);
      await kao(t, z.vlasnik)
        .post(`/kvar/${kvar}/komentar`)
        .send({ tekst: 'Vidi se i sa ulice.' })
        .expect(201);

      expect(await obavestenja(z.sused)).toEqual(pre);
    });

    it('posle iseljenja prijavioca, o kvaru u stanu se obaveštavaju oni koji ostaju u stanu', async () => {
      const z = await novaZgrada();
      const serviser = await napraviServisera(t, 'Popravlja');
      const kvar = await id(
        kao(t, z.vlasnik)
          .post('/kvar')
          .send(noviKvar(z.stanovi[0], PRIVATNI_STAN))
          .expect(201),
      );
      await kao(t, z.upravnik).patch(`/kvar/${kvar}/prihvati`).expect(200);
      const prihvacen = 'Upravnik je prihvatio prijavu kvara „Curi cev“.';
      expect(await obavestenja(z.ukucanin)).toContain(prihvacen);
      expect(await obavestenja(z.sused)).not.toContain(prihvacen);

      await kao(t, z.upravnik)
        .delete(`/zgrada/${z.id}/stanar/${z.vezaVlasnika}`)
        .expect(204);
      const pre = await obavestenja(z.vlasnik);
      await kao(t, z.upravnik)
        .patch(`/kvar/${kvar}/dodeli`)
        .send({ serviserId: serviser.id })
        .expect(200);
      for (const status of ['u_toku', 'resen']) {
        await kao(t, serviser)
          .patch(`/kvar/${kvar}/status`)
          .send({ status })
          .expect(200);
      }

      expect(await obavestenja(z.ukucanin)).toContain(
        'Kvar „Curi cev“ je rešen. Potvrdi da je sve u redu ili javi da nije.',
      );
      expect(await obavestenja(z.vlasnik)).toEqual(pre);
      await kao(t, z.ukucanin).patch(`/kvar/${kvar}/potvrdi`).expect(200);
    });

    it('ko ima još jedan stan u zgradi ostaje stanar i gubi samo glas tog stana', async () => {
      const z = await novaZgrada();
      const veza2 = await useli(t, z.vlasnik, z.stanovi[2], true);
      const anketa = (
        await kao(t, z.upravnik).post('/glasanje').send(novaAnketa(z.id))
      ).body;
      const odluka = (
        await kao(t, z.upravnik).post('/glasanje').send(novaOdluka(z.id))
      ).body;
      for (const glasanje of [anketa, odluka]) {
        await kao(t, z.vlasnik)
          .put(`/glasanje/${glasanje.id}/glas`)
          .send({ opcijaId: glasanje.opcije[0].id })
          .expect(200);
      }
      const mojOglas = await id(
        kao(t, z.vlasnik).post('/oglas').send(noviOglas(z.id)).expect(201),
      );

      await kao(t, z.upravnik)
        .delete(`/zgrada/${z.id}/stanar/${veza2}`)
        .expect(204);

      const glasovi = await t.baza.getRepository(Glas).find({
        where: { korisnik: { id: z.vlasnik.id } },
        relations: { glasanje: true, stan: true },
      });
      expect(glasovi.map((g) => [g.glasanje.id, g.stan?.id ?? null])).toEqual(
        expect.arrayContaining([
          [anketa.id, null],
          [odluka.id, z.stanovi[0]],
        ]),
      );
      expect(glasovi).toHaveLength(2);
      expect((await oglas(z.vlasnik, mojOglas)).datumSakrivanja).toBeNull();
      await kao(t, z.vlasnik).get(`/glasanje/${odluka.id}`).expect(200);
    });

    it('kad vlasnik postane ukućanin, gubi glas u odluci i pristup odlukama', async () => {
      const z = await novaZgrada();
      const anketa = (
        await kao(t, z.upravnik).post('/glasanje').send(novaAnketa(z.id))
      ).body;
      const odluka = (
        await kao(t, z.upravnik).post('/glasanje').send(novaOdluka(z.id))
      ).body;
      for (const glasanje of [anketa, odluka]) {
        await kao(t, z.vlasnik)
          .put(`/glasanje/${glasanje.id}/glas`)
          .send({ opcijaId: glasanje.opcije[0].id })
          .expect(200);
      }

      const izmena = await kao(t, z.upravnik)
        .patch(`/zgrada/${z.id}/stanar/${z.vezaVlasnika}`)
        .send({ vlasnik: false })
        .expect(200);
      expect(izmena.body).toEqual({ id: z.vezaVlasnika, vlasnik: false });

      const glasovi = await t.baza.getRepository(Glas).find({
        where: { korisnik: { id: z.vlasnik.id } },
        relations: { glasanje: true },
      });
      expect(glasovi.map((g) => g.glasanje.id)).toEqual([anketa.id]);
      await kao(t, z.vlasnik).get(`/glasanje/${odluka.id}`).expect(403);
      await kao(t, z.vlasnik).get(`/glasanje/${anketa.id}`).expect(200);

      await kao(t, z.upravnik)
        .patch(`/zgrada/${z.id}/stanar/${z.vezaVlasnika}`)
        .send({ vlasnik: true })
        .expect(200);
      await kao(t, z.vlasnik).get(`/glasanje/${odluka.id}`).expect(200);
      await kao(t, z.upravnik)
        .patch(`/zgrada/${z.id}/stanar/${z.vezaVlasnika}`)
        .send({ vlasnik: 'da' })
        .expect(400);
    });

    it('spisak stanara po stanovima vidi upravnik, sa kontaktom', async () => {
      const z = await novaZgrada();
      const odgovor = await kao(t, z.upravnik)
        .get(`/zgrada/${z.id}/stanar`)
        .expect(200);
      expect(
        odgovor.body.map((s: { broj: string; stanari: unknown[] }) => [
          s.broj,
          s.stanari.length,
        ]),
      ).toEqual([
        ['1', 2],
        ['2', 1],
        ['3', 0],
      ]);
      expect(odgovor.body[0].stanari[0]).toMatchObject({
        id: z.vezaVlasnika,
        vlasnik: true,
        korisnik: { id: z.vlasnik.id, email: z.vlasnik.email },
      });
    });
  });

  describe('deaktivacija naloga', () => {
    const deaktiviraj = (korisnik: Akter) =>
      kao(t, admin).put(`/korisnik/${korisnik.id}/deaktivacija`);

    it('stanar se iseljava, oglasi mu se sakrivaju, zahtevi odbijaju', async () => {
      const z = await novaZgrada();
      const druga = await napraviZgradu(t, 'Druga');
      const mojOglas = await id(
        kao(t, z.sused).post('/oglas').send(noviOglas(z.id)).expect(201),
      );
      const zahtev = await id(
        kao(t, z.sused)
          .post('/zahtev-povezivanje')
          .send({ stanId: druga.stanovi[0] })
          .expect(201),
      );

      await kao(t, z.upravnik)
        .put(`/korisnik/${z.sused.id}/deaktivacija`)
        .expect(403);
      await deaktiviraj(z.sused).expect(204);
      await deaktiviraj(z.sused).expect(204);

      expect(await veze(z.sused)).toBe(0);
      expect((await oglas(z.upravnik, mojOglas)).razlogSakrivanja).toBe(
        'Nalog autora je deaktiviran.',
      );
      const zahtevi = await kao(t, admin)
        .get('/zahtev-povezivanje?poStrani=50')
        .expect(200);
      expect(
        zahtevi.body.stavke.find((s: { id: number }) => s.id === zahtev).status,
      ).toBe('odbijen');

      const lista = async (stanje: string) =>
        (
          await kao(t, admin)
            .get(`/korisnik?stanje=${stanje}&pretraga=${z.sused.email}`)
            .expect(200)
        ).body.stavke.map((k: { id: number }) => k.id);
      expect(await lista('deaktivirani')).toEqual([z.sused.id]);
      expect(await lista('aktivni')).toEqual([]);

      await kao(t, admin)
        .patch(`/korisnik/${z.sused.id}/uloga`)
        .send({ uloga: 'serviser' })
        .expect(409);
      await kao(t, admin)
        .delete(`/korisnik/${z.sused.id}/deaktivacija`)
        .expect(204);
      await prijavi(t, z.sused.email);
      expect(await veze(z.sused)).toBe(0);
    });

    it('upravnik prestaje da upravlja zgradom', async () => {
      const z = await novaZgrada();
      await deaktiviraj(z.upravnik).expect(204);
      expect(await uBazi(z.upravnik)).toMatchObject({
        uloga: Uloga.STANAR,
        zgrade: [],
      });
      const upravnik = await kao(t, admin)
        .get(`/zgrada/${z.id}/upravnik`)
        .expect(200);
      expect(upravnik.body).toEqual({ korisnik: null });
    });

    it('serviseru se oduzimaju kvarovi u radu i vraćaju upravniku na dodelu', async () => {
      const z = await novaZgrada();
      const serviser = await napraviServisera(t, 'Odlazi');
      const kvarovi: Record<string, number> = {};
      for (const cilj of ['dodeljen', 'u_toku', 'resen']) {
        const kvar = await id(
          kao(t, z.vlasnik)
            .post('/kvar')
            .send(noviKvar(z.stanovi[0], ZAJEDNICKI_PROSTOR))
            .expect(201),
        );
        await kao(t, z.upravnik).patch(`/kvar/${kvar}/prihvati`).expect(200);
        await kao(t, z.upravnik)
          .patch(`/kvar/${kvar}/dodeli`)
          .send({ serviserId: serviser.id })
          .expect(200);
        if (cilj !== 'dodeljen') {
          await kao(t, serviser)
            .patch(`/kvar/${kvar}/status`)
            .send({ status: 'u_toku' })
            .expect(200);
        }
        if (cilj === 'resen') {
          await kao(t, serviser)
            .patch(`/kvar/${kvar}/status`)
            .send({ status: 'resen' })
            .expect(200);
        }
        kvarovi[cilj] = kvar;
      }

      await deaktiviraj(serviser).expect(204);

      const detalj = async (kvar: number) =>
        (await kao(t, z.upravnik).get(`/kvar/${kvar}`).expect(200)).body;
      for (const cilj of ['dodeljen', 'u_toku']) {
        const kvar = await detalj(kvarovi[cilj]);
        expect(kvar).toMatchObject({ status: 'prihvacen', serviser: null });
        expect(kvar.istorija.at(-1)).toMatchObject({
          status: 'prihvacen',
          korisnik: { id: admin.id },
        });
      }
      expect(await detalj(kvarovi.resen)).toMatchObject({
        status: 'resen',
        serviser: { id: serviser.id },
      });
    });
  });

  describe('promena uloge', () => {
    const promeni = (korisnik: Akter, uloga: string) =>
      kao(t, admin).patch(`/korisnik/${korisnik.id}/uloga`).send({ uloga });

    it('stanar sa stanom ne postaje serviser dok se ne iseli', async () => {
      const z = await novaZgrada();
      const odbijen = await promeni(z.sused, 'serviser').expect(409);
      expect(odbijen.body.message).toContain('ima stan');
      expect((await uBazi(z.sused)).uloga).toBe(Uloga.STANAR);
    });

    it('stanar bez stana postaje serviser i zahtevi mu se odbijaju', async () => {
      const z = await novaZgrada();
      const korisnik = await napraviKorisnika(t, 'BuduciServiser');
      await kao(t, korisnik)
        .post('/zahtev-povezivanje')
        .send({ stanId: z.stanovi[2] })
        .expect(201);
      await promeni(korisnik, 'serviser').expect(204);
      expect((await uBazi(korisnik)).uloga).toBe(Uloga.SERVISER);
      const moji = await kao(t, korisnik)
        .get('/zahtev-povezivanje/moji-zahtevi')
        .expect(200);
      expect(moji.body.map((z0: { status: string }) => z0.status)).toEqual([
        'odbijen',
      ]);
      await kao(t, admin)
        .put(`/korisnik/${korisnik.id}/specijalnosti`)
        .send({ kategorije: ['vodovod', 'struja'] })
        .expect(200);
      await kao(t, admin)
        .put(`/korisnik/${korisnik.id}/specijalnosti`)
        .send({ kategorije: ['vodoinstalater'] })
        .expect(400);
    });

    it('serviser koji postane stanar gubi struke i kvarove u radu', async () => {
      const z = await novaZgrada();
      const serviser = await napraviServisera(t, 'BivsiServiser');
      const kvar = await id(
        kao(t, z.vlasnik)
          .post('/kvar')
          .send(noviKvar(z.stanovi[0], ZAJEDNICKI_PROSTOR))
          .expect(201),
      );
      await kao(t, z.upravnik).patch(`/kvar/${kvar}/prihvati`).expect(200);
      await kao(t, z.upravnik)
        .patch(`/kvar/${kvar}/dodeli`)
        .send({ serviserId: serviser.id })
        .expect(200);

      await promeni(serviser, 'stanar').expect(204);

      expect(
        await t.baza
          .getRepository(ServiserSpecijalnost)
          .countBy({ korisnik: { id: serviser.id } }),
      ).toBe(0);
      const posle = await kao(t, z.upravnik).get(`/kvar/${kvar}`).expect(200);
      expect(posle.body).toMatchObject({ status: 'prihvacen', serviser: null });
      await kao(t, serviser).get(`/kvar/${kvar}`).expect(403);
      await kao(t, admin)
        .put(`/korisnik/${serviser.id}/specijalnosti`)
        .send({ kategorije: ['vodovod'] })
        .expect(400);
    });

    it('upravnik bez ijedne zgrade može da postane stanar', async () => {
      const bezZgrade = await napraviKorisnika(t, 'UpravnikBezZgrade', {
        uloga: Uloga.UPRAVNIK,
      });
      await promeni(bezZgrade, 'stanar').expect(204);
      expect((await uBazi(bezZgrade)).uloga).toBe(Uloga.STANAR);
    });

    it('upravnik se ne menja ovde nego razrešenjem na zgradi', async () => {
      const z = await novaZgrada();
      const druga = await novaZgrada();
      await kao(t, admin)
        .put(`/zgrada/${druga.id}/upravnik`)
        .send({ korisnikId: z.upravnik.id })
        .expect(200);
      const odgovor = await promeni(z.upravnik, 'stanar').expect(409);
      expect(odgovor.body.message).toContain('upravlja zgradama');
      await promeni(z.upravnik, 'serviser').expect(409);
      expect((await uBazi(z.upravnik)).uloga).toBe(Uloga.UPRAVNIK);
    });
  });

  describe('upravnik zgrade', () => {
    const postavi = (zgradaId: number, korisnik: Akter) =>
      kao(t, admin)
        .put(`/zgrada/${zgradaId}/upravnik`)
        .send({ korisnikId: korisnik.id });

    it('nov upravnik smenjuje starog; oglasi starog se sakrivaju, obaveštenja ostaju', async () => {
      const z = await novaZgrada();
      const obavestenje = await id(
        kao(t, z.upravnik)
          .post('/oglas')
          .send(noviOglas(z.id, 'obavestenje' as never))
          .expect(201),
      );
      const prodaja = await id(
        kao(t, z.upravnik).post('/oglas').send(noviOglas(z.id)).expect(201),
      );

      const odgovor = await postavi(z.id, z.sused).expect(200);
      expect(odgovor.body.korisnik).toMatchObject({ id: z.sused.id });
      expect(await uBazi(z.sused)).toMatchObject({
        uloga: Uloga.UPRAVNIK,
        zgrade: [z.id],
      });
      expect(await uBazi(z.upravnik)).toMatchObject({
        uloga: Uloga.STANAR,
        zgrade: [],
      });
      expect((await oglas(z.sused, obavestenje)).datumSakrivanja).toBeNull();
      expect((await oglas(z.sused, prodaja)).razlogSakrivanja).toBe(
        'Autor više ne upravlja zgradom.',
      );

      await kao(t, z.upravnik).get(`/zgrada/${z.id}/stanar`).expect(403);
      await kao(t, z.sused).get(`/zgrada/${z.id}/stanar`).expect(200);
      await postavi(z.id, z.sused).expect(200);
    });

    it('istovremena deaktivacija i smena upravnika se ne zaglave', async () => {
      for (let i = 0; i < 5; i++) {
        const z = await novaZgrada();
        const [deaktivacija, smena] = await Promise.all([
          kao(t, admin).put(`/korisnik/${z.upravnik.id}/deaktivacija`),
          postavi(z.id, z.sused),
        ]);
        expect([deaktivacija.status, smena.status]).toEqual([204, 200]);
        expect(await uBazi(z.upravnik)).toEqual({
          uloga: Uloga.STANAR,
          zgrade: [],
        });
        expect((await uBazi(z.sused)).zgrade).toEqual([z.id]);
      }
    });

    it('serviser, admin i deaktiviran nalog ne mogu biti postavljeni', async () => {
      const z = await novaZgrada();
      const serviser = await napraviServisera(t, 'Serviser');
      const deaktiviran = await napraviKorisnika(t, 'Deaktiviran');
      await kao(t, admin)
        .put(`/korisnik/${deaktiviran.id}/deaktivacija`)
        .expect(204);

      await postavi(z.id, serviser).expect(400);
      await postavi(z.id, admin).expect(400);
      await postavi(z.id, deaktiviran).expect(404);
      await postavi(987654, z.sused).expect(404);
      expect((await uBazi(z.upravnik)).zgrade).toEqual([z.id]);
    });

    it('upravnik vodi više zgrada i postaje stanar tek bez ijedne', async () => {
      const z = await novaZgrada();
      const druga = await novaZgrada();

      await postavi(z.id, druga.upravnik).expect(200);
      expect(await uBazi(druga.upravnik)).toEqual({
        uloga: Uloga.UPRAVNIK,
        zgrade: [z.id, druga.id],
      });
      expect(await uBazi(z.upravnik)).toEqual({
        uloga: Uloga.STANAR,
        zgrade: [],
      });
      const profil = await kao(t, druga.upravnik)
        .get('/korisnik/moj-profil')
        .expect(200);
      expect(profil.body.upravlja.map((x: { id: number }) => x.id)).toEqual(
        expect.arrayContaining([z.id, druga.id]),
      );
      await kao(t, druga.upravnik).get(`/zgrada/${z.id}/stanar`).expect(200);
      await kao(t, druga.upravnik)
        .get(`/zgrada/${druga.id}/stanar`)
        .expect(200);

      await kao(t, admin).delete(`/zgrada/${druga.id}/upravnik`).expect(204);
      expect(await uBazi(druga.upravnik)).toEqual({
        uloga: Uloga.UPRAVNIK,
        zgrade: [z.id],
      });
      await kao(t, druga.upravnik)
        .get(`/zgrada/${druga.id}/stanar`)
        .expect(403);

      await kao(t, admin).delete(`/zgrada/${z.id}/upravnik`).expect(204);
      expect(await uBazi(druga.upravnik)).toEqual({
        uloga: Uloga.STANAR,
        zgrade: [],
      });
    });

    it('arhiviranje jedne od dve zgrade ne menja ulogu upravnika', async () => {
      const z = await novaZgrada();
      const druga = await novaZgrada();
      await postavi(z.id, druga.upravnik).expect(200);
      await kao(t, admin).put(`/zgrada/${z.id}/arhiva`).expect(204);
      expect(await uBazi(druga.upravnik)).toEqual({
        uloga: Uloga.UPRAVNIK,
        zgrade: [druga.id],
      });
    });

    it('deaktivacija razrešava upravnika svih zgrada', async () => {
      const z = await novaZgrada();
      const druga = await novaZgrada();
      await postavi(z.id, druga.upravnik).expect(200);
      await kao(t, admin)
        .put(`/korisnik/${druga.upravnik.id}/deaktivacija`)
        .expect(204);
      expect(await uBazi(druga.upravnik)).toEqual({
        uloga: Uloga.STANAR,
        zgrade: [],
      });
    });

    it('razrešen upravnik koji stanuje u zgradi ostaje stanar sa svojim oglasima', async () => {
      const z = await novaZgrada();
      await useli(t, z.upravnik, z.stanovi[2], true);
      const prodaja = await id(
        kao(t, z.upravnik).post('/oglas').send(noviOglas(z.id)).expect(201),
      );
      await kao(t, admin).delete(`/zgrada/${z.id}/upravnik`).expect(204);
      await kao(t, admin).delete(`/zgrada/${z.id}/upravnik`).expect(404);

      expect((await uBazi(z.upravnik)).uloga).toBe(Uloga.STANAR);
      expect((await oglas(z.upravnik, prodaja)).datumSakrivanja).toBeNull();
      await kao(t, z.upravnik).get(`/zgrada/${z.id}/stanar`).expect(403);
      await kao(t, z.upravnik).get(`/zgrada/${z.id}/kontakt`).expect(200);
    });
  });

  describe('arhiviranje zgrade', () => {
    it('iseljava stanare, razrešava upravnika i sakriva sadržaj, a vraćanje ne vraća ljude', async () => {
      const z = await novaZgrada();
      const novajlija = await napraviKorisnika(t, 'Novajlija');
      const zahtev = await id(
        kao(t, novajlija)
          .post('/zahtev-povezivanje')
          .send({ stanId: z.stanovi[2] })
          .expect(201),
      );
      const mojOglas = await id(
        kao(t, z.vlasnik).post('/oglas').send(noviOglas(z.id)).expect(201),
      );
      const anketa = (
        await kao(t, z.upravnik).post('/glasanje').send(novaAnketa(z.id))
      ).body;
      await kao(t, z.vlasnik)
        .put(`/glasanje/${anketa.id}/glas`)
        .send({ opcijaId: anketa.opcije[0].id })
        .expect(200);

      await kao(t, z.upravnik).put(`/zgrada/${z.id}/arhiva`).expect(403);
      await kao(t, admin).put(`/zgrada/${z.id}/arhiva`).expect(204);
      await kao(t, admin).put(`/zgrada/${z.id}/arhiva`).expect(204);

      for (const stanar of [z.vlasnik, z.ukucanin, z.sused]) {
        expect(await veze(stanar)).toBe(0);
      }
      expect(await uBazi(z.upravnik)).toMatchObject({
        uloga: Uloga.STANAR,
        zgrade: [],
      });
      expect(
        await t.baza
          .getRepository(Glas)
          .countBy({ glasanje: { id: anketa.id } }),
      ).toBe(0);
      const moji = await kao(t, novajlija)
        .get('/zahtev-povezivanje/moji-zahtevi')
        .expect(200);
      expect(
        moji.body.find((m: { id: number }) => m.id === zahtev).status,
      ).toBe('odbijen');
      const upravljanje = await kao(t, admin)
        .get('/zgrada/upravljanje')
        .expect(200);
      expect(
        upravljanje.body.find((u: { id: number }) => u.id === z.id),
      ).toMatchObject({ brojStanova: 3, brojStanara: 0, upravnik: null });
      expect(
        upravljanje.body.find((u: { id: number }) => u.id === z.id).arhivirana,
      ).not.toBeNull();

      await kao(t, admin).delete(`/zgrada/${z.id}/arhiva`).expect(204);
      await kao(t, admin).get(`/zgrada/${z.id}`).expect(200);
      expect(await veze(z.vlasnik)).toBe(0);
      expect(await oglas(admin, mojOglas)).toMatchObject({
        razlogSakrivanja: 'Zgrada je arhivirana.',
      });
      await kao(t, z.vlasnik).get(`/oglas/${mojOglas}`).expect(403);
    });

    it('briše se samo prazna zgrada', async () => {
      const puna = await novaZgrada();
      const odbijeno = await kao(t, admin)
        .delete(`/zgrada/${puna.id}`)
        .expect(409);
      expect(odbijeno.body.message).toContain('stanova 3');

      const prazna = await id(
        kao(t, admin)
          .post('/zgrada')
          .send({ naziv: 'Prazna', adresa: 'Nova 1' })
          .expect(201),
      );
      await kao(t, admin).delete(`/zgrada/${prazna}`).expect(200);
      await kao(t, admin).get(`/zgrada/${prazna}`).expect(404);
      await kao(t, admin).delete(`/zgrada/${prazna}`).expect(404);
    });
  });

  describe('stanovi', () => {
    it('broj stana je jedinstven u zgradi, a grupni unos ide ceo ili nikako', async () => {
      const z = await novaZgrada();
      const stan = (broj: string) => ({ broj, sprat: 2, kvadratura: 45 });
      await kao(t, z.upravnik)
        .post('/stan')
        .send({ ...stan('1'), zgradaId: z.id })
        .expect(409);
      await kao(t, z.upravnik)
        .post('/stan/grupno')
        .send({ zgradaId: z.id, stanovi: [stan('7'), stan('7')] })
        .expect(400);
      await kao(t, z.upravnik)
        .post('/stan/grupno')
        .send({ zgradaId: z.id, stanovi: [stan('8'), stan('2')] })
        .expect(409);
      const dodati = await kao(t, z.upravnik)
        .post('/stan/grupno')
        .send({ zgradaId: z.id, stanovi: [stan('8'), stan('9')] })
        .expect(201);
      expect(dodati.body).toHaveLength(2);

      const spisak = await kao(t, z.vlasnik)
        .get(`/stan/zgrada/${z.id}`)
        .expect(200);
      expect(spisak.body.map((s: { broj: string }) => s.broj)).toEqual([
        '1',
        '2',
        '3',
        '8',
        '9',
      ]);
      await kao(t, z.upravnik)
        .patch(`/stan/${dodati.body[0].id}`)
        .send({ broj: '9' })
        .expect(409);
      await kao(t, z.upravnik)
        .patch(`/stan/${dodati.body[0].id}`)
        .send({ zgradaId: 1 })
        .expect(400);
    });

    it('stan sa stanarima ili kvarovima se ne briše', async () => {
      const z = await novaZgrada();
      await kao(t, z.upravnik).delete(`/stan/${z.stanovi[0]}`).expect(409);
      await kao(t, z.upravnik).delete(`/stan/${z.stanovi[2]}`).expect(200);
      await kao(t, z.upravnik).delete(`/stan/${z.stanovi[2]}`).expect(404);
    });
  });
});
