import { Uloga } from '../src/shared/enums/uloga.enum.js';
import { MS_PO_DANU } from '../src/shared/vreme.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  napraviKorisnika,
  useli,
  napraviZgraduSaLjudima,
  noviKontakt,
  noviOglas,
  pdf,
  slika,
  zaDana,
  type ZgradaSveta,
} from './pomoc/podaci.js';

describe('oglasi, dokumenti i kontakti', () => {
  let t: TestAplikacija;
  let z: ZgradaSveta;

  const objavi = async (akter = z.vlasnik, polja: object = {}) =>
    (
      await kao(t, akter)
        .post('/oglas')
        .send({ ...noviOglas(z.id), ...polja })
        .expect(201)
    ).body.id as number;

  const idsUListi = async (akter: Akter) =>
    (await kao(t, akter).get('/oglas?poStrani=50').expect(200)).body.stavke.map(
      (o: { id: number }) => o.id,
    ) as number[];

  const istekni = (oglas: number) =>
    t.baza.query(
      `UPDATE oglas SET "vaziDo" = now() - interval '1 minute' WHERE id = $1`,
      [oglas],
    );

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    z = await napraviZgraduSaLjudima(t, 'Oglasi');
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('oglasi', () => {
    it('oglas druge zgrade i nepostojeći oglas daju isti odgovor', async () => {
      const druga = await napraviZgraduSaLjudima(t, 'OglasiDruga');
      const tudj = (
        await kao(t, druga.vlasnik)
          .post('/oglas')
          .send(noviOglas(druga.id))
          .expect(201)
      ).body.id as number;
      const naTudj = await kao(t, z.vlasnik).get(`/oglas/${tudj}`).expect(404);
      const naNepostojeci = await kao(t, z.vlasnik)
        .get(`/oglas/${tudj + 100000}`)
        .expect(404);
      expect(naTudj.body.message).toBe(`Oglas sa id-jem ${tudj} ne postoji!`);
      expect(naNepostojeci.body.message).toBe(
        `Oglas sa id-jem ${tudj + 100000} ne postoji!`,
      );
    });

    it('sakriveno obaveštenje više nije zakačeno na vrh', async () => {
      const admin = await napraviKorisnika(t, 'AdminOglasa', {
        uloga: Uloga.ADMIN,
      });
      const obavestenje = await objavi(admin, { vrsta: 'obavestenje' });
      await kao(t, z.upravnik)
        .patch(`/oglas/${obavestenje}/sakrij`)
        .send({ razlog: 'Zastarelo.' })
        .expect(200);
      const noviji = await objavi();
      const ids = await idsUListi(z.upravnik);
      expect(ids.indexOf(noviji)).toBeLessThan(ids.indexOf(obavestenje));
    });

    it('obaveštenje upravnika stoji na vrhu, ispred novijih oglasa', async () => {
      const obavestenje = await objavi(z.upravnik, { vrsta: 'obavestenje' });
      const noviji = await objavi();
      const ids = await idsUListi(z.sused);
      expect(ids.indexOf(obavestenje)).toBeLessThan(ids.indexOf(noviji));
      expect(ids[0]).toBe(obavestenje);
    });

    it('sakriven oglas vidi samo autor, sa razlogom, i više ga ne menja', async () => {
      const oglas = await objavi();
      const sakrij = (akter: Akter, razlog = 'Nije za oglasnu tablu.') =>
        kao(t, akter).patch(`/oglas/${oglas}/sakrij`).send({ razlog });

      await sakrij(z.vlasnik).expect(403);
      await sakrij(z.upravnik, ' ').expect(400);
      await sakrij(z.upravnik).expect(200);
      await sakrij(z.upravnik).expect(409);

      await kao(t, z.sused).get(`/oglas/${oglas}`).expect(404);
      expect(await idsUListi(z.sused)).not.toContain(oglas);
      expect(await idsUListi(z.vlasnik)).toContain(oglas);
      expect(await idsUListi(z.upravnik)).toContain(oglas);
      const autoru = await kao(t, z.vlasnik).get(`/oglas/${oglas}`).expect(200);
      expect(autoru.body.razlogSakrivanja).toBe('Nije za oglasnu tablu.');

      await kao(t, z.vlasnik)
        .patch(`/oglas/${oglas}`)
        .send({ naslov: 'Ipak' })
        .expect(409);
      await kao(t, z.vlasnik).patch(`/oglas/${oglas}/obnovi`).expect(409);
      await kao(t, z.vlasnik)
        .post(`/oglas/${oglas}/prilog`)
        .attach('prilog', await slika(), 'slika.png')
        .expect(409);
      await kao(t, z.vlasnik).delete(`/oglas/${oglas}`).expect(204);
    });

    it('upravnik ne sakriva svoj oglas niti menja tuđ', async () => {
      const njegov = await objavi(z.upravnik);
      await kao(t, z.upravnik)
        .patch(`/oglas/${njegov}/sakrij`)
        .send({ razlog: 'Predomislio sam se.' })
        .expect(403);
      const tudj = await objavi();
      await kao(t, z.upravnik)
        .patch(`/oglas/${tudj}`)
        .send({ naslov: 'Ispravka upravnika' })
        .expect(403);
      await kao(t, z.upravnik).delete(`/oglas/${tudj}`).expect(403);
    });

    it('istekao oglas vidi samo autor, koji može da ga obnovi na 30 dana', async () => {
      const oglas = await objavi(z.vlasnik, { vaziDo: zaDana(3) });
      await kao(t, z.vlasnik).patch(`/oglas/${oglas}/obnovi`).expect(409);
      await istekni(oglas);

      await kao(t, z.sused).get(`/oglas/${oglas}`).expect(404);
      expect(await idsUListi(z.sused)).not.toContain(oglas);
      expect(await idsUListi(z.vlasnik)).toContain(oglas);
      await kao(t, z.sused).patch(`/oglas/${oglas}/obnovi`).expect(404);

      const obnovljen = await kao(t, z.vlasnik)
        .patch(`/oglas/${oglas}/obnovi`)
        .expect(200);
      const dana =
        (Date.parse(obnovljen.body.vaziDo) - Date.now()) / MS_PO_DANU;
      expect(dana).toBeGreaterThan(29);
      expect(dana).toBeLessThan(32);
      await kao(t, z.sused).get(`/oglas/${oglas}`).expect(200);
    });

    it.each([
      ['naslov', { naslov: ' ' }],
      ['tekst', { tekst: '' }],
      ['vrsta', { vrsta: 'reklama' }],
      ['vaziDo', { vaziDo: zaDana(-1) }],
      ['zgradaId', { zgradaId: 0 }],
    ])('neispravno polje %s se odbija', async (polje, izmena) => {
      const odgovor = await kao(t, z.vlasnik)
        .post('/oglas')
        .send({ ...noviOglas(z.id), ...izmena })
        .expect(400);
      expect(Object.keys(odgovor.body.greske)).toContain(polje);
    });

    it('stanar ne pretvara svoj oglas u obaveštenje', async () => {
      const oglas = await objavi();
      await kao(t, z.vlasnik)
        .patch(`/oglas/${oglas}`)
        .send({ vrsta: 'obavestenje' })
        .expect(403);
      await kao(t, z.vlasnik)
        .patch(`/oglas/${oglas}`)
        .send({ zgradaId: z.id })
        .expect(400);
      const izmenjen = await kao(t, z.vlasnik)
        .patch(`/oglas/${oglas}`)
        .send({ naslov: 'Prodajem bicikl, sniženo' })
        .expect(200);
      expect(izmenjen.body.datumIzmene).not.toBeNull();
    });

    it('nepročitane broji od poslednjeg otvaranja oglasa, bez sopstvenih i sakrivenih', async () => {
      const broj = async () =>
        (await kao(t, z.sused).get('/oglas/broj-neprocitanih').expect(200)).body
          .broj as number;
      const prvo = await kao(t, z.sused).put('/oglas/procitano').expect(200);
      expect(Date.parse(prvo.body.procitanoDo)).not.toBeNaN();
      const drugo = await kao(t, z.sused).put('/oglas/procitano').expect(200);
      expect(Date.parse(drugo.body.procitanoDo)).toBeGreaterThan(
        Date.parse(prvo.body.procitanoDo),
      );
      expect(await broj()).toBe(0);

      await objavi(z.sused);
      expect(await broj()).toBe(0);
      const tudj = await objavi(z.vlasnik);
      await objavi(z.upravnik, { vrsta: 'obavestenje' });
      expect(await broj()).toBe(2);

      await kao(t, z.upravnik)
        .patch(`/oglas/${tudj}/sakrij`)
        .send({ razlog: 'Sakriveno.' })
        .expect(200);
      expect(await broj()).toBe(1);
      await kao(t, z.sused).put('/oglas/procitano').expect(200);
      expect(await broj()).toBe(0);
    });

    it('važno obaveštenje stiže kao obaveštenje svim stanarima', async () => {
      await objavi(z.upravnik, {
        vrsta: 'obavestenje',
        naslov: 'Nema vode sutra',
        vazno: true,
      });
      for (const stanar of [z.vlasnik, z.ukucanin, z.sused]) {
        const odgovor = await kao(t, stanar).get('/notifikacija').expect(200);
        expect(odgovor.body.stavke[0]).toMatchObject({
          tip: 'vazno_obavestenje',
          tekst: 'Važno obaveštenje: „Nema vode sutra“.',
        });
      }
    });

    it('važno obaveštenje označeno izmenom stiže jednom', async () => {
      const obavestenje = await objavi(z.upravnik, {
        vrsta: 'obavestenje',
        naslov: 'Čišćenje podruma',
      });
      const vazna = async () =>
        (
          await kao(t, z.sused).get('/notifikacija?poStrani=50').expect(200)
        ).body.stavke.filter(
          (n: { tekst: string }) =>
            n.tekst === 'Važno obaveštenje: „Čišćenje podruma u subotu“.',
        ).length as number;

      await kao(t, z.upravnik)
        .patch(`/oglas/${obavestenje}`)
        .send({ naslov: 'Čišćenje podruma u subotu', vazno: true })
        .expect(200);
      expect(await vazna()).toBe(1);
      await kao(t, z.upravnik)
        .patch(`/oglas/${obavestenje}`)
        .send({ tekst: 'Od 9 do 12.', vazno: true })
        .expect(200);
      expect(await vazna()).toBe(1);
    });

    it('autor menja svoje obaveštenje i kad više ne upravlja zgradom', async () => {
      const obavestenje = await objavi(z.upravnik, { vrsta: 'obavestenje' });
      const veza = await useli(t, z.upravnik, z.stanovi[2], false);
      await t.baza.query(
        `UPDATE zgrada SET "upravnikId" = NULL WHERE id = $1`,
        [z.id],
      );
      try {
        await kao(t, z.upravnik)
          .patch(`/oglas/${obavestenje}`)
          .send({ vrsta: 'obavestenje', naslov: 'Ispravljen naslov' })
          .expect(200);
        await kao(t, z.upravnik)
          .patch(`/oglas/${await objavi(z.upravnik)}`)
          .send({ vrsta: 'obavestenje' })
          .expect(403);
      } finally {
        await t.baza.query(
          `UPDATE zgrada SET "upravnikId" = $1 WHERE id = $2`,
          [z.upravnik.id, z.id],
        );
        await t.baza.query('DELETE FROM stanar_stana WHERE id = $1', [veza]);
      }
    });

    it('oglas je obrisan i kad brisanje fajlova u skladištu ne uspe', async () => {
      const oglas = await objavi();
      await kao(t, z.vlasnik)
        .post(`/oglas/${oglas}/prilog`)
        .attach('prilog', pdf(), 'racun.pdf')
        .expect(201);
      const brisanje = vi
        .spyOn(t.skladiste, 'obrisi')
        .mockRejectedValueOnce(new Error('Garage nije dostupan'));
      await kao(t, z.vlasnik).delete(`/oglas/${oglas}`).expect(204);
      expect(brisanje).toHaveBeenCalledOnce();
      brisanje.mockRestore();
      await kao(t, z.vlasnik).get(`/oglas/${oglas}`).expect(404);
    });

    it('prilozi: najviše 5, slika i PDF, fajlovi se brišu sa oglasom', async () => {
      const oglas = await objavi();
      const pre = t.skladiste.fajlovi.size;
      const dodaj = (fajl: Buffer, ime: string) =>
        kao(t, z.vlasnik)
          .post(`/oglas/${oglas}/prilog`)
          .attach('prilog', fajl, ime);
      const fotografija = await slika();

      const saSlikom = await dodaj(fotografija, 'bicikl šareni.png').expect(
        201,
      );
      expect(saSlikom.body).toMatchObject({
        naziv: 'bicikl šareni.png',
        tip: 'image/webp',
      });
      const saPdfom = await dodaj(pdf(), 'račun.pdf').expect(201);
      expect(saPdfom.body.tip).toBe('application/pdf');
      expect(t.skladiste.fajlovi.size).toBe(pre + 3);

      await dodaj(Buffer.from('obican tekst'), 'tekst.pdf').expect(400);
      await kao(t, z.vlasnik).post(`/oglas/${oglas}/prilog`).expect(400);
      await kao(t, z.sused)
        .post(`/oglas/${oglas}/prilog`)
        .attach('prilog', fotografija, 'tudja.png')
        .expect(403);

      for (let i = 0; i < 3; i += 1) {
        await dodaj(pdf(), `prilog${i}.pdf`).expect(201);
      }
      const cuvanje = vi.spyOn(t.skladiste, 'sacuvaj');
      await dodaj(fotografija, 'sesta.png').expect(400);
      expect(cuvanje).not.toHaveBeenCalled();
      cuvanje.mockRestore();
      expect(t.skladiste.fajlovi.size).toBe(pre + 6);

      await kao(t, z.sused)
        .delete(`/oglas/${oglas}/prilog/${saPdfom.body.id}`)
        .expect(403);
      await kao(t, z.vlasnik)
        .delete(`/oglas/${oglas}/prilog/${saPdfom.body.id}`)
        .expect(204);
      expect(t.skladiste.fajlovi.size).toBe(pre + 5);

      await kao(t, z.vlasnik).delete(`/oglas/${oglas}`).expect(204);
      expect(t.skladiste.fajlovi.size).toBe(pre);
      await kao(t, z.vlasnik).get(`/oglas/${oglas}`).expect(404);
    });
  });

  describe('dokumenti zgrade', () => {
    const okaci = (
      polja: Record<string, string>,
      fajl = pdf(),
      ime = 'd.pdf',
    ) => {
      const zahtev = kao(t, z.upravnik).post(`/zgrada/${z.id}/dokument`);
      for (const [polje, vrednost] of Object.entries(polja)) {
        void zahtev.field(polje, vrednost);
      }
      return zahtev.attach('fajl', fajl, ime);
    };
    const ispravan = {
      naziv: 'Kućni red',
      kategorija: 'pravila',
      samoVlasnici: 'false',
    };

    it('upravnik kači, menja i briše dokument, a fajl nestaje sa skladišta', async () => {
      const pre = t.skladiste.fajlovi.size;
      const okacen = await okaci(ispravan).expect(201);
      expect(okacen.body).toMatchObject({
        naziv: 'Kućni red',
        kategorija: 'pravila',
        samoVlasnici: false,
        tip: 'application/pdf',
        url: expect.stringMatching(/^http:\/\/skladiste\.test\//),
      });
      expect(t.skladiste.fajlovi.size).toBe(pre + 1);
      const dokument = `/zgrada/${z.id}/dokument/${okacen.body.id}`;

      await kao(t, z.vlasnik)
        .patch(dokument)
        .send({ naziv: 'Moj' })
        .expect(403);
      const izmenjen = await kao(t, z.upravnik)
        .patch(dokument)
        .send({ naziv: 'Kućni red 2026', samoVlasnici: true })
        .expect(200);
      expect(izmenjen.body).toMatchObject({
        naziv: 'Kućni red 2026',
        samoVlasnici: true,
      });
      const ukucaninu = await kao(t, z.ukucanin)
        .get(`/zgrada/${z.id}/dokument`)
        .expect(200);
      expect(
        ukucaninu.body.stavke.map((d: { id: number }) => d.id),
      ).not.toContain(okacen.body.id);

      await kao(t, z.vlasnik).delete(dokument).expect(403);
      await kao(t, z.upravnik).delete(dokument).expect(204);
      await kao(t, z.upravnik).delete(dokument).expect(404);
      expect(t.skladiste.fajlovi.size).toBe(pre);
    });

    it('odbija dokument bez fajla, pogrešnog tipa i sa neispravnim poljima', async () => {
      const pre = t.skladiste.fajlovi.size;
      await kao(t, z.upravnik)
        .post(`/zgrada/${z.id}/dokument`)
        .field('naziv', 'Bez fajla')
        .field('kategorija', 'pravila')
        .field('samoVlasnici', 'false')
        .expect(400);
      await okaci(ispravan, Buffer.from('MZ izvrsni fajl'), 'virus.pdf').expect(
        400,
      );
      await okaci({ ...ispravan, kategorija: 'tajno' }).expect(400);
      await okaci({ ...ispravan, naziv: ' ' }).expect(400);
      await okaci({ ...ispravan, samoVlasnici: 'možda' }).expect(400);
      expect(t.skladiste.fajlovi.size).toBe(pre);
    });

    it('spisak se filtrira po kategoriji', async () => {
      const pravila = (await okaci(ispravan).expect(201)).body.id;
      const ugovor = (
        await okaci({ ...ispravan, kategorija: 'ugovor' }).expect(201)
      ).body.id;
      const odgovor = await kao(t, z.vlasnik)
        .get(`/zgrada/${z.id}/dokument?kategorija=ugovor`)
        .expect(200);
      const ids = odgovor.body.stavke.map((d: { id: number }) => d.id);
      expect(ids).toContain(ugovor);
      expect(ids).not.toContain(pravila);
    });
  });

  describe('važni kontakti', () => {
    it('upravnik ih uređuje, stanari vide, a telefon se čuva u međunarodnom obliku', async () => {
      const kontakti = `/zgrada/${z.id}/kontakt`;
      const dodat = await kao(t, z.upravnik)
        .post(kontakti)
        .send(noviKontakt())
        .expect(201);
      expect(dodat.body).toMatchObject({
        naziv: 'Lift servis',
        telefon: '+381641112223',
      });
      await kao(t, z.vlasnik).post(kontakti).send(noviKontakt()).expect(403);
      await kao(t, z.upravnik)
        .post(kontakti)
        .send({ ...noviKontakt(), telefon: '123' })
        .expect(400);

      const izmenjen = await kao(t, z.upravnik)
        .patch(`${kontakti}/${dodat.body.id}`)
        .send({ telefon: '011 3456 789' })
        .expect(200);
      expect(izmenjen.body.telefon).toBe('+381113456789');

      const spisak = await kao(t, z.ukucanin).get(kontakti).expect(200);
      expect(spisak.body.map((k: { id: number }) => k.id)).toContain(
        dodat.body.id,
      );
      await kao(t, z.upravnik)
        .delete(`${kontakti}/${dodat.body.id}`)
        .expect(204);
      await kao(t, z.upravnik)
        .delete(`${kontakti}/${dodat.body.id}`)
        .expect(404);
    });
  });
});
