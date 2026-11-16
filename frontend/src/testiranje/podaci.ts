import { KorisnikOsnovno } from '../app/features/auth/auth-models';
import { KvarDetalj } from '../app/features/kvarovi/kvar-models';
import { Glasanje } from '../app/features/glasanje/glasanje-models';
import { Oglas } from '../app/features/oglasi/oglas-models';
import { Sastanak } from '../app/features/sastanci/sastanak-models';
import { PregledZgrade } from '../app/features/zgrade/zgrada-models';

export const SADA = new Date(2026, 5, 10, 12, 0);

export function zaDanaU(dana: number, sat = 12, minut = 0): string {
  return new Date(
    SADA.getFullYear(),
    SADA.getMonth(),
    SADA.getDate() + dana,
    sat,
    minut,
  ).toISOString();
}

const zgrada = { id: 1, naziv: 'Delta', adresa: 'Bulevar 1' };
const korisnik: KorisnikOsnovno = {
  id: 10,
  ime: 'Danijel',
  prezime: 'Petrović',
  uloga: 'upravnik',
};

export function glasanje(izmene: Partial<Glasanje> = {}): Glasanje {
  return {
    id: 1,
    vrsta: 'anketa',
    vecina: null,
    pitanje: 'Boja ulaza',
    opis: null,
    rok: zaDanaU(5),
    zatvorenoRanije: false,
    zgrada,
    kreirao: korisnik,
    datumKreiranja: zaDanaU(-1),
    opcije: [],
    mojGlas: null,
    glasaliSuvlasnici: [],
    brojGlasaca: 0,
    brojZa: null,
    ukupnoGlasaca: 20,
    zavrseno: false,
    ishod: null,
    pragovi: null,
    oglasId: null,
    sastanak: null,
    smeDaGlasa: true,
    smeDaZatvori: false,
    smeDaObrise: false,
    smeDaObjavi: false,
    ...izmene,
  };
}

export function oglas(izmene: Partial<Oglas> = {}): Oglas {
  return {
    id: 1,
    naslov: 'Prodajem bicikl',
    tekst: 'Malo korišćen',
    vrsta: 'prodaja',
    vazno: false,
    vaziDo: null,
    isteklo: false,
    zgrada,
    autor: korisnik,
    datumKreiranja: zaDanaU(-1),
    datumIzmene: null,
    datumSakrivanja: null,
    razlogSakrivanja: null,
    prilozi: [],
    smeDaObnovi: false,
    smeDaMenja: false,
    smeDaObrise: false,
    smeDaSakrije: false,
    ...izmene,
  };
}

export function sastanak(izmene: Partial<Sastanak> = {}): Sastanak {
  return {
    id: 1,
    vrsta: 'skupstina',
    naslov: 'Redovna skupština',
    opis: null,
    pocetak: zaDanaU(5, 18),
    lokacija: 'Ulaz',
    hitno: false,
    datumOtkazivanja: null,
    razlogOtkazivanja: null,
    zgrada,
    organizator: korisnik,
    tacke: [],
    otkazan: false,
    smeDaMenja: false,
    smeDaOtkaze: false,
    ...izmene,
  };
}

export function pregled(izmene: Partial<PregledZgrade> = {}): PregledZgrade {
  return {
    zgrada,
    zahteviNaCekanju: 0,
    noviKvarovi: 0,
    hitniKvarovi: 0,
    neobjavljeneOdluke: 0,
    sledeciSastanak: null,
    sastanakBezZapisnika: null,
    ...izmene,
  };
}

export function kvar(izmene: Partial<KvarDetalj> = {}): KvarDetalj {
  return {
    id: 1,
    naslov: 'Curi slavina',
    opis: 'U kupatilu',
    kategorija: 'vodovod',
    lokacijaTip: 'privatni_stan',
    prioritet: 'srednje',
    status: 'prijavljen',
    datumPrijave: zaDanaU(-1),
    datumResenja: null,
    rokResavanja: zaDanaU(6),
    dolazakServisera: null,
    brojPratilaca: 0,
    zgrada,
    stan: null,
    korisnik,
    serviser: null,
    smeDaUpravlja: false,
    smeDaPotvrdi: false,
    smeDaPrati: false,
    smeDaPovuce: false,
    pratim: false,
    rokPotvrde: null,
    istorija: [],
    ...izmene,
  };
}
