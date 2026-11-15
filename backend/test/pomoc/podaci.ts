import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import sharp from 'sharp';
import { REFRESH_COOKIE } from '../../src/auth/refresh-cookie.js';
import { Korisnik } from '../../src/korisnik/korisnik.entity.js';
import { ServiserSpecijalnost } from '../../src/serviser-specijalnost/serviser-specijalnost.entity.js';
import { VrstaGlasanja } from '../../src/shared/enums/glasanje.enums.js';
import {
  KategorijaKvara,
  LokacijaTip,
} from '../../src/shared/enums/kvar.enums.js';
import { VrstaSastanka } from '../../src/shared/enums/sastanak.enums.js';
import { Uloga } from '../../src/shared/enums/uloga.enum.js';
import { VrstaOglasa } from '../../src/shared/enums/vrsta-oglasa.enum.js';
import { MS_PO_DANU } from '../../src/shared/vreme.js';
import { Stan } from '../../src/stan/stan.entity.js';
import { StanarStana } from '../../src/stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../../src/zgrada/zgrada.entity.js';
import { type Akter, kao, type TestAplikacija } from './aplikacija.js';

export const LOZINKA = 'Zgrada123!';
const HES = bcrypt.hashSync(LOZINKA, 4);
const serija = randomUUID().slice(0, 8);
let redniBroj = 0;

export function novEmail(ime: string) {
  redniBroj += 1;
  return `${ime.toLowerCase()}.${serija}.${redniBroj}@test.local`;
}

export const zaDana = (dana: number) =>
  new Date(Date.now() + dana * MS_PO_DANU).toISOString();

export async function prijavi(
  t: TestAplikacija,
  email: string,
  lozinka = LOZINKA,
) {
  const odgovor = await request(t.server)
    .post('/auth/login')
    .send({ email, lozinka })
    .expect(200);
  return {
    token: odgovor.body.accessToken as string,
    kolacic: kolacicSesije(odgovor),
  };
}

export function kolacicSesije(odgovor: request.Response): string {
  const kolacici = odgovor.get('Set-Cookie') ?? [];
  const sesija = kolacici.find((k) => k.startsWith(`${REFRESH_COOKIE}=`));
  if (!sesija) {
    throw new Error('Odgovor nema kolačić sesije.');
  }
  return sesija.split(';')[0];
}

export async function napraviKorisnika(
  t: TestAplikacija,
  ime: string,
  polja: Partial<Korisnik> = {},
): Promise<Akter> {
  const korisnik = await t.baza.getRepository(Korisnik).save({
    ime,
    prezime: 'Probić',
    email: novEmail(ime),
    telefon: '+381641234567',
    lozinka: HES,
    emailPotvrdjen: new Date(),
    ...polja,
  });
  const { token } = await prijavi(t, korisnik.email);
  return { id: korisnik.id, email: korisnik.email, token };
}

export async function napraviZgradu(
  t: TestAplikacija,
  naziv: string,
  brojStanova = 3,
) {
  const zgrada = await t.baza
    .getRepository(Zgrada)
    .save({ naziv: `${naziv} ${serija}`, adresa: `Ulica ${naziv} 1` });
  const stanovi = await t.baza.getRepository(Stan).save(
    Array.from({ length: brojStanova }, (_, i) => ({
      broj: String(i + 1),
      sprat: Math.floor(i / 2),
      kvadratura: 50 + i,
      zgrada: { id: zgrada.id },
    })),
  );
  return { id: zgrada.id, stanovi: stanovi.map((stan) => stan.id) };
}

export async function useli(
  t: TestAplikacija,
  korisnik: Akter,
  stanId: number,
  vlasnik: boolean,
) {
  const veza = await t.baza.getRepository(StanarStana).save({
    korisnik: { id: korisnik.id },
    stan: { id: stanId },
    vlasnik,
  });
  return veza.id;
}

export async function napraviServisera(t: TestAplikacija, ime: string) {
  const serviser = await napraviKorisnika(t, ime, { uloga: Uloga.SERVISER });
  await t.baza.getRepository(ServiserSpecijalnost).save(
    Object.values(KategorijaKvara).map((kategorija) => ({
      korisnik: { id: serviser.id },
      kategorija,
    })),
  );
  return serviser;
}

