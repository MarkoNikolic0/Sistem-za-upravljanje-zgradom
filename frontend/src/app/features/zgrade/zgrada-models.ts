import type { KorisnikResponse } from '../auth/auth-models';
import type { Sastanak } from '../sastanci/sastanak-models';

export interface ZgradaOsnovno {
  id: number;
  naziv: string;
  adresa: string;
}

export type ZgradaRequest = Pick<ZgradaOsnovno, 'naziv' | 'adresa'>;

export type Upravnik = Pick<KorisnikResponse, 'id' | 'ime' | 'prezime' | 'email' | 'telefon'>;

export interface ZgradaSaBrojevima extends ZgradaOsnovno {
  brojStanova: number;
  brojStanara: number;
  upravnik: Pick<Upravnik, 'id' | 'ime' | 'prezime'> | null;
  arhivirana: string | null;
}

export interface UpravnikZgrade {
  korisnik: Upravnik | null;
}

export interface PregledZgrade {
  zgrada: Pick<ZgradaOsnovno, 'id' | 'naziv'>;
  zahteviNaCekanju: number;
  noviKvarovi: number;
  hitniKvarovi: number;
  neobjavljeneOdluke: number;
  sledeciSastanak: Pick<Sastanak, 'id' | 'naslov' | 'pocetak' | 'vrsta' | 'hitno'> | null;
}

export interface StanOsnovno {
  id: number;
  broj: string;
  sprat: number;
}

export interface StanRequest {
  broj: string;
  sprat: number;
  kvadratura: number;
}

export const GRANICE_STANA = {
  maksBroja: 10,
  minSprat: -5,
  maksSprat: 99,
  minKvadratura: 1,
  maksKvadratura: 10000,
  maksOdjednom: 200,
} as const;
