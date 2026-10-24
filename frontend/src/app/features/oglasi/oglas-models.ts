import { KorisnikOsnovno } from '../auth/auth-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { UpitStrane } from '../../shared/stranica';

export type VrstaOglasa =
  'obavestenje' | 'radovi' | 'prodaja' | 'trazim' | 'izgubljeno' | 'upozorenje' | 'ostalo';

export interface OpisVrste {
  naziv: string;
  ikonica: string;
  pomoc: string;
}

export const VRSTE_OGLASA: Record<VrstaOglasa, OpisVrste> = {
  obavestenje: {
    naziv: 'Obaveštenje',
    ikonica: 'pi pi-megaphone',
    pomoc: 'Sastanak, isključenje vode ili struje, čišćenje, kućni red.',
  },
  radovi: {
    naziv: 'Radovi i buka',
    ikonica: 'pi pi-hammer',
    pomoc: 'Renoviranje, bušenje, selidba, proslava. Napiši dan i vreme.',
  },
  prodaja: {
    naziv: 'Prodajem / poklanjam',
    ikonica: 'pi pi-tag',
    pomoc: 'Šta nudiš, u kakvom je stanju i kako da te komšije nađu.',
  },
  trazim: {
    naziv: 'Tražim / preporuka',
    ikonica: 'pi pi-search',
    pomoc: 'Majstor, pozajmica alata, čuvanje ljubimca.',
  },
  izgubljeno: {
    naziv: 'Izgubljeno-nađeno',
    ikonica: 'pi pi-key',
    pomoc: 'Ključevi, ljubimac, paket. Napiši gde i kada.',
  },
  upozorenje: {
    naziv: 'Upozorenje',
    ikonica: 'pi pi-exclamation-triangle',
    pomoc: 'Otvorena ulazna vrata, sumnjive osobe, blokiran ulaz ili garaža.',
  },
  ostalo: {
    naziv: 'Ostalo',
    ikonica: 'pi pi-comment',
    pomoc: 'Sve što komšije treba da znaju.',
  },
};

export const MAKS_NASLOV_OGLASA = 100;
export const MAKS_TEKST_OGLASA = 2000;

export interface PrilogOglasa {
  id: number;
  naziv: string;
  tip: string;
  velicina: number;
  url: string;
  urlSlicice: string | null;
  datumOtpremanja: string;
}

export interface Oglas {
  id: number;
  naslov: string;
  tekst: string;
  vrsta: VrstaOglasa;
  vazno: boolean;
  vaziDo: string | null;
  isteklo: boolean;
  zgrada: ZgradaOsnovno;
  autor: KorisnikOsnovno;
  datumKreiranja: string;
  datumIzmene: string | null;
  datumSakrivanja: string | null;
  razlogSakrivanja: string | null;
  prilozi: PrilogOglasa[];
  smeDaObnovi: boolean;
  smeDaMenja: boolean;
  smeDaObrise: boolean;
  smeDaSakrije: boolean;
}

export interface OglasRequest {
  naslov: string;
  tekst: string;
  vrsta: VrstaOglasa;
  vazno: boolean;
  vaziDo: Date | null;
}

export interface NoviOglasRequest extends OglasRequest {
  zgradaId: number;
}

export interface UpitOglasa extends UpitStrane {
  vrsta: VrstaOglasa | null;
  zgradaId: number | null;
}
