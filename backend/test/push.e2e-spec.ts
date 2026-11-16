import { randomUUID } from 'node:crypto';
import { PushPretplata } from '../src/notifikacija/push/push-pretplata.entity.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import { napraviKorisnika } from './pomoc/podaci.js';

describe('push pretplata uređaja', () => {
  let t: TestAplikacija;
  let prvi: Akter;
  let drugi: Akter;

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    prvi = await napraviKorisnika(t, 'Prvi');
    drugi = await napraviKorisnika(t, 'Drugi');
  });

  afterAll(async () => {
    await t?.app.close();
  });

  const uredjaj = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  const sacuvaj = (akter: Akter, endpoint: string) =>
    kao(t, akter)
      .put('/notifikacija/push-pretplata')
      .send({ endpoint, keys: { p256dh: 'kljuc', auth: 'tajna' } })
      .expect(204);
  const obrisi = (akter: Akter, endpoint: string) =>
    kao(t, akter)
      .delete('/notifikacija/push-pretplata')
      .send({ endpoint })
      .expect(204);
  const vlasnik = async (endpoint: string) => {
    const pretplata = await t.baza.getRepository(PushPretplata).findOne({
      where: { endpoint },
      relations: { korisnik: true },
    });
    return pretplata?.korisnik.id ?? null;
  };

  it('uređaj pripada korisniku koji je poslednji uključio obaveštenja na njemu', async () => {
    const endpoint = uredjaj();
    await sacuvaj(prvi, endpoint);
    expect(await vlasnik(endpoint)).toBe(prvi.id);

    await sacuvaj(drugi, endpoint);
    expect(await vlasnik(endpoint)).toBe(drugi.id);
    expect(
      await t.baza.getRepository(PushPretplata).countBy({ endpoint }),
    ).toBe(1);

    await sacuvaj(prvi, endpoint);
    expect(await vlasnik(endpoint)).toBe(prvi.id);
  });

  it('korisnik pri odjavi briše samo svoju pretplatu, ne i tuđu na istom uređaju', async () => {
    const endpoint = uredjaj();
    await sacuvaj(drugi, endpoint);

    await obrisi(prvi, endpoint);
    expect(await vlasnik(endpoint)).toBe(drugi.id);

    await obrisi(drugi, endpoint);
    expect(await vlasnik(endpoint)).toBeNull();
  });
});
