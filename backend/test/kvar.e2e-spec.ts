import { KvarAkcijeService } from '../src/kvar/kvar-akcije.service.js';
import { ServiserSpecijalnost } from '../src/serviser-specijalnost/serviser-specijalnost.entity.js';
import { LokacijaTip } from '../src/shared/enums/kvar.enums.js';
import { MS_PO_DANU } from '../src/shared/vreme.js';
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
  noviKvar,
  pdf,
  slika,
  zaDana,
  type ZgradaSveta,
} from './pomoc/podaci.js';

const { PRIVATNI_STAN, ZAJEDNICKI_PROSTOR } = LokacijaTip;

describe('kvarovi', () => {
  let t: TestAplikacija;
  let z: ZgradaSveta;
  let serviser: Akter;
  let drugiServiser: Akter;

  const prijavi = async (
    lokacija = ZAJEDNICKI_PROSTOR,
    akter = z.vlasnik,
    polja: object = {},
  ) => {
    const stanId = akter === z.sused ? z.stanovi[1] : z.stanovi[0];
    const odgovor = await kao(t, akter)
      .post('/kvar')
      .send({ ...noviKvar(stanId, lokacija), ...polja })
      .expect(201);
    return odgovor.body.id as number;
  };

  const akcija = (akter: Akter, kvar: number, naziv: string, telo?: object) =>
    kao(t, akter).patch(`/kvar/${kvar}/${naziv}`).send(telo);

  const prihvati = (kvar: number) =>
    akcija(z.upravnik, kvar, 'prihvati').expect(200);
  const dodeli = (kvar: number, kome = serviser) =>
    akcija(z.upravnik, kvar, 'dodeli', { serviserId: kome.id }).expect(200);
  const status = (kvar: number, novi: string, ko = serviser) =>
    akcija(ko, kvar, 'status', { status: novi });

  const doStatusa = async (
    cilj: 'prihvacen' | 'dodeljen' | 'u_toku' | 'resen' | 'zatvoren',
    lokacija = ZAJEDNICKI_PROSTOR,
  ) => {
    const kvar = await prijavi(lokacija);
    const koraci = [
      () => prihvati(kvar),
      () => dodeli(kvar),
      () => status(kvar, 'u_toku').expect(200),
      () => status(kvar, 'resen').expect(200),
      () => akcija(z.upravnik, kvar, 'zatvori').expect(200),
    ];
    const redosled = ['prihvacen', 'dodeljen', 'u_toku', 'resen', 'zatvoren'];
    for (const korak of koraci.slice(0, redosled.indexOf(cilj) + 1)) {
      await korak();
    }
    return kvar;
  };

  const detalj = async (kvar: number, akter = z.upravnik) =>
    (await kao(t, akter).get(`/kvar/${kvar}`).expect(200)).body;

  const obavestenja = async (akter: Akter, kvar: number) => {
    const odgovor = await kao(t, akter)
      .get('/notifikacija?poStrani=50')
      .expect(200);
    return (odgovor.body.stavke as { link: string; tekst: string }[])
      .filter((n) => n.link === `/kvarovi/${kvar}`)
      .map((n) => n.tekst)
      .toReversed();
  };

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    z = await napraviZgraduSaLjudima(t, 'Kvarovi');
    serviser = await napraviServisera(t, 'Serviser');
    drugiServiser = await napraviServisera(t, 'DrugiServiser');
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('životni put kvara', () => {
    it('od prijave do zatvaranja, sa vraćanjem na popravku', async () => {
      const kvar = await prijavi(PRIVATNI_STAN);
      expect(await detalj(kvar)).toMatchObject({
        status: 'prijavljen',
        prioritet: 'srednje',
        serviser: null,
        datumResenja: null,
      });

      await prihvati(kvar);
      await dodeli(kvar);
      await status(kvar, 'u_toku').expect(200);
      const resen = await status(kvar, 'resen').expect(200);
      expect(resen.body.datumResenja).not.toBeNull();

      await akcija(z.vlasnik, kvar, 'vrati', { tekst: 'I dalje curi.' }).expect(
        200,
      );
      expect(await detalj(kvar)).toMatchObject({
        status: 'u_toku',
        datumResenja: null,
        rokPotvrde: null,
      });

      await status(kvar, 'resen').expect(200);
      const zatvoren = await akcija(z.vlasnik, kvar, 'potvrdi').expect(200);
      expect(zatvoren.body.status).toBe('zatvoren');
      expect(
        zatvoren.body.istorija.map((p: { status: string }) => p.status),
      ).toEqual([
        'prijavljen',
        'prihvacen',
        'dodeljen',
        'u_toku',
        'resen',
        'u_toku',
        'resen',
        'zatvoren',
      ]);
      expect(zatvoren.body.istorija[5].komentar.tekst).toBe('I dalje curi.');
    });

    it('svako dobija obaveštenja samo o onome što ga se tiče', async () => {
      const kvar = await doStatusa('zatvoren');
      expect(await obavestenja(z.upravnik, kvar)).toEqual([
        'Prijavljen je nov kvar „Curi cev“.',
        'Kvar „Curi cev“ je rešen.',
      ]);
      expect(await obavestenja(z.vlasnik, kvar)).toEqual([
        'Upravnik je prihvatio prijavu kvara „Curi cev“.',
        'Kvar „Curi cev“ je dodeljen serviseru.',
        'Serviser je počeo popravku kvara „Curi cev“.',
        'Kvar „Curi cev“ je rešen. Potvrdi da je sve u redu ili javi da nije.',
        'Kvar „Curi cev“ je zatvoren.',
      ]);
      expect(await obavestenja(serviser, kvar)).toEqual([
        'Dodeljen ti je kvar „Curi cev“.',
        'Kvar „Curi cev“ je zatvoren.',
      ]);
      expect(await obavestenja(z.sused, kvar)).toEqual([]);
      expect(await obavestenja(drugiServiser, kvar)).toEqual([]);
    });

    it('rešen kvar se posle 7 dana bez potvrde sam zatvara', async () => {
      const stari = await doStatusa('resen');
      const skori = await doStatusa('resen');
      await t.baza.query(
        `UPDATE kvar SET "datumResenja" = now() - interval '8 days' WHERE id = $1`,
        [stari],
      );
      await t.app.get(KvarAkcijeService).zatvoriNepotvrdjene();
      expect((await detalj(stari)).status).toBe('zatvoren');
      expect((await detalj(skori)).status).toBe('resen');
      expect((await detalj(stari)).istorija.at(-1)).toMatchObject({
        status: 'zatvoren',
        korisnik: null,
      });
    });
  });

  describe('nedozvoljeni prelazi', () => {
    it.each([
      ['prijavljen', 'dodeli', () => ({ serviserId: serviser.id })],
      ['prijavljen', 'zatvori', undefined],
      ['prihvacen', 'prihvati', undefined],
      ['prihvacen', 'zatvori', undefined],
      ['dodeljen', 'prihvati', undefined],
      ['dodeljen', 'odbij', () => ({ tekst: 'Kasno.' })],
      ['dodeljen', 'zatvori', undefined],
      ['u_toku', 'odbij', () => ({ tekst: 'Kasno.' })],
      ['resen', 'prihvati', undefined],
      ['resen', 'prioritet', () => ({ prioritet: 'hitno' })],
      ['resen', 'dodeli', () => ({ serviserId: drugiServiser.id })],
      ['zatvoren', 'zatvori', undefined],
      ['zatvoren', 'prioritet', () => ({ prioritet: 'hitno' })],
    ] as const)(
      'kvar u statusu %s: upravnik ne može %s',
      async (pocetni, naziv, telo) => {
        const kvar =
          pocetni === 'prijavljen' ? await prijavi() : await doStatusa(pocetni);
        await akcija(z.upravnik, kvar, naziv, telo?.()).expect(409);
        expect((await detalj(kvar)).status).toBe(pocetni);
      },
    );

    it('serviser ne preskače korake i ne radi na završenom kvaru', async () => {
      const dodeljen = await doStatusa('dodeljen');
      await status(dodeljen, 'resen').expect(409);
      const uToku = await doStatusa('u_toku');
      await status(uToku, 'u_toku').expect(409);
      const resen = await doStatusa('resen');
      await status(resen, 'u_toku').expect(409);
      await status(resen, 'resen').expect(409);
      await status(resen, 'zatvoren').expect(400);
      await status(resen, 'prijavljen').expect(400);
    });

    it('potvrda i vraćanje rade samo dok je kvar rešen', async () => {
      const uToku = await doStatusa('u_toku');
      await akcija(z.vlasnik, uToku, 'potvrdi').expect(409);
      await akcija(z.vlasnik, uToku, 'vrati', { tekst: 'Nije.' }).expect(409);
      const zatvoren = await doStatusa('zatvoren');
      await akcija(z.vlasnik, zatvoren, 'vrati', { tekst: 'Nije.' }).expect(
        409,
      );
    });

    it('na završenom kvaru nema novih komentara, slika ni praćenja', async () => {
      const kvar = await doStatusa('zatvoren');
      await kao(t, z.vlasnik)
        .post(`/kvar/${kvar}/komentar`)
        .send({ tekst: 'Kasno.' })
        .expect(409);
      await kao(t, z.vlasnik)
        .post(`/kvar/${kvar}/slika`)
        .attach('slika', await slika(), 'cev.png')
        .expect(409);
      await kao(t, z.sused).put(`/kvar/${kvar}/pracenje`).expect(409);
    });

    it('dva istovremena prihvatanja: uspeva samo jedno', async () => {
      const kvar = await prijavi();
      const odgovori = await Promise.all([
        akcija(z.upravnik, kvar, 'prihvati'),
        akcija(z.upravnik, kvar, 'prihvati'),
      ]);
      expect(odgovori.map((o) => o.status).toSorted((a, b) => a - b)).toEqual([
        200, 409,
      ]);
      expect(
        (await detalj(kvar)).istorija.map((p: { status: string }) => p.status),
      ).toEqual(['prijavljen', 'prihvacen']);
    });
  });

  describe('prijava, odbijanje i povlačenje', () => {
    it('prijava traži naslov, opis i svoj stan', async () => {
      const bezPolja = await kao(t, z.vlasnik)
        .post('/kvar')
        .send({
          ...noviKvar(z.stanovi[0], PRIVATNI_STAN),
          naslov: ' ',
          opis: '',
        })
        .expect(400);
      expect(Object.keys(bezPolja.body.greske).toSorted()).toEqual([
        'naslov',
        'opis',
      ]);
      await kao(t, z.vlasnik)
        .post('/kvar')
        .send(noviKvar(z.stanovi[1], PRIVATNI_STAN))
        .expect(403);
      await kao(t, z.vlasnik)
        .post('/kvar')
        .send({ ...noviKvar(z.stanovi[0], PRIVATNI_STAN), status: 'zatvoren' })
        .expect(400);
    });

    it('kvar u zajedničkom prostoru nije vezan za stan onoga ko ga je prijavio', async () => {
      const zajednicki = await detalj(await prijavi(ZAJEDNICKI_PROSTOR));
      expect(zajednicki.stan).toBeNull();
      const privatni = await detalj(await prijavi(PRIVATNI_STAN));
      expect(privatni.stan.id).toBe(z.stanovi[0]);
    });

    it('odbijanje traži razlog i čuva ga uz promenu statusa', async () => {
      const kvar = await prijavi();
      await akcija(z.upravnik, kvar, 'odbij', { tekst: ' ' }).expect(400);
      const odbijen = await akcija(z.upravnik, kvar, 'odbij', {
        tekst: 'Nije kvar zgrade.',
      }).expect(200);
      expect(odbijen.body.status).toBe('odbijen');
      expect(odbijen.body.istorija.at(-1).komentar.tekst).toBe(
        'Nije kvar zgrade.',
      );
      expect(await obavestenja(z.vlasnik, kvar)).toEqual([
        'Prijava kvara „Curi cev“ je odbijena.',
      ]);
    });

    it('prijavu povlači samo onaj ko ju je podneo, i samo dok nije prihvaćena', async () => {
      const kvar = await prijavi(PRIVATNI_STAN);
      await akcija(z.ukucanin, kvar, 'povuci', {}).expect(403);
      await akcija(z.upravnik, kvar, 'povuci', {}).expect(403);
      const povucen = await akcija(z.vlasnik, kvar, 'povuci', {}).expect(200);
      expect(povucen.body.status).toBe('povucen');

      const prihvacen = await doStatusa('prihvacen');
      await akcija(z.vlasnik, prihvacen, 'povuci', {}).expect(409);
    });

    it('prijava koju drugi prate ne može da se povuče', async () => {
      const kvar = await prijavi();
      await kao(t, z.sused).put(`/kvar/${kvar}/pracenje`).expect(200);
      expect((await detalj(kvar, z.vlasnik)).smeDaPovuce).toBe(false);
      await akcija(z.vlasnik, kvar, 'povuci', {}).expect(409);
      await kao(t, z.sused).delete(`/kvar/${kvar}/pracenje`).expect(200);
      await akcija(z.vlasnik, kvar, 'povuci', {}).expect(200);
    });
  });

  describe('praćenje', () => {
    it('komšija prati kvar u zajedničkom prostoru i dobija obaveštenja', async () => {
      const kvar = await prijavi();
      const prati = await kao(t, z.sused)
        .put(`/kvar/${kvar}/pracenje`)
        .expect(200);
      expect(prati.body).toEqual({ pratim: true, brojPratilaca: 1 });
      await kao(t, z.sused).put(`/kvar/${kvar}/pracenje`).expect(200);
      expect((await detalj(kvar)).brojPratilaca).toBe(1);

      await prihvati(kvar);
      expect(await obavestenja(z.sused, kvar)).toEqual([
        'Upravnik je prihvatio prijavu kvara „Curi cev“.',
      ]);

      const prestao = await kao(t, z.sused)
        .delete(`/kvar/${kvar}/pracenje`)
        .expect(200);
      expect(prestao.body).toEqual({ pratim: false, brojPratilaca: 0 });
      await dodeli(kvar);
      expect(await obavestenja(z.sused, kvar)).toHaveLength(1);
    });

    it('svoj kvar i kvar u stanu se ne prate', async () => {
      const zajednicki = await prijavi();
      await kao(t, z.vlasnik).put(`/kvar/${zajednicki}/pracenje`).expect(403);
      await kao(t, z.upravnik).put(`/kvar/${zajednicki}/pracenje`).expect(403);
      const privatni = await prijavi(PRIVATNI_STAN);
      await kao(t, z.ukucanin).put(`/kvar/${privatni}/pracenje`).expect(403);
      await kao(t, z.sused).put(`/kvar/${privatni}/pracenje`).expect(403);
    });

    it('slični kvarovi su otvoreni kvarovi iste vrste u zajedničkom prostoru zgrade', async () => {
      const moj = await prijavi();
      const pracen = await prijavi(ZAJEDNICKI_PROSTOR, z.sused);
      const struja = await prijavi(ZAJEDNICKI_PROSTOR, z.sused, {
        kategorija: 'struja',
      });
      const privatni = await prijavi(PRIVATNI_STAN, z.sused);
      const resen = await doStatusa('resen');
      await kao(t, z.vlasnik).put(`/kvar/${pracen}/pracenje`).expect(200);

      const odgovor = await kao(t, z.vlasnik)
        .get(`/kvar/slicni?stanId=${z.stanovi[0]}&kategorija=vodovod`)
        .expect(200);
      const slicni = odgovor.body as { id: number; pratim: boolean }[];
      const ids = slicni.map((k) => k.id);
      expect(ids).toEqual(expect.arrayContaining([moj, pracen]));
      expect(ids).not.toContain(struja);
      expect(ids).not.toContain(privatni);
      expect(ids).not.toContain(resen);
      expect(slicni.find((k) => k.id === pracen)?.pratim).toBe(true);
      expect(slicni.find((k) => k.id === moj)?.pratim).toBe(false);
      expect(slicni.length).toBeLessThanOrEqual(5);
    });
  });

  describe('potvrda rešenja', () => {
    it('kvar u stanu potvrđuje bilo ko iz tog stana', async () => {
      const kvar = await doStatusa('resen', PRIVATNI_STAN);
      await akcija(z.sused, kvar, 'potvrdi').expect(403);
      await akcija(z.ukucanin, kvar, 'potvrdi').expect(200);
    });

    it('kvar u zajedničkom prostoru potvrđuje onaj ko ga je prijavio', async () => {
      const kvar = await doStatusa('resen');
      await akcija(z.sused, kvar, 'potvrdi').expect(403);
      await akcija(z.ukucanin, kvar, 'potvrdi').expect(403);
      await akcija(z.ukucanin, kvar, 'vrati', { tekst: 'Nije.' }).expect(403);
      expect((await detalj(kvar, z.sused)).smeDaPotvrdi).toBe(false);
      expect((await detalj(kvar, z.vlasnik)).smeDaPotvrdi).toBe(true);
      await akcija(z.vlasnik, kvar, 'potvrdi').expect(200);
    });

    it('vraćanje na popravku traži razlog i obaveštava servisera i upravnika', async () => {
      const kvar = await doStatusa('resen');
      await akcija(z.vlasnik, kvar, 'vrati', {}).expect(400);
      await akcija(z.vlasnik, kvar, 'vrati', { tekst: 'Opet curi.' }).expect(
        200,
      );
      const poruka = 'Kvar „Curi cev“ nije rešen i vraćen je na popravku.';
      expect(await obavestenja(serviser, kvar)).toContain(poruka);
      expect(await obavestenja(z.upravnik, kvar)).toContain(poruka);
    });
  });

  describe('dodela servisera', () => {
    it('serviser mora da ima struku za vrstu kvara i aktivan nalog', async () => {
      const kvar = await doStatusa('prihvacen');
      const bezStruke = await napraviKorisnika(t, 'BezStruke', {
        uloga: 'serviser' as never,
      });
      const deaktiviran = await napraviServisera(t, 'Deaktiviran');
      await t.baza.query(
        `UPDATE korisnik SET deaktiviran = now() WHERE id = $1`,
        [deaktiviran.id],
      );
      for (const kome of [bezStruke, deaktiviran, z.sused]) {
        await akcija(z.upravnik, kvar, 'dodeli', {
          serviserId: kome.id,
        }).expect(400);
      }
      await akcija(z.upravnik, kvar, 'dodeli', { serviserId: 987654 }).expect(
        400,
      );
      expect((await detalj(kvar)).status).toBe('prihvacen');

      const dostupni = await kao(t, z.upravnik)
        .get('/kvar/serviseri/vodovod')
        .expect(200);
      const ids = dostupni.body.map((s: { id: number }) => s.id);
      expect(ids).toEqual(
        expect.arrayContaining([serviser.id, drugiServiser.id]),
      );
      expect(ids).not.toContain(bezStruke.id);
      expect(ids).not.toContain(deaktiviran.id);
    });

    it('preraspodela oduzima pristup prvom serviseru i briše zakazan dolazak', async () => {
      const kvar = await doStatusa('dodeljen');
      await akcija(serviser, kvar, 'dolazak', { dolazak: zaDana(1) }).expect(
        200,
      );
      await akcija(z.upravnik, kvar, 'dodeli', {
        serviserId: serviser.id,
      }).expect(400);

      await dodeli(kvar, drugiServiser);
      const posle = await detalj(kvar);
      expect(posle).toMatchObject({
        status: 'dodeljen',
        serviser: { id: drugiServiser.id },
        dolazakServisera: null,
      });
      await kao(t, serviser).get(`/kvar/${kvar}`).expect(403);
      await status(kvar, 'u_toku').expect(403);
      await status(kvar, 'u_toku', drugiServiser).expect(200);
      expect(await obavestenja(serviser, kvar)).toContain(
        'Kvar „Curi cev“ je dodeljen drugom serviseru.',
      );
    });

    it('serviser bez te struke se ne nudi posle izmene specijalnosti', async () => {
      const privremeni = await napraviServisera(t, 'Privremeni');
      await t.baza.getRepository(ServiserSpecijalnost).delete({
        korisnik: { id: privremeni.id },
        kategorija: 'vodovod' as never,
      });
      const kvar = await doStatusa('prihvacen');
      await akcija(z.upravnik, kvar, 'dodeli', {
        serviserId: privremeni.id,
      }).expect(400);
    });
  });

  describe('prioritet i dolazak', () => {
    it('prioritet pomera rok rešavanja od datuma prijave', async () => {
      const kvar = await prijavi();
      const rok = async () => {
        const d = await detalj(kvar);
        return (
          (Date.parse(d.rokResavanja) - Date.parse(d.datumPrijave)) / MS_PO_DANU
        );
      };
      expect(await rok()).toBeCloseTo(7, 2);
      await akcija(z.upravnik, kvar, 'prioritet', {
        prioritet: 'hitno',
      }).expect(200);
      expect(await rok()).toBeCloseTo(2, 2);
      await akcija(z.upravnik, kvar, 'prioritet', {
        prioritet: 'nisko',
      }).expect(200);
      expect(await rok()).toBeCloseTo(21, 2);
      await akcija(z.upravnik, kvar, 'prioritet', {
        prioritet: 'odmah',
      }).expect(400);
    });

    it('dolazak mora biti u budućnosti i pre roka', async () => {
      const kvar = await doStatusa('dodeljen');
      const dolazak = (kada: string | null) =>
        akcija(serviser, kvar, 'dolazak', { dolazak: kada });

      await dolazak(zaDana(-1)).expect(400);
      const posleRoka = await dolazak(zaDana(8)).expect(400);
      expect(Object.keys(posleRoka.body.greske)).toEqual(['dolazak']);
      await dolazak('nije datum').expect(400);

      const termin = zaDana(2);
      const zakazan = await dolazak(termin).expect(200);
      expect(zakazan.body.dolazakServisera).toBe(termin);
      expect(await obavestenja(z.vlasnik, kvar)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^Serviser dolazi /)]),
      );
      const otkazan = await dolazak(null).expect(200);
      expect(otkazan.body.dolazakServisera).toBeNull();
    });

    it('dolazak se briše kad je kvar rešen i ne zakazuje se posle toga', async () => {
      const kvar = await doStatusa('u_toku');
      await akcija(serviser, kvar, 'dolazak', { dolazak: zaDana(1) }).expect(
        200,
      );
      const resen = await status(kvar, 'resen').expect(200);
      expect(resen.body.dolazakServisera).toBeNull();
      await akcija(serviser, kvar, 'dolazak', { dolazak: zaDana(1) }).expect(
        409,
      );
    });
  });

  describe('spisak', () => {
    it('deli kvarove na aktivne i završene i filtrira po vrsti i prioritetu', async () => {
      const zatvoren = await doStatusa('zatvoren');
      const resen = await doStatusa('resen');
      const hitan = await prijavi(ZAJEDNICKI_PROSTOR, z.vlasnik, {
        kategorija: 'lift',
        prioritet: 'hitno',
      });
      const ids = async (upit: string) => {
        const odgovor = await kao(t, z.upravnik)
          .get(`/kvar?poStrani=50${upit}`)
          .expect(200);
        return (odgovor.body.stavke as { id: number }[]).map((k) => k.id);
      };

      const aktivni = await ids('');
      expect(aktivni).toEqual(expect.arrayContaining([resen, hitan]));
      expect(aktivni).not.toContain(zatvoren);
      expect(await ids('&stanje=zavrseni')).toContain(zatvoren);
      expect(await ids('&stanje=zavrseni')).not.toContain(resen);
      expect(await ids('&kategorija=lift&prioritet=hitno')).toEqual([hitan]);
      await kao(t, z.upravnik).get('/kvar?stanje=svi').expect(400);
    });

    it('stranice se ne preklapaju, a ukupno broji sve', async () => {
      const prva = await kao(t, z.upravnik)
        .get('/kvar?stanje=zavrseni&poStrani=2&strana=1')
        .expect(200);
      const druga = await kao(t, z.upravnik)
        .get('/kvar?stanje=zavrseni&poStrani=2&strana=2')
        .expect(200);
      const ids = (telo: { stavke: { id: number }[] }) =>
        telo.stavke.map((k) => k.id);
      expect(prva.body.stavke).toHaveLength(2);
      expect(prva.body.ukupno).toBe(druga.body.ukupno);
      expect(prva.body.ukupno).toBeGreaterThan(2);
      expect(
        ids(prva.body).filter((id) => ids(druga.body).includes(id)),
      ).toEqual([]);
      await kao(t, z.upravnik).get('/kvar?strana=0').expect(400);
    });
  });

  describe('komentari i slike', () => {
    it('svoj komentar briše autor, tuđ samo upravnik', async () => {
      const kvar = await prijavi();
      const dodaj = async (akter: Akter) =>
        (
          await kao(t, akter)
            .post(`/kvar/${kvar}/komentar`)
            .send({ tekst: 'Komentar.' })
            .expect(201)
        ).body.id as number;
      const obrisi = (akter: Akter, id: number) =>
        kao(t, akter).delete(`/kvar/${kvar}/komentar/${id}`);

      const prvi = await dodaj(z.vlasnik);
      const drugi = await dodaj(z.sused);
      await obrisi(z.sused, prvi).expect(403);
      await obrisi(z.vlasnik, prvi).expect(204);
      await obrisi(z.upravnik, drugi).expect(204);
      await obrisi(z.upravnik, drugi).expect(404);

      const spisak = await kao(t, z.vlasnik)
        .get(`/kvar/${kvar}/komentar`)
        .expect(200);
      expect(spisak.body.stavke).toEqual([]);
    });

    it('komentar koji je razlog promene statusa autor ne može da obriše', async () => {
      const kvar = await doStatusa('resen');
      const vracen = await akcija(z.vlasnik, kvar, 'vrati', {
        tekst: 'Nije popravljeno.',
      }).expect(200);
      const razlog = vracen.body.istorija.at(-1).komentar.id as number;
      await kao(t, z.vlasnik)
        .delete(`/kvar/${kvar}/komentar/${razlog}`)
        .expect(403);
    });

    it('slika se čuva sa sličicom, briše se sa skladišta i ima ih najviše 5', async () => {
      const kvar = await prijavi();
      const fajl = await slika();
      const dodaj = () =>
        kao(t, z.vlasnik)
          .post(`/kvar/${kvar}/slika`)
          .attach('slika', fajl, 'cev.png');
      const pre = t.skladiste.fajlovi.size;

      const prva = await dodaj().expect(201);
      expect(t.skladiste.fajlovi.size).toBe(pre + 2);
      expect(prva.body.url).toMatch(/^http:\/\/skladiste\.test\/kvarovi\//);
      for (let i = 0; i < 4; i += 1) {
        await dodaj().expect(201);
      }
      await dodaj().expect(400);

      await kao(t, z.sused)
        .delete(`/kvar/${kvar}/slika/${prva.body.id}`)
        .expect(403);
      await kao(t, z.vlasnik)
        .delete(`/kvar/${kvar}/slika/${prva.body.id}`)
        .expect(204);
      expect(t.skladiste.fajlovi.size).toBe(pre + 8);
      const spisak = await kao(t, z.sused)
        .get(`/kvar/${kvar}/slika`)
        .expect(200);
      expect(spisak.body).toHaveLength(4);
    });

    it('prima samo slike, bez obzira na ime i prijavljeni tip fajla', async () => {
      const kvar = await prijavi();
      const posalji = (sadrzaj: Buffer, ime: string, tip: string) =>
        kao(t, z.vlasnik)
          .post(`/kvar/${kvar}/slika`)
          .attach('slika', sadrzaj, { filename: ime, contentType: tip });
      await posalji(pdf(), 'dokument.pdf', 'application/pdf').expect(400);
      await posalji(pdf(), 'lazna.png', 'image/png').expect(400);
      await posalji(
        Buffer.from('<script>alert(1)</script>'),
        'x.png',
        'image/png',
      ).expect(400);
      await kao(t, z.vlasnik).post(`/kvar/${kvar}/slika`).expect(400);
    });
  });
});
