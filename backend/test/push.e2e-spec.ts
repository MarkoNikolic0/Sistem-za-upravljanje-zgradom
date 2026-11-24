import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PushPretplata } from '../src/notifikacija/push/push-pretplata.entity.js';
import { PushService } from '../src/notifikacija/push/push.service.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import { napraviKorisnika, prijavi } from './pomoc/podaci.js';

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

  it('uređaj briše svoju pretplatu po adresi, ko god da ju je sačuvao', async () => {
    const endpoint = uredjaj();
    const drugaPretplata = uredjaj();
    await sacuvaj(prvi, endpoint);
    await sacuvaj(prvi, drugaPretplata);

    await obrisi(drugi, endpoint);
    expect(await vlasnik(endpoint)).toBeNull();
    expect(await vlasnik(drugaPretplata)).toBe(prvi.id);
  });

  it('odjava briše pretplatu te sesije, a ostale sesije ostaju', async () => {
    const telefon = uredjaj();
    const racunar = uredjaj();
    const sesija = await prijavi(t, prvi.email);
    await sacuvaj({ ...prvi, token: sesija.token }, telefon);
    await sacuvaj(prvi, racunar);

    await request(t.server)
      .post('/auth/logout')
      .set('Cookie', sesija.kolacic)
      .expect(204);
    expect(await vlasnik(telefon)).toBeNull();
    expect(await vlasnik(racunar)).toBe(prvi.id);
  });

  it('po rasporedu se brišu uređaji čija je sesija opozvana ili istekla, aktivni ostaju', async () => {
    const opozvan = await napraviKorisnika(t, 'OpozvanaSesija');
    const istekao = await napraviKorisnika(t, 'IsteklaSesija');
    const [prviUredjaj, drugiUredjaj, aktivan] = [
      uredjaj(),
      uredjaj(),
      uredjaj(),
    ];
    await sacuvaj(opozvan, prviUredjaj);
    await sacuvaj(istekao, drugiUredjaj);
    await sacuvaj(prvi, aktivan);
    await t.baza.query(
      `UPDATE refresh_token SET "datumOpoziva" = now() WHERE "korisnikId" = $1`,
      [opozvan.id],
    );
    await t.baza.query(
      `UPDATE refresh_token SET "datumIsteka" = now() - interval '1 minute'
       WHERE "korisnikId" = $1`,
      [istekao.id],
    );

    await t.app.get(PushService).obrisiNeaktivne();

    expect(await vlasnik(prviUredjaj)).toBeNull();
    expect(await vlasnik(drugiUredjaj)).toBeNull();
    expect(await vlasnik(aktivan)).toBe(prvi.id);
  });
});
