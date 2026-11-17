import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { In } from 'typeorm';
import webpush from 'web-push';
import {
  Notifikacija,
  TipNotifikacije,
} from '../src/notifikacija/notifikacija.entity.js';
import { NotifikacijaService } from '../src/notifikacija/notifikacija.service.js';
import { NAJVISE_VEZA_PO_KORISNIKU } from '../src/notifikacija/notifikacija.constants.js';
import { PushPretplata } from '../src/notifikacija/push/push-pretplata.entity.js';
import { VrstaSastanka } from '../src/shared/enums/sastanak.enums.js';
import { VrstaOglasa } from '../src/shared/enums/vrsta-oglasa.enum.js';
import { MS_PO_DANU } from '../src/shared/vreme.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  kolacicSesije,
  napraviKorisnika,
  napraviSvet,
  noviSastanak,
  novaAnketa,
  prijavi,
  type Svet,
} from './pomoc/podaci.js';

type Sesija = Akter & { kolacic: string };

describe('notifikacije uživo i push', () => {
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
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  const adresa = () =>
    `http://localhost:${((t.server as Server).address() as AddressInfo).port}/notifikacije`;

  const povezi = (token: unknown, vidljiv = false) =>
    new Promise<Socket>((uspeh, neuspeh) => {
      const socket = io(adresa(), {
        auth: { token, vidljiv },
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      soketi.push(socket);
      socket.once('connect', () => uspeh(socket));
      socket.once('connect_error', (greska) => neuspeh(greska));
    });

  const prekid = (socket: Socket) =>
    new Promise<string>((kraj) => socket.once('disconnect', kraj));

  const stigne = (socket: Socket) =>
    new Promise<Notifikacija>((kraj) => socket.once('notifikacija', kraj));

  const obavesti = (primaoci: number[], link: string | null = null) =>
    t.baza.transaction((manager) =>
      t.app.get(NotifikacijaService).obavesti(manager, primaoci, {
        tip: TipNotifikacije.VAZNO_OBAVESTENJE,
        tekst: 'Probno obaveštenje',
        link,
      }),
    );

  const sesija = async (akter: Akter): Promise<Sesija> => ({
    ...akter,
    ...(await prijavi(t, akter.email)),
  });

  const uredjaj = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  const pretplati = (akter: Akter, endpoint: string) =>
    kao(t, akter)
      .put('/notifikacija/push-pretplata')
      .send({ endpoint, keys: { p256dh: 'kljuc', auth: 'tajna' } })
      .expect(204);

  const sacekaj = (ms: number) => new Promise((kraj) => setTimeout(kraj, ms));

  describe('veza', () => {
    it('odbija vezu bez tokena i sa neispravnim tokenom', async () => {
      await expect(povezi(undefined)).rejects.toThrow();
      await expect(povezi('nije-token')).rejects.toThrow();
    });

    it('obaveštenje stiže samo svom korisniku', async () => {
      const moj = await povezi(svet.a.vlasnik.token);
      const tudj = await povezi(svet.b.vlasnik.token);
      let tudjeStiglo = false;
      tudj.on('notifikacija', () => (tudjeStiglo = true));

      const stiglo = stigne(moj);
      await obavesti([svet.a.vlasnik.id], '/oglasi');

      expect(await stiglo).toMatchObject({
        tekst: 'Probno obaveštenje',
        link: '/oglasi',
        procitano: false,
      });
      expect(await stiglo).not.toHaveProperty('korisnik');
      await sacekaj(200);
      expect(tudjeStiglo).toBe(false);
    });

    it('odjava prekida veze te sesije, a druga sesija ostaje povezana', async () => {
      const telefon = await sesija(svet.a.sused);
      const racunar = await sesija(svet.a.sused);
      const naTelefonu = await povezi(telefon.token);
      const naRacunaru = await povezi(racunar.token);
      const prekinut = prekid(naTelefonu);

      await request(t.server)
        .post('/auth/logout')
        .set('Cookie', telefon.kolacic)
        .expect(204);

      expect(await prekinut).toBe('io server disconnect');
      expect(naRacunaru.connected).toBe(true);
    });

    it('ponovna upotreba refresh tokena prekida veze te sesije', async () => {
      const s = await sesija(svet.a.ukucanin);
      const socket = await povezi(s.token);
      const prekinut = prekid(socket);
      const prvo = await request(t.server)
        .post('/auth/refresh')
        .set('Cookie', s.kolacic)
        .expect(200);
      expect(kolacicSesije(prvo)).not.toBe(s.kolacic);

      await request(t.server)
        .post('/auth/refresh')
        .set('Cookie', s.kolacic)
        .expect(401);

      expect(await prekinut).toBe('io server disconnect');
    });

    it('veza se prekida kad access token istekne', async () => {
      const token = await t.app.get(JwtService).signAsync(
        {
          sub: svet.b.sused.id,
          email: svet.b.sused.email,
          uloga: 'stanar',
          sid: randomUUID(),
        },
        { expiresIn: 1 },
      );
      const socket = await povezi(token);

      expect(await prekid(socket)).toBe('io server disconnect');
    });

    it(`dozvoljava najviše ${NAJVISE_VEZA_PO_KORISNIKU} veza po korisniku`, async () => {
      const korisnik = await napraviKorisnika(t, 'Mnogoveza');
      for (let i = 0; i < NAJVISE_VEZA_PO_KORISNIKU; i++) {
        await povezi(korisnik.token);
      }

      await expect(povezi(korisnik.token)).rejects.toThrow(
        'Neispravan ili istekao token.',
      );
      soketi.at(-2)?.close();
      await sacekaj(100);
      await expect(povezi(korisnik.token)).resolves.toBeDefined();
    });
  });

  describe('push', () => {
    const slanja = () =>
      vi.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 201,
        body: '',
        headers: {},
      });

    it('šalje na svaki uređaj nevidljive sesije, sa brojem nepročitanih, temom i rokom', async () => {
      const korisnik = await napraviKorisnika(t, 'Dvauredjaja');
      const drugaSesija = await sesija(korisnik);
      const telefon = uredjaj();
      const racunar = uredjaj();
      await pretplati(korisnik, telefon);
      await pretplati(drugaSesija, racunar);
      const posalji = slanja();

      await obavesti([korisnik.id], '/kvarovi/1');

      await vi.waitFor(() => expect(posalji).toHaveBeenCalledTimes(2));
      expect(posalji.mock.calls.map(([p]) => p.endpoint).sort()).toEqual(
        [telefon, racunar].sort(),
      );
      const [, sadrzaj, opcije] = posalji.mock.calls[0];
      expect(JSON.parse(String(sadrzaj)).notification).toMatchObject({
        title: 'Važno obaveštenje',
        body: 'Probno obaveštenje',
        data: {
          neprocitano: 1,
          onActionClick: { default: { url: '/kvarovi/1' } },
        },
      });
      expect(opcije).toMatchObject({ timeout: 10_000 });
      expect(opcije?.topic).toMatch(/^[A-Za-z0-9_-]{32}$/);
    });

    it('preskače sesiju koja ima vidljiv tab', async () => {
      const korisnik = await napraviKorisnika(t, 'Vidljivi');
      const drugaSesija = await sesija(korisnik);
      const vidljiv = uredjaj();
      const skriven = uredjaj();
      await pretplati(korisnik, vidljiv);
      await pretplati(drugaSesija, skriven);
      await povezi(korisnik.token, true);
      const posalji = slanja();

      await obavesti([korisnik.id]);

      await vi.waitFor(() => expect(posalji).toHaveBeenCalledTimes(1));
      await sacekaj(200);
      expect(posalji).toHaveBeenCalledTimes(1);
      expect(posalji.mock.calls[0][0].endpoint).toBe(skriven);
    });

    it('briše pretplatu kad servis javi 410, a ostale zadržava', async () => {
      const korisnik = await napraviKorisnika(t, 'Istekla');
      const drugaSesija = await sesija(korisnik);
      const istekla = uredjaj();
      const ziva = uredjaj();
      await pretplati(korisnik, istekla);
      await pretplati(drugaSesija, ziva);
      vi.spyOn(webpush, 'sendNotification').mockImplementation(
        async (pretplata) => {
          if (pretplata.endpoint === istekla) {
            throw new webpush.WebPushError('Gone', 410, {}, '', istekla);
          }
          return { statusCode: 201, body: '', headers: {} };
        },
      );

      await obavesti([korisnik.id]);

      const pretplate = t.baza.getRepository(PushPretplata);
      await vi.waitFor(async () =>
        expect(await pretplate.countBy({ endpoint: istekla })).toBe(0),
      );
      expect(await pretplate.countBy({ endpoint: ziva })).toBe(1);
    });
  });

  describe('primaoci i čišćenje', () => {
    const notifikacije = (akter: Akter) =>
      t.baza.getRepository(Notifikacija).find({
        where: { korisnik: { id: akter.id } },
        order: { id: 'ASC' },
      });

    it('upravnik dobija obaveštenje kad dobije i kad izgubi zgradu', async () => {
      const novi = await napraviKorisnika(t, 'Noviupravnik');
      const bivsi = svet.b.upravnik;

      await kao(t, svet.admin)
        .put(`/zgrada/${svet.b.id}/upravnik`)
        .send({ korisnikId: novi.id })
        .expect(200);

      expect((await notifikacije(novi)).at(-1)).toMatchObject({
        tip: TipNotifikacije.UPRAVLJANJE,
        link: '/profil',
      });
      expect((await notifikacije(bivsi)).at(-1)?.tekst).toMatch(
        /^Više ne upravljaš zgradom/,
      );

      await kao(t, svet.admin)
        .delete(`/zgrada/${svet.b.id}/upravnik`)
        .expect(204);
      expect((await notifikacije(novi)).at(-1)?.tekst).toMatch(
        /^Više ne upravljaš zgradom/,
      );

      await kao(t, svet.admin)
        .put(`/zgrada/${svet.b.id}/upravnik`)
        .send({ korisnikId: bivsi.id })
        .expect(200);
    });

    it('anketa i važno obaveštenje koje pravi admin stižu i upravniku zgrade', async () => {
      await kao(t, svet.admin)
        .post('/glasanje')
        .send(novaAnketa(svet.a.id))
        .expect(201);
      expect((await notifikacije(svet.a.upravnik)).at(-1)?.tip).toBe(
        TipNotifikacije.GLASANJE_NOVO,
      );

      await kao(t, svet.admin)
        .post('/oglas')
        .send({
          naslov: 'Nestaće vode',
          tekst: 'U utorak od 9 do 12.',
          vrsta: VrstaOglasa.OBAVESTENJE,
          vazno: true,
          zgradaId: svet.a.id,
        })
        .expect(201);
      expect((await notifikacije(svet.a.upravnik)).at(-1)?.tip).toBe(
        TipNotifikacije.VAZNO_OBAVESTENJE,
      );
    });

    it('odseljenje briše obaveštenja o kvarovima i sastancima te zgrade', async () => {
      const { body: sastanak } = await kao(t, svet.a.upravnik)
        .post('/sastanak')
        .send(noviSastanak(svet.a.id, VrstaSastanka.ZBOR))
        .expect(201);
      const link = `/sastanci/${sastanak.id}`;
      await obavesti([svet.a.ukucanin.id], '/glasanje');
      expect((await notifikacije(svet.a.ukucanin)).map((n) => n.link)).toEqual(
        expect.arrayContaining([link, '/glasanje']),
      );

      await kao(t, svet.a.upravnik)
        .delete(`/zgrada/${svet.a.id}/stanar/${svet.a.vezaUkucanina}`)
        .expect(204);

      const ostale = (await notifikacije(svet.a.ukucanin)).map((n) => n.link);
      expect(ostale).not.toContain(link);
      expect(ostale).toEqual(expect.arrayContaining(['/glasanje', '/profil']));
      expect((await notifikacije(svet.a.vlasnik)).map((n) => n.link)).toContain(
        link,
      );
    });

    it('noćni posao briše samo obaveštenja starija od 90 dana', async () => {
      const korisnik = await napraviKorisnika(t, 'Stara');
      const repo = t.baza.getRepository(Notifikacija);
      const stare = await repo.save(
        Array.from({ length: 3 }, () => ({
          tip: TipNotifikacije.VAZNO_OBAVESTENJE,
          tekst: 'Staro',
          link: null,
          korisnik: { id: korisnik.id },
        })),
      );
      await repo.update(
        { id: In(stare.map((n) => n.id)) },
        { datumKreiranja: new Date(Date.now() - 91 * MS_PO_DANU) },
      );
      await obavesti([korisnik.id]);

      await t.app.get(NotifikacijaService).obrisiStare();

      expect(await notifikacije(korisnik)).toEqual([
        expect.objectContaining({ tekst: 'Probno obaveštenje' }),
      ]);
    });
  });
});
