import { StanOsnovno, ZgradaOsnovno } from '../zgrade/zgrada-models';
import { UpitStrane } from '../../shared/stranica';
import { Kontakt, KorisnikOsnovno } from '../auth/auth-models';
import { Poruka } from '../../shared/poruka';

export type StatusKvara =
  'prijavljen' | 'prihvacen' | 'dodeljen' | 'u_toku' | 'resen' | 'zatvoren' | 'odbijen' | 'povucen';

export type KategorijaKvara =
  'vodovod' | 'struja' | 'lift' | 'grejanje' | 'gradjevina' | 'stolarija' | 'ciscenje' | 'ostalo';

export type LokacijaKvara = 'zajednicki_prostor' | 'privatni_stan';

export type PrioritetKvara = 'nisko' | 'srednje' | 'hitno';

export type StanjeKvara = 'aktivni' | 'zavrseni';

export const NAZIVI_STATUSA_KVARA: Record<StatusKvara, string> = {
  prijavljen: 'Prijavljen',
  prihvacen: 'Prihvaćen',
  dodeljen: 'Dodeljen serviseru',
  u_toku: 'U toku',
  resen: 'Rešen',
  zatvoren: 'Zatvoren',
  odbijen: 'Odbijen',
  povucen: 'Povučen',
};

export const NAZIVI_PRIORITETA_KVARA: Record<PrioritetKvara, string> = {
  nisko: 'Nisko',
  srednje: 'Srednje',
  hitno: 'Hitno',
};

export const DANA_ZA_RESAVANJE: Record<PrioritetKvara, number> = {
  hitno: 2,
  srednje: 7,
  nisko: 21,
};

export type StatusRadaServisera = Extract<StatusKvara, 'u_toku' | 'resen'>;

export const NAZIVI_KATEGORIJA_KVARA: Record<KategorijaKvara, string> = {
  vodovod: 'Vodovod',
  struja: 'Struja',
  lift: 'Lift',
  grejanje: 'Grejanje',
  gradjevina: 'Građevina',
  stolarija: 'Stolarija',
  ciscenje: 'Čišćenje',
  ostalo: 'Ostalo',
};

export interface Kvar {
  id: number;
  naslov: string;
  opis: string;
  kategorija: KategorijaKvara;
  lokacijaTip: LokacijaKvara;
  prioritet: PrioritetKvara;
  status: StatusKvara;
  datumPrijave: string;
  datumResenja: string | null;
  rokResavanja: string;
  dolazakServisera: string | null;
  brojPratilaca: number;
  zgrada: ZgradaOsnovno;
  stan: StanOsnovno | null;
  korisnik: KorisnikOsnovno & Partial<Kontakt>;
  serviser: (KorisnikOsnovno & Partial<Kontakt>) | null;
}

export interface PromenaStatusaKvara {
  id: number;
  status: StatusKvara;
  datum: string;
  korisnik: KorisnikOsnovno | null;
  komentar: Pick<KomentarKvara, 'id' | 'tekst'> | null;
}

export interface KvarDetalj extends Kvar {
  smeDaUpravlja: boolean;
  smeDaPotvrdi: boolean;
  smeDaPrati: boolean;
  smeDaPovuce: boolean;
  pratim: boolean;
  rokPotvrde: string | null;
  istorija: PromenaStatusaKvara[];
}

export interface StanjePracenja {
  pratim: boolean;
  brojPratilaca: number;
}

export type SlicanKvar = Pick<
  Kvar,
  'id' | 'naslov' | 'status' | 'datumPrijave' | 'brojPratilaca' | 'korisnik'
> &
  Pick<StanjePracenja, 'pratim'>;

export interface UpitSlicnih {
  stanId: number;
  kategorija: KategorijaKvara;
}

export interface UpitKvarova extends UpitStrane {
  stanje: StanjeKvara;
  kategorija: KategorijaKvara | null;
  prioritet: PrioritetKvara | null;
  zgradaId: number | null;
}

export const MAKS_NASLOV_KVARA = 100;
export const MAKS_OPIS_KVARA = 2000;

export interface PrijavaKvaraRequest {
  naslov: string;
  opis: string;
  kategorija: KategorijaKvara;
  lokacijaTip: LokacijaKvara;
  stanId: number;
  prioritet?: PrioritetKvara;
}

export const MAKS_KOMENTAR_KVARA = 1000;

export interface KomentarKvara {
  id: number;
  tekst: string;
  datumKreiranja: string;
  korisnik: KorisnikOsnovno;
}

export interface SlikaKvara {
  id: number;
  url: string;
  urlSlicice: string;
  datumOtpremanja: string;
  korisnik: KorisnikOsnovno | null;
}

export interface PorukaAkcije extends Poruka {
  fokus: boolean;
}

export interface StanjeNavigacijeKvara {
  poruka?: PorukaAkcije;
}
