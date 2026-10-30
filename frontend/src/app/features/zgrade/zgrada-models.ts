import type { Sastanak } from '../sastanci/sastanak-models';

export interface ZgradaOsnovno {
  id: number;
  naziv: string;
  adresa: string;
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
