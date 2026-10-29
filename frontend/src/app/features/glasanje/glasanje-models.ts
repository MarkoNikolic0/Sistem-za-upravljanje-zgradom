import { KorisnikOsnovno } from '../auth/auth-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { UpitStrane } from '../../shared/stranica';

export type StanjeGlasanja = 'aktivna' | 'zavrsena';

export type VrstaGlasanja = 'anketa' | 'odluka';
export type VecinaOdluke = 'obicna' | 'dve_trecine';
export type IshodOdluke = 'usvojena' | 'odbijena' | 'nema_kvoruma';

export const MAKS_PITANJE = 200;
export const MAKS_OPIS = 1000;
export const MAKS_OPCIJA_TEKST = 100;
export const NAJMANJE_OPCIJA = 2;
export const NAJVISE_OPCIJA = 10;

export const VRSTE_GLASANJA: Record<VrstaGlasanja, { naziv: string; opis: string }> = {
  anketa: {
    naziv: 'Anketa',
    opis: 'Mišljenje komšija. Glasaju svi stanari, jednom po osobi, a opcije unosiš ti.',
  },
  odluka: {
    naziv: 'Odluka',
    opis: 'Odluka skupštine. Glasaju vlasnici, jedan glas po stanu: Za, Protiv ili Uzdržan.',
  },
};

export const VECINE_ODLUKE: Record<VecinaOdluke, { naziv: string; opis: string }> = {
  obicna: {
    naziv: 'Obična većina',
    opis: 'Za je više od pola glasova, a glasa više od pola stanova. Za radove, održavanje i kućni red.',
  },
  dve_trecine: {
    naziv: '2/3 svih stanova',
    opis: 'Za glasaju 2/3 svih stanova zgrade. Za raspolaganje zajedničkim delovima, profesionalnog upravnika i kredit.',
  },
};

export const ISHODI_ODLUKE: Record<IshodOdluke, string> = {
  usvojena: 'Usvojena',
  odbijena: 'Nije usvojena',
  nema_kvoruma: 'Nema kvoruma',
};

export interface PragoviOdluke {
  kvorum: number;
  potrebnoZa: number;
}

export interface OpcijaGlasanja {
  id: number;
  tekst: string;
  brojGlasova: number | null;
}

export interface Glasanje {
  id: number;
  vrsta: VrstaGlasanja;
  vecina: VecinaOdluke | null;
  pitanje: string;
  opis: string | null;
  rok: string;
  zatvorenoRanije: boolean;
  zgrada: ZgradaOsnovno;
  kreirao: KorisnikOsnovno | null;
  datumKreiranja: string;
  opcije: OpcijaGlasanja[];
  mojGlas: number | null;
  glasaliSuvlasnici: string[];
  brojGlasaca: number;
  brojZa: number | null;
  ukupnoGlasaca: number;
  zavrseno: boolean;
  ishod: IshodOdluke | null;
  pragovi: PragoviOdluke | null;
  oglasId: number | null;
  smeDaGlasa: boolean;
  smeDaZatvori: boolean;
  smeDaObrise: boolean;
  smeDaObjavi: boolean;
}

// Odluka u izboru uz tačku dnevnog reda sastanka
export interface OdlukaZgrade {
  id: number;
  pitanje: string;
  rok: string;
  zavrseno: boolean;
}

export interface NovoGlasanjeRequest {
  vrsta: VrstaGlasanja;
  pitanje: string;
  opis?: string;
  opcije?: string[];
  vecina?: VecinaOdluke;
  rok: Date;
  zgradaId: number;
}

export interface UpitGlasanja extends UpitStrane {
  stanje: StanjeGlasanja;
  zgradaId: number | null;
}
