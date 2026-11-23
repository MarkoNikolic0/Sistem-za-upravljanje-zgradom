import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { io, type Socket } from 'socket.io-client';
import { Notifikacija } from '../src/notifikacija/notifikacija.entity.js';
import type { Promena } from '../src/notifikacija/promene.service.js';
import { LokacijaTip } from '../src/shared/enums/kvar.enums.js';
import { VrstaSastanka } from '../src/shared/enums/sastanak.enums.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  napraviSvet,
  novaAnketa,
  novaOdluka,
  noviKvar,
  noviOglas,
  noviSastanak,
  type Svet,
} from './pomoc/podaci.js';

describe('promene uživo bez obaveštenja', () => {
  let t: TestAplikacija;
  let svet: Svet;
  let soketi: Socket[] = [];

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    svet = await napraviSvet(t);
  });

  afterEach(() => {
    soketi.forEach((s) => s.close());
    soketi = [];
  });

  afterAll(async () => {
    await t?.app.close();
  });

  const adresa = () =>
    `http://localhost:${((t.server as Server).address() as AddressInfo).port}/notifikacije`;

  const slusaj = (akter: Akter) =>
    new Promise<Promena[]>((uspeh, neuspeh) => {
      const primljene: Promena[] = [];
      const socket = io(adresa(), {
        auth: { token: akter.token },
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      soketi.push(socket);
      socket.on('promena', (promena: Promena) => primljene.push(promena));
      socket.once('connect', () => uspeh(primljene));
      socket.once('connect_error', neuspeh);
    });

  const slusajSve = (akteri: Record<string, Akter>) =>
    Promise.all(
      Object.entries(akteri).map(
        async ([ime, akter]) => [ime, await slusaj(akter)] as const,
      ),
    ).then((parovi) => Object.fromEntries(parovi));

  const sacekaj = (ms = 300) => new Promise((kraj) => setTimeout(kraj, ms));

  const ko = (primljene: Record<string, Promena[]>, promena: Promena) =>
    Object.entries(primljene)
      .filter(([, lista]) =>
        lista.some((p) => p.vrsta === promena.vrsta && p.id === promena.id),
      )
      .map(([ime]) => ime)
      .sort();

  const brojNotifikacija = () => t.baza.getRepository(Notifikacija).count();

  describe('glasanje', () => {
    it('glas u anketi stiže svima u zgradi osim glasaču, bez novog obaveštenja', async () => {
      const { a } = svet;
      const anketa = (
        await kao(t, a.upravnik).post('/glasanje').send(novaAnketa(a.id))
      ).body as { id: number; opcije: { id: number }[] };
      const primljene = await slusajSve({
        vlasnik: a.vlasnik,
        ukucanin: a.ukucanin,
        sused: a.sused,
        upravnik: a.upravnik,
        admin: svet.admin,
        tudjVlasnik: svet.b.vlasnik,
        tudjUpravnik: svet.b.upravnik,
        serviser: svet.serviser,
        bezStana: svet.bezStana,
      });
      const pre = await brojNotifikacija();

      await kao(t, a.vlasnik)
        .put(`/glasanje/${anketa.id}/glas`)
        .send({ opcijaId: anketa.opcije[0].id })
        .expect(200);
      await sacekaj();

      expect(ko(primljene, { vrsta: 'glasanje', id: anketa.id })).toEqual([
        'admin',
        'sused',
        'ukucanin',
        'upravnik',
      ]);
      expect(await brojNotifikacija()).toBe(pre);

      await kao(t, a.vlasnik).delete(`/glasanje/${anketa.id}/glas`).expect(200);
      await sacekaj();
      expect(primljene.upravnik).toHaveLength(2);
    });

    it('glas za odluku stiže samo vlasnicima, upravniku i adminu', async () => {
      const { a } = svet;
      const odluka = (
        await kao(t, a.upravnik).post('/glasanje').send(novaOdluka(a.id))
      ).body as { id: number; opcije: { id: number }[] };
      const primljene = await slusajSve({
        ukucanin: a.ukucanin,
        sused: a.sused,
        upravnik: a.upravnik,
        admin: svet.admin,
        tudjVlasnik: svet.b.vlasnik,
      });

      await kao(t, a.vlasnik)
        .put(`/glasanje/${odluka.id}/glas`)
        .send({ opcijaId: odluka.opcije[0].id })
        .expect(200);
      await sacekaj();

      expect(ko(primljene, { vrsta: 'glasanje', id: odluka.id })).toEqual([
        'admin',
        'sused',
        'upravnik',
      ]);
    });

    it('odbijen glas ne šalje signal', async () => {
      const { a, b } = svet;
      const anketa = (
        await kao(t, a.upravnik).post('/glasanje').send(novaAnketa(a.id))
      ).body as { id: number; opcije: { id: number }[] };
      const primljene = await slusajSve({ upravnik: a.upravnik });

      await kao(t, b.vlasnik)
        .put(`/glasanje/${anketa.id}/glas`)
        .send({ opcijaId: anketa.opcije[0].id })
        .expect(404);
      await sacekaj();

      expect(primljene.upravnik).toEqual([]);
    });

    it('zatvaranje i brisanje ankete stižu stanarima zgrade', async () => {
      const { a } = svet;
      const anketa = (
        await kao(t, a.upravnik).post('/glasanje').send(novaAnketa(a.id))
      ).body as { id: number };
      const primljene = await slusajSve({
        vlasnik: a.vlasnik,
        upravnik: a.upravnik,
        tudjVlasnik: svet.b.vlasnik,
      });

      await kao(t, a.upravnik)
        .patch(`/glasanje/${anketa.id}/zatvori`)
        .expect(200);
      await kao(t, a.upravnik).delete(`/glasanje/${anketa.id}`).expect(204);
      await sacekaj();

      expect(primljene.vlasnik).toEqual([
        { vrsta: 'glasanje', id: anketa.id },
        { vrsta: 'glasanje', id: anketa.id },
      ]);
      expect(primljene.upravnik).toEqual([]);
      expect(primljene.tudjVlasnik).toEqual([]);
    });
  });

  describe('prisustvo na sastanku', () => {
    it('najava na zbor stiže svima sa stanom u zgradi, a na skupštinu samo vlasnicima', async () => {
      const { a } = svet;
      const zbor = (
        await kao(t, a.upravnik)
          .post('/sastanak')
          .send(noviSastanak(a.id, VrstaSastanka.ZBOR))
          .expect(201)
      ).body as { id: number };
      const skupstina = (
        await kao(t, a.upravnik)
          .post('/sastanak')
          .send(noviSastanak(a.id, VrstaSastanka.SKUPSTINA))
          .expect(201)
      ).body as { id: number };
      const primljene = await slusajSve({
        vlasnik: a.vlasnik,
        ukucanin: a.ukucanin,
        upravnik: a.upravnik,
        admin: svet.admin,
        tudjVlasnik: svet.b.vlasnik,
        tudjUpravnik: svet.b.upravnik,
      });
      const pre = await brojNotifikacija();

      await kao(t, a.sused)
        .put(`/sastanak/${zbor.id}/najava`)
        .send({ dolazi: true })
        .expect(200);
      await kao(t, a.sused)
        .put(`/sastanak/${skupstina.id}/najava`)
        .send({ dolazi: false })
        .expect(200);
      await kao(t, a.sused)
        .delete(`/sastanak/${skupstina.id}/najava`)
        .expect(200);
      await sacekaj();

      expect(ko(primljene, { vrsta: 'sastanak', id: zbor.id })).toEqual([
        'admin',
        'ukucanin',
        'upravnik',
        'vlasnik',
      ]);
      expect(ko(primljene, { vrsta: 'sastanak', id: skupstina.id })).toEqual([
        'admin',
        'upravnik',
        'vlasnik',
      ]);
      expect(await brojNotifikacija()).toBe(pre);
    });
  });

  describe('komentari na kvaru', () => {
    it('nov komentar na zajedničkom kvaru dobijaju samo oni koji ga vide a nisu obavešteni', async () => {
      const { a } = svet;
      const kvar = (
        await kao(t, a.vlasnik)
          .post('/kvar')
          .send(noviKvar(a.stanovi[0], LokacijaTip.ZAJEDNICKI_PROSTOR))
          .expect(201)
      ).body as { id: number };
      const primljene = await slusajSve({
        vlasnik: a.vlasnik,
        ukucanin: a.ukucanin,
        sused: a.sused,
        upravnik: a.upravnik,
        admin: svet.admin,
        tudjVlasnik: svet.b.vlasnik,
        tudjUpravnik: svet.b.upravnik,
        serviser: svet.serviser,
      });

      const komentar = (
        await kao(t, a.sused)
          .post(`/kvar/${kvar.id}/komentar`)
          .send({ tekst: 'Kaplje i kod mene.' })
          .expect(201)
      ).body as { id: number };
      await sacekaj();

      expect(ko(primljene, { vrsta: 'kvar', id: kvar.id })).toEqual([
        'admin',
        'ukucanin',
      ]);

      await kao(t, a.upravnik)
        .delete(`/kvar/${kvar.id}/komentar/${komentar.id}`)
        .expect(204);
      await sacekaj();

      expect(ko(primljene, { vrsta: 'kvar', id: kvar.id })).toEqual([
        'admin',
        'sused',
        'ukucanin',
        'vlasnik',
      ]);
      expect(primljene.upravnik).toEqual([]);
    });

    it('brisanje komentara na kvaru u stanu ne stiže susedu koji ne vidi kvar', async () => {
      const { a } = svet;
      const kvar = (
        await kao(t, a.vlasnik)
          .post('/kvar')
          .send(noviKvar(a.stanovi[0], LokacijaTip.PRIVATNI_STAN))
          .expect(201)
      ).body as { id: number };
      const komentar = (
        await kao(t, a.vlasnik)
          .post(`/kvar/${kvar.id}/komentar`)
          .send({ tekst: 'Pogrešno upisano.' })
          .expect(201)
      ).body as { id: number };
      const primljene = await slusajSve({
        ukucanin: a.ukucanin,
        sused: a.sused,
        upravnik: a.upravnik,
        tudjUpravnik: svet.b.upravnik,
      });

      await kao(t, a.vlasnik)
        .delete(`/kvar/${kvar.id}/komentar/${komentar.id}`)
        .expect(204);
      await sacekaj();

      expect(ko(primljene, { vrsta: 'kvar', id: kvar.id })).toEqual([
        'ukucanin',
        'upravnik',
      ]);
    });
  });

  describe('oglasi', () => {
    it('izmena, sakrivanje i brisanje oglasa stižu zgradi oglasa, a ne tuđoj', async () => {
      const { a } = svet;
      const oglas = (
        await kao(t, a.vlasnik).post('/oglas').send(noviOglas(a.id)).expect(201)
      ).body as { id: number };
      const primljene = await slusajSve({
        vlasnik: a.vlasnik,
        sused: a.sused,
        upravnik: a.upravnik,
        admin: svet.admin,
        tudjVlasnik: svet.b.vlasnik,
        tudjUpravnik: svet.b.upravnik,
      });
      const promena = { vrsta: 'oglas', id: oglas.id } as const;

      await kao(t, a.vlasnik)
        .patch(`/oglas/${oglas.id}`)
        .send({ naslov: 'Prodajem bicikl, povoljno' })
        .expect(200);
      await sacekaj();
      expect(ko(primljene, promena)).toEqual(['admin', 'sused', 'upravnik']);

      await kao(t, a.upravnik)
        .patch(`/oglas/${oglas.id}/sakrij`)
        .send({ razlog: 'Neprikladan sadržaj.' })
        .expect(200);
      await kao(t, a.upravnik).delete(`/oglas/${oglas.id}`).expect(204);
      await sacekaj();

      expect(primljene.vlasnik).toEqual([promena, promena]);
      expect(primljene.sused).toEqual([promena, promena, promena]);
      expect(primljene.tudjVlasnik).toEqual([]);
      expect(primljene.tudjUpravnik).toEqual([]);
    });
  });
});