export interface ZgradaSveta {
  id: number;
  stanovi: number[];
  upravnik: Akter;
  vlasnik: Akter;
  ukucanin: Akter;
  sused: Akter;
  vezaVlasnika: number;
  vezaUkucanina: number;
}

export async function napraviZgraduSaLjudima(
  t: TestAplikacija,
  naziv: string,
  brojStanova = 3,
): Promise<ZgradaSveta> {
  const zgrada = await napraviZgradu(t, naziv, brojStanova);
  const upravnik = await napraviKorisnika(t, `Upravnik${naziv}`, {
    uloga: Uloga.UPRAVNIK,
    zgrada: { id: zgrada.id } as Zgrada,
  });
  const vlasnik = await napraviKorisnika(t, `Vlasnik${naziv}`);
  const ukucanin = await napraviKorisnika(t, `Ukucanin${naziv}`);
  const sused = await napraviKorisnika(t, `Sused${naziv}`);
  const vezaVlasnika = await useli(t, vlasnik, zgrada.stanovi[0], true);
  const vezaUkucanina = await useli(t, ukucanin, zgrada.stanovi[0], false);
  await useli(t, sused, zgrada.stanovi[1], true);
  return {
    ...zgrada,
    upravnik,
    vlasnik,
    ukucanin,
    sused,
    vezaVlasnika,
    vezaUkucanina,
  };
}

export interface Svet {
  a: ZgradaSveta;
  b: ZgradaSveta;
  admin: Akter;
  serviser: Akter;
  bezStana: Akter;
}

export async function napraviSvet(t: TestAplikacija): Promise<Svet> {
  return {
    a: await napraviZgraduSaLjudima(t, 'Alfa'),
    b: await napraviZgraduSaLjudima(t, 'Beta'),
    admin: await napraviKorisnika(t, 'Admin', { uloga: Uloga.ADMIN }),
    serviser: await napraviServisera(t, 'Serviser'),
    bezStana: await napraviKorisnika(t, 'Novajlija'),
  };
}

export async function slika() {
  return await sharp({
    create: { width: 16, height: 16, channels: 3, background: '#778899' },
  })
    .png()
    .toBuffer();
}

export const pdf = () =>
  Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  );

export const noviKvar = (stanId: number, lokacijaTip: LokacijaTip) => ({
  naslov: 'Curi cev',
  opis: 'Voda kaplje iz cevi.',
  kategorija: KategorijaKvara.VODOVOD,
  lokacijaTip,
  stanId,
});

export const novaAnketa = (zgradaId: number) => ({
  pitanje: 'Koju boju ulaza biramo?',
  opcije: ['Siva', 'Zelena'],
  rok: zaDana(5),
  zgradaId,
});

export const novaOdluka = (zgradaId: number, vecina = 'obicna') => ({
  vrsta: VrstaGlasanja.ODLUKA,
  pitanje: 'Da li menjamo lift?',
  vecina,
  rok: zaDana(5),
  zgradaId,
});

export const noviSastanak = (zgradaId: number, vrsta: VrstaSastanka) => ({
  vrsta,
  naslov: vrsta === VrstaSastanka.SKUPSTINA ? 'Redovna skupština' : 'Zbor',
  pocetak: zaDana(10),
  lokacija: 'Ulaz zgrade',
  tacke: [{ naslov: 'Tekuća pitanja' }],
  zgradaId,
});

export const noviOglas = (zgradaId: number, vrsta = VrstaOglasa.PRODAJA) => ({
  naslov: 'Prodajem bicikl',
  tekst: 'Malo vožen.',
  vrsta,
  zgradaId,
});

export const noviKontakt = () => ({
  naziv: 'Lift servis',
  uloga: 'Dežurni majstor',
  telefon: '0641112223',
});

export interface Sadrzaj {
  kvarStan: number;
  kvarZajednicki: number;
  kvarServisera: number;
  komentar: number;
  slika: number;
  oglas: number;
  prilog: number;
  obavestenje: number;
  anketa: number;
  opcijaAnkete: number;
  odluka: number;
  opcijaOdluke: number;
  zbor: number;
  skupstina: number;
  dokument: number;
  dokumentVlasnika: number;
  kontakt: number;
  zahtev: number;
  notifikacija: number;
}

