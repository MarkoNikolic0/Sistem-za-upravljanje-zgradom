import { KorisnikOsnovno } from '../auth/auth-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { UpitStrane } from '../../shared/stranica';

export type StanjeGlasanja = 'aktivna' | 'zavrsena';

export const MAKS_PITANJE = 200;
export const MAKS_OPIS = 1000;
export const MAKS_OPCIJA_TEKST = 100;
export const NAJMANJE_OPCIJA = 2;
export const NAJVISE_OPCIJA = 10;

export interface OpcijaGlasanja {
  id: number;
  tekst: string;
  brojGlasova: number | null;
}

export interface Glasanje {
  id: number;
  vrsta: 'anketa' | 'odluka';
  pitanje: string;
  opis: string | null;
  rok: string;
  zatvorenoRanije: boolean;
  zgrada: ZgradaOsnovno;
  kreirao: KorisnikOsnovno | null;
  datumKreiranja: string;
  opcije: OpcijaGlasanja[];
  mojGlas: number | null;
  brojGlasaca: number;
  brojStanara: number;
  zavrseno: boolean;
  smeDaGlasa: boolean;
  smeDaZatvori: boolean;
  smeDaObrise: boolean;
}

export interface NovaAnketaRequest {
  pitanje: string;
  opis?: string;
  opcije: string[];
  rok: Date;
  zgradaId: number;
}

export interface UpitGlasanja extends UpitStrane {
  stanje: StanjeGlasanja;
  zgradaId: number | null;
}
