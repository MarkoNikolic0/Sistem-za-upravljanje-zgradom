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
  napraviKorisnika,
  napraviServisera,
  napraviZgraduSaLjudima,
  novaAnketa,
  noviKvar,
  noviOglas,
  noviSastanak,
  useli,
  type ZgradaSveta,
} from './pomoc/podaci.js';

type Osoba = { id: number; ime: string; email?: string; telefon?: string };

function osobe(telo: unknown, id: number): Osoba[] {
  const nadjene: Osoba[] = [];
  const obidji = (vrednost: unknown) => {
    if (typeof vrednost !== 'object' || vrednost === null) {
      return;
    }
    const objekat = vrednost as Record<string, unknown>;
    if (objekat.id === id && typeof objekat.ime === 'string') {
      nadjene.push(objekat as Osoba);
    }
    Object.values(objekat).forEach(obidji);
  };
  obidji(telo);
  return nadjene;
}

describe('kontakti po odnosu prema zgradi', () => {
  let t: TestAplikacija;
  let z: ZgradaSveta;
  let druga: ZgradaSveta;
  let serviser: Akter;
  let admin: Akter;

  const vidi = async (akter: Akter, adresa: string, osoba: Akter) => {
    const odgovor = await kao(t, akter).get(adresa).expect(200);
    const nadjene = osobe(odgovor.body, osoba.id);
    expect(nadjene.length).toBeGreaterThan(0);
    return nadjene.every(
      (o) => o.email !== undefined && o.telefon !== undefined,
    )
      ? true
      : nadjene.every((o) => o.email === undefined && o.telefon === undefined)
        ? false
        : 'delimicno';
  };

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    z = await napraviZgraduSaLjudima(t, 'KontaktiA');
    druga = await napraviZgraduSaLjudima(t, 'KontaktiB');
    await useli(t, z.upravnik, druga.stanovi[2], false);
    serviser = await napraviServisera(t, 'ServiserKontakti');
    admin = await napraviKorisnika(t, 'AdminKontakti', { uloga: Uloga.ADMIN });
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('upravnik ne vidi kontakte u oglasima, glasanju i sastancima zgrade u kojoj samo stanuje', async () => {
    await kao(t, druga.vlasnik)
      .post('/oglas')
      .send(noviOglas(druga.id))
      .expect(201);
    await kao(t, druga.upravnik)
      .post('/glasanje')
      .send(novaAnketa(druga.id))
      .expect(201);
    await kao(t, druga.upravnik)
      .post('/sastanak')
      .send(noviSastanak(druga.id, VrstaSastanka.ZBOR))
      .expect(201);

    const adrese: [string, Akter][] = [
      [`/oglas?zgradaId=${druga.id}`, druga.vlasnik],
      [`/glasanje?zgradaId=${druga.id}`, druga.upravnik],
      [`/sastanak?zgradaId=${druga.id}`, druga.upravnik],
    ];
    for (const [adresa, osoba] of adrese) {
      expect(await vidi(z.upravnik, adresa, osoba)).toBe(false);
      expect(await vidi(druga.upravnik, adresa, osoba)).toBe(true);
      expect(await vidi(admin, adresa, osoba)).toBe(true);
    }
    expect(await vidi(druga.vlasnik, adrese[0][0], druga.vlasnik)).toBe(false);
  });

  it('upravnik vidi kontakte svojih stanara, podnosilaca zahteva i servisera', async () => {
    expect(await vidi(z.upravnik, `/zgrada/${z.id}/stanar`, z.vlasnik)).toBe(
      true,
    );
    const novi = await napraviKorisnika(t, 'PodnosilacKontakti');
    const zahtev = (
      await kao(t, novi)
        .post('/zahtev-povezivanje')
        .send({ stanId: z.stanovi[2] })
        .expect(201)
    ).body.id as number;
    expect(await vidi(z.upravnik, '/zahtev-povezivanje', novi)).toBe(true);
    await kao(t, z.upravnik)
      .patch(`/zahtev-povezivanje/${zahtev}/obradjen`)
      .send({ status: 'odbijen' })
      .expect(200);
    expect(
      await vidi(z.upravnik, '/zahtev-povezivanje?status=odbijen', novi),
    ).toBe(false);
    expect(
      await vidi(druga.upravnik, `/zgrada/${druga.id}/stanar`, z.upravnik),
    ).toBe(true);

    const kvar = (
      await kao(t, z.vlasnik)
        .post('/kvar')
        .send(noviKvar(z.stanovi[0], LokacijaTip.ZAJEDNICKI_PROSTOR))
        .expect(201)
    ).body.id as number;
    await kao(t, z.upravnik).patch(`/kvar/${kvar}/prihvati`).expect(200);
    await kao(t, z.upravnik)
      .patch(`/kvar/${kvar}/dodeli`)
      .send({ serviserId: serviser.id })
      .expect(200);
    expect(await vidi(z.upravnik, `/kvar/${kvar}`, serviser)).toBe(true);
    expect(await vidi(serviser, `/kvar/${kvar}`, z.vlasnik)).toBe(true);
    expect(await vidi(serviser, `/kvar/${kvar}`, z.upravnik)).toBe(true);
    expect(await vidi(z.vlasnik, `/kvar/${kvar}`, serviser)).toBe(false);

    await t.baza.query(`UPDATE kvar SET status = 'zatvoren' WHERE id = $1`, [
      kvar,
    ]);
    expect(await vidi(serviser, `/kvar/${kvar}`, z.vlasnik)).toBe(false);
    expect(await vidi(serviser, `/kvar/${kvar}`, serviser)).toBe(true);
  });

  it('svoje kontakte korisnik uvek vidi', async () => {
    const oglas = (
      await kao(t, z.upravnik)
        .post('/oglas')
        .send(noviOglas(druga.id))
        .expect(201)
    ).body.id as number;
    expect(await vidi(z.upravnik, `/oglas/${oglas}`, z.upravnik)).toBe(true);
  });
});