export async function napraviSadrzaj(
  t: TestAplikacija,
  svet: Svet,
  zgrada: ZgradaSveta,
): Promise<Sadrzaj> {
  const { upravnik, vlasnik } = zgrada;
  const stanId = zgrada.stanovi[0];
  const id = async (zahtev: request.Test, status = 201) =>
    (await zahtev.expect(status)).body.id as number;

  const kvarStan = await id(
    kao(t, vlasnik)
      .post('/kvar')
      .send(noviKvar(stanId, LokacijaTip.PRIVATNI_STAN)),
  );
  const kvarZajednicki = await id(
    kao(t, vlasnik)
      .post('/kvar')
      .send(noviKvar(stanId, LokacijaTip.ZAJEDNICKI_PROSTOR)),
  );
  const kvarServisera = await id(
    kao(t, vlasnik)
      .post('/kvar')
      .send(noviKvar(stanId, LokacijaTip.ZAJEDNICKI_PROSTOR)),
  );
  await kao(t, upravnik).patch(`/kvar/${kvarServisera}/prihvati`).expect(200);
  await kao(t, upravnik)
    .patch(`/kvar/${kvarServisera}/dodeli`)
    .send({ serviserId: svet.serviser.id })
    .expect(200);
  const komentar = await id(
    kao(t, vlasnik)
      .post(`/kvar/${kvarZajednicki}/komentar`)
      .send({ tekst: 'Kaplje i dalje.' }),
  );
  const slikaKvara = await id(
    kao(t, vlasnik)
      .post(`/kvar/${kvarZajednicki}/slika`)
      .attach('slika', await slika(), 'cev.png'),
  );

  const oglas = await id(
    kao(t, vlasnik).post('/oglas').send(noviOglas(zgrada.id)),
  );
  const saPrilogom = await kao(t, vlasnik)
    .post(`/oglas/${oglas}/prilog`)
    .attach('prilog', await slika(), 'bicikl.png')
    .expect(201);
  const prilog = saPrilogom.body.id as number;
  const obavestenje = await id(
    kao(t, upravnik)
      .post('/oglas')
      .send(noviOglas(zgrada.id, VrstaOglasa.OBAVESTENJE)),
  );

  const anketa = await kao(t, upravnik)
    .post('/glasanje')
    .send(novaAnketa(zgrada.id))
    .expect(201);
  const odluka = await kao(t, upravnik)
    .post('/glasanje')
    .send(novaOdluka(zgrada.id))
    .expect(201);

  const zbor = await id(
    kao(t, upravnik)
      .post('/sastanak')
      .send(noviSastanak(zgrada.id, VrstaSastanka.ZBOR)),
  );
  const skupstina = await id(
    kao(t, upravnik)
      .post('/sastanak')
      .send(noviSastanak(zgrada.id, VrstaSastanka.SKUPSTINA)),
  );

  const okaciDokument = (naziv: string, samoVlasnici: boolean) =>
    id(
      kao(t, upravnik)
        .post(`/zgrada/${zgrada.id}/dokument`)
        .field('naziv', naziv)
        .field('kategorija', 'pravila')
        .field('samoVlasnici', String(samoVlasnici))
        .attach('fajl', pdf(), 'dokument.pdf'),
    );
  const dokument = await okaciDokument('Kućni red', false);
  const dokumentVlasnika = await okaciDokument('Ugovor o održavanju', true);

  const kontakt = await id(
    kao(t, upravnik).post(`/zgrada/${zgrada.id}/kontakt`).send(noviKontakt()),
  );
  const zahtev = await id(
    kao(t, svet.bezStana)
      .post('/zahtev-povezivanje')
      .send({ stanId: zgrada.stanovi[2] }),
  );
  const notifikacije = await kao(t, upravnik).get('/notifikacija').expect(200);

  return {
    kvarStan,
    kvarZajednicki,
    kvarServisera,
    komentar,
    slika: slikaKvara,
    oglas,
    prilog,
    obavestenje,
    anketa: anketa.body.id,
    opcijaAnkete: anketa.body.opcije[0].id,
    odluka: odluka.body.id,
    opcijaOdluke: odluka.body.opcije[0].id,
    zbor,
    skupstina,
    dokument,
    dokumentVlasnika,
    kontakt,
    zahtev,
    notifikacija: notifikacije.body.stavke[0].id,
  };
}
