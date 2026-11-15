import { VrstaSastanka } from '../src/shared/enums/sastanak.enums.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  napraviKorisnika,
  napraviZgraduSaLjudima,
  novaOdluka,
  noviSastanak,
  pdf,
  slika,
  useli,
  zaDana,
  type ZgradaSveta,
} from './pomoc/podaci.js';

const { SKUPSTINA, ZBOR } = VrstaSastanka;

describe('sastanci', () => {
  let t: TestAplikacija;
  let z: ZgradaSveta;
  let dvaStana: Akter;

  const zakazi = async (vrsta = SKUPSTINA, polja: object = {}) =>
    (
      await kao(t, z.upravnik)
        .post('/sastanak')
        .send({ ...noviSastanak(z.id, vrsta), ...polja })
        .expect(201)
    ).body.id as number;

  const pocni = (sastanak: number) =>
    t.baza.query(
      `UPDATE sastanak SET pocetak = now() - interval '1 hour' WHERE id = $1`,
      [sastanak],
    );

  const odrzan = async (vrsta = SKUPSTINA) => {
    const sastanak = await zakazi(vrsta);
    await pocni(sastanak);
    return sastanak;
  };

  const detalj = async (sastanak: number, akter = z.upravnik) =>
    (await kao(t, akter).get(`/sastanak/${sastanak}`).expect(200)).body;

  const najavi = (akter: Akter, sastanak: number, dolazi: boolean) =>
    kao(t, akter).put(`/sastanak/${sastanak}/najava`).send({ dolazi });

  const evidentiraj = (
    sastanak: number,
    stanovi: number[],
    akter = z.upravnik,
  ) => kao(t, akter).put(`/sastanak/${sastanak}/prisustvo`).send({ stanovi });

  const okaciZapisnik = (
    sastanak: number,
    fajl = pdf(),
    ime = 'zapisnik.pdf',
  ) =>
    kao(t, z.upravnik)
      .put(`/sastanak/${sastanak}/zapisnik`)
      .field('naziv', 'Zapisnik sa sednice')
      .attach('fajl', fajl, ime);

  const dokumenti = async (akter: Akter) =>
    (
      await kao(t, akter)
        .get(`/zgrada/${z.id}/dokument?poStrani=50`)
        .expect(200)
    ).body.stavke as { id: number; naziv: string; samoVlasnici: boolean }[];

  const obavestenja = async (akter: Akter, sastanak: number) => {
    const odgovor = await kao(t, akter)
      .get('/notifikacija?poStrani=50')
      .expect(200);
    return (odgovor.body.stavke as { link: string; tip: string }[])
      .filter((n) => n.link === `/sastanci/${sastanak}`)
      .map((n) => n.tip)
      .toReversed();
  };

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    z = await napraviZgraduSaLjudima(t, 'Sastanci', 4);
    dvaStana = await napraviKorisnika(t, 'DvaStana');
    await useli(t, dvaStana, z.stanovi[2], true);
    await useli(t, dvaStana, z.stanovi[3], true);
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('zakazivanje', () => {
    it('skupština se zakazuje bar 3 dana unapred, osim hitne', async () => {
      const prerano = await kao(t, z.upravnik)
        .post('/sastanak')
        .send({ ...noviSastanak(z.id, SKUPSTINA), pocetak: zaDana(1) })
        .expect(400);
      expect(Object.keys(prerano.body.greske)).toEqual(['pocetak']);

      const hitna = await zakazi(SKUPSTINA, {
        pocetak: zaDana(1),
        hitno: true,
      });
      expect((await detalj(hitna)).hitno).toBe(true);
      const zbor = await zakazi(ZBOR, { pocetak: zaDana(1), hitno: true });
      expect((await detalj(zbor)).hitno).toBe(false);
    });

    it.each([
      ['pocetak', { pocetak: zaDana(-1) }],
      ['pocetak', { pocetak: zaDana(400) }],
      ['naslov', { naslov: ' ' }],
      ['lokacija', { lokacija: '' }],
      ['vrsta', { vrsta: 'sednica' }],
      ['tacke.0.naslov', { tacke: [{ naslov: ' ' }] }],
    ])('neispravno polje %s se odbija', async (polje, izmena) => {
      const odgovor = await kao(t, z.upravnik)
        .post('/sastanak')
        .send({ ...noviSastanak(z.id, SKUPSTINA), ...izmena })
        .expect(400);
      expect(Object.keys(odgovor.body.greske)).toContain(polje);
    });

    it('odluka ide na dnevni red samo skupštine, i to jednom', async () => {
      const odluka = (
        await kao(t, z.upravnik)
          .post('/glasanje')
          .send(novaOdluka(z.id))
          .expect(201)
      ).body.id as number;
      const tacke = [{ naslov: 'Zamena lifta', odlukaId: odluka }];

      await kao(t, z.upravnik)
        .post('/sastanak')
        .send({ ...noviSastanak(z.id, ZBOR), tacke })
        .expect(400);
      await kao(t, z.upravnik)
        .post('/sastanak')
        .send({ ...noviSastanak(z.id, SKUPSTINA), tacke: [...tacke, ...tacke] })
        .expect(400);

      const skupstina = await zakazi(SKUPSTINA, {
        tacke: [{ naslov: 'Uvod' }, ...tacke],
      });
      const prikaz = await detalj(skupstina, z.vlasnik);
      expect(
        prikaz.tacke.map((tacka: { redniBroj: number; naslov: string }) => [
          tacka.redniBroj,
          tacka.naslov,
        ]),
      ).toEqual([
        [1, 'Uvod'],
        [2, 'Zamena lifta'],
      ]);
      expect(prikaz.tacke[1].odluka).toMatchObject({
        id: odluka,
        smeDaGlasa: true,
      });
      const glasanje = await kao(t, z.vlasnik)
        .get(`/glasanje/${odluka}`)
        .expect(200);
      expect(glasanje.body.sastanak).toMatchObject({ id: skupstina });
    });

    it('na skupštinu se pozivaju vlasnici, na zbor svi stanari', async () => {
      const skupstina = await zakazi(SKUPSTINA);
      const zbor = await zakazi(ZBOR);
      expect(await obavestenja(z.vlasnik, skupstina)).toEqual([
        'sastanak_novi',
      ]);
      expect(await obavestenja(z.ukucanin, skupstina)).toEqual([]);
      expect(await obavestenja(z.ukucanin, zbor)).toEqual(['sastanak_novi']);
      expect(await obavestenja(z.upravnik, zbor)).toEqual([]);
    });
  });

  describe('izmena i otkazivanje', () => {
    it('upravnik menja termin i dnevni red, pozvani dobijaju obaveštenje', async () => {
      const sastanak = await zakazi(ZBOR);
      const termin = zaDana(12);
      const izmenjen = await kao(t, z.upravnik)
        .patch(`/sastanak/${sastanak}`)
        .send({ pocetak: termin, tacke: [{ naslov: 'Nova tačka' }] })
        .expect(200);
      expect(izmenjen.body.pocetak).toBe(termin);
      expect(
        izmenjen.body.tacke.map((tacka: { naslov: string }) => tacka.naslov),
      ).toEqual(['Nova tačka']);
      expect(await obavestenja(z.ukucanin, sastanak)).toEqual([
        'sastanak_novi',
        'sastanak_izmenjen',
      ]);
      await kao(t, z.vlasnik)
        .patch(`/sastanak/${sastanak}`)
        .send({ naslov: 'Moj sastanak' })
        .expect(403);
    });

    it('zbor ne postaje skupština ako je termin preblizu', async () => {
      const zbor = await zakazi(ZBOR, { pocetak: zaDana(1) });
      await kao(t, z.upravnik)
        .patch(`/sastanak/${zbor}`)
        .send({ vrsta: SKUPSTINA })
        .expect(400);
      await kao(t, z.upravnik)
        .patch(`/sastanak/${zbor}`)
        .send({ vrsta: SKUPSTINA, hitno: true })
        .expect(200);
      await kao(t, z.ukucanin).get(`/sastanak/${zbor}`).expect(403);
    });

    it('otkazivanje traži razlog, a otkazan sastanak se više ne menja', async () => {
      const sastanak = await zakazi(ZBOR);
      await najavi(z.vlasnik, sastanak, true).expect(200);
      await kao(t, z.upravnik)
        .patch(`/sastanak/${sastanak}/otkazi`)
        .send({ razlog: ' ' })
        .expect(400);
      const otkazan = await kao(t, z.upravnik)
        .patch(`/sastanak/${sastanak}/otkazi`)
        .send({ razlog: 'Nema struje.' })
        .expect(200);
      expect(otkazan.body).toMatchObject({
        otkazan: true,
        razlogOtkazivanja: 'Nema struje.',
        smeDaMenja: false,
        smeDaOtkaze: false,
      });

      const zabranjeno = [
        kao(t, z.upravnik).patch(`/sastanak/${sastanak}`).send({ naslov: 'X' }),
        kao(t, z.upravnik)
          .patch(`/sastanak/${sastanak}/otkazi`)
          .send({ razlog: 'Opet.' }),
        najavi(z.vlasnik, sastanak, false),
        kao(t, z.vlasnik).delete(`/sastanak/${sastanak}/najava`),
      ];
      for (const zahtev of zabranjeno) {
        await zahtev.expect(409);
      }
      expect(await obavestenja(z.ukucanin, sastanak)).toEqual([
        'sastanak_novi',
        'sastanak_otkazan',
      ]);
    });

    it('sastanak koji je počeo se ne menja i ne otkazuje', async () => {
      const sastanak = await odrzan(ZBOR);
      await kao(t, z.upravnik)
        .patch(`/sastanak/${sastanak}`)
        .send({ naslov: 'Kasno' })
        .expect(409);
      await kao(t, z.upravnik)
        .patch(`/sastanak/${sastanak}/otkazi`)
        .send({ razlog: 'Kasno.' })
        .expect(409);
    });

    it('spisak deli sastanke na predstojeće i održane i ume da izostavi otkazane', async () => {
      const predstojeci = await zakazi(ZBOR);
      const otkazan = await zakazi(ZBOR);
      const prosli = await zakazi(ZBOR);
      await kao(t, z.upravnik)
        .patch(`/sastanak/${otkazan}/otkazi`)
        .send({ razlog: 'Otkazano.' })
        .expect(200);
      await t.baza.query(
        `UPDATE sastanak SET pocetak = now() - interval '2 days' WHERE id = $1`,
        [prosli],
      );
      const ids = async (upit: string) =>
        (
          await kao(t, z.vlasnik)
            .get(`/sastanak?poStrani=50${upit}`)
            .expect(200)
        ).body.stavke.map((s: { id: number }) => s.id);

      expect(await ids('')).toEqual(
        expect.arrayContaining([predstojeci, otkazan]),
      );
      expect(await ids('')).not.toContain(prosli);
      expect(await ids('&otkazani=false')).not.toContain(otkazan);
      expect(await ids('&stanje=odrzani')).toContain(prosli);
      expect(await ids('&stanje=odrzani')).not.toContain(predstojeci);
    });
  });

  describe('najava dolaska', () => {
    it('odgovor se menja i povlači, a kvorum se računa po stanovima', async () => {
      const skupstina = await zakazi(SKUPSTINA);
      expect((await detalj(skupstina, z.vlasnik)).prisustvo).toMatchObject({
        dolazi: 0,
        neDolazi: 0,
        mojOdgovor: null,
        kvorum: { ukupno: 4, prag: 3, najavljeno: 0, prisutno: null },
        smeDaNajavi: true,
        smeDaVidiSpisak: false,
      });

      await najavi(z.vlasnik, skupstina, true).expect(200);
      await najavi(z.sused, skupstina, false).expect(200);
      const dva = await najavi(dvaStana, skupstina, true).expect(200);
      expect(dva.body).toMatchObject({
        dolazi: 2,
        neDolazi: 1,
        mojOdgovor: true,
        kvorum: { najavljeno: 3 },
      });

      const promenjen = await najavi(z.vlasnik, skupstina, false).expect(200);
      expect(promenjen.body).toMatchObject({
        dolazi: 1,
        neDolazi: 2,
        mojOdgovor: false,
        kvorum: { najavljeno: 2 },
      });

      const povucen = await kao(t, z.vlasnik)
        .delete(`/sastanak/${skupstina}/najava`)
        .expect(200);
      expect(povucen.body).toMatchObject({ neDolazi: 1, mojOdgovor: null });
      await najavi(z.vlasnik, skupstina, 'možda' as never).expect(400);
    });

    it('kad sednica počne, najava se više ne menja', async () => {
      const skupstina = await zakazi(SKUPSTINA);
      await najavi(z.vlasnik, skupstina, true).expect(200);
      await pocni(skupstina);
      await najavi(z.vlasnik, skupstina, false).expect(409);
      await kao(t, z.vlasnik)
        .delete(`/sastanak/${skupstina}/najava`)
        .expect(409);
      expect((await detalj(skupstina, z.vlasnik)).prisustvo).toMatchObject({
        mojOdgovor: true,
        smeDaNajavi: false,
      });
    });

    it('spisak po stanovima vidi samo upravnik, bez kontakta stanara', async () => {
      const skupstina = await zakazi(SKUPSTINA);
      await najavi(z.vlasnik, skupstina, true).expect(200);
      await kao(t, z.vlasnik)
        .get(`/sastanak/${skupstina}/prisustvo`)
        .expect(403);

      const spisak = await kao(t, z.upravnik)
        .get(`/sastanak/${skupstina}/prisustvo`)
        .expect(200);
      expect(spisak.body.stanovi).toHaveLength(4);
      expect(spisak.body.stanovi[0]).toEqual({
        id: z.stanovi[0],
        broj: '1',
        sprat: 0,
        prisutan: false,
        stanari: [
          {
            id: z.vlasnik.id,
            ime: expect.any(String),
            prezime: expect.any(String),
            vlasnik: true,
            dolazi: true,
          },
        ],
      });
    });
  });

  describe('evidencija prisustva i zapisnik', () => {
    it('prisustvo se evidentira samo na skupštini koja je počela', async () => {
      const buduca = await zakazi(SKUPSTINA);
      await evidentiraj(buduca, [z.stanovi[0]]).expect(409);
      const zbor = await odrzan(ZBOR);
      await evidentiraj(zbor, [z.stanovi[0]]).expect(409);

      const skupstina = await odrzan();
      await evidentiraj(skupstina, [z.stanovi[0]], z.vlasnik).expect(403);
      await evidentiraj(skupstina, [987654]).expect(400);
      await evidentiraj(skupstina, 'svi' as never).expect(400);

      const prva = await evidentiraj(skupstina, [
        z.stanovi[0],
        z.stanovi[1],
      ]).expect(200);
      expect(prva.body.kvorum).toMatchObject({
        ukupno: 4,
        prag: 3,
        prisutno: 2,
      });
      expect(prva.body.datumEvidencije).not.toBeNull();

      const druga = await evidentiraj(skupstina, [
        z.stanovi[1],
        z.stanovi[2],
        z.stanovi[3],
      ]).expect(200);
      expect(druga.body.kvorum.prisutno).toBe(3);
      expect(
        druga.body.stanovi.map((s: { prisutan: boolean }) => s.prisutan),
      ).toEqual([false, true, true, true]);
      expect(
        (await detalj(skupstina, z.vlasnik)).prisustvo.kvorum.prisutno,
      ).toBe(3);
    });

    it('zapisnik se kači kad sednica počne i zaključava evidenciju', async () => {
      const buduca = await zakazi(SKUPSTINA);
      await okaciZapisnik(buduca).expect(409);

      const skupstina = await odrzan();
      await evidentiraj(skupstina, [z.stanovi[0]]).expect(200);
      await okaciZapisnik(skupstina, await slika(), 'slika.png').expect(200);
      const prvi = t.skladiste.fajlovi.size;

      const saZapisnikom = await okaciZapisnik(skupstina).expect(200);
      expect(t.skladiste.fajlovi.size).toBe(prvi);
      expect(saZapisnikom.body.zapisnik).toMatchObject({
        naziv: 'Zapisnik sa sednice',
        kategorija: 'zapisnik',
        samoVlasnici: true,
        tip: 'application/pdf',
      });
      expect(saZapisnikom.body.prisustvo.smeDaEvidentira).toBe(false);
      await evidentiraj(skupstina, [z.stanovi[1]]).expect(409);

      const bezZapisnika = await kao(t, z.upravnik)
        .delete(`/sastanak/${skupstina}/zapisnik`)
        .expect(200);
      expect(bezZapisnika.body.zapisnik).toBeNull();
      expect(t.skladiste.fajlovi.size).toBe(prvi - 1);
      await evidentiraj(skupstina, [z.stanovi[1]]).expect(200);
      await kao(t, z.upravnik)
        .delete(`/sastanak/${skupstina}/zapisnik`)
        .expect(404);
    });

    it('zapisnik skupštine vide vlasnici, zapisnik zbora svi stanari', async () => {
      const skupstina = await odrzan(SKUPSTINA);
      const zbor = await odrzan(ZBOR);
      const idZapisnika = async (sastanak: number) =>
        (await okaciZapisnik(sastanak).expect(200)).body.zapisnik.id as number;
      const saSkupstine = await idZapisnika(skupstina);
      const saZbora = await idZapisnika(zbor);

      const ids = async (akter: Akter) =>
        (await dokumenti(akter)).map((d) => d.id);
      expect(await ids(z.vlasnik)).toEqual(
        expect.arrayContaining([saSkupstine, saZbora]),
      );
      expect(await ids(z.ukucanin)).toContain(saZbora);
      expect(await ids(z.ukucanin)).not.toContain(saSkupstine);

      await kao(t, z.upravnik)
        .patch(`/zgrada/${z.id}/dokument/${saSkupstine}`)
        .send({ samoVlasnici: false })
        .expect(409);
      await kao(t, z.upravnik)
        .patch(`/zgrada/${z.id}/dokument/${saSkupstine}`)
        .send({ kategorija: 'ostalo' })
        .expect(409);
      await kao(t, z.upravnik)
        .patch(`/zgrada/${z.id}/dokument/${saSkupstine}`)
        .send({ naziv: 'Zapisnik, ispravljen' })
        .expect(200);
    });

    it('zapisnik mora biti PDF ili slika i ne kači se na otkazan sastanak', async () => {
      const skupstina = await odrzan();
      await okaciZapisnik(
        skupstina,
        Buffer.from('obican tekst'),
        'zapisnik.pdf',
      ).expect(400);
      await kao(t, z.upravnik)
        .put(`/sastanak/${skupstina}/zapisnik`)
        .field('naziv', 'Bez fajla')
        .expect(400);

      const otkazan = await zakazi(SKUPSTINA);
      await kao(t, z.upravnik)
        .patch(`/sastanak/${otkazan}/otkazi`)
        .send({ razlog: 'Otkazano.' })
        .expect(200);
      await pocni(otkazan);
      await okaciZapisnik(otkazan).expect(409);
      await evidentiraj(otkazan, [z.stanovi[0]]).expect(409);
    });
  });
});
