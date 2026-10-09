import { StanOsnovno, ZgradaOsnovno } from '../zgrade/zgrada-models';
import { UpitStrane } from '../../shared/stranica';

export type StatusKvara =
  'prijavljen' | 'prihvacen' | 'dodeljen' | 'u_toku' | 'resen' | 'zatvoren' | 'odbijen';

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
};

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

export interface KorisnikOsnovno {
  id: number;
  ime: string;
  prezime: string;
  email?: string;
  telefon?: string;
}

export interface Kvar {
  id: number;
  naslov: string;
  opis: string;
  kategorija: KategorijaKvara;
  lokacijaTip: LokacijaKvara;
  prioritet: PrioritetKvara;
  status: StatusKvara;
  datumPrijave: string;
  zgrada: ZgradaOsnovno;
  stan: StanOsnovno | null;
  korisnik: KorisnikOsnovno;
  serviser: KorisnikOsnovno | null;
}

export interface UpitKvarova extends UpitStrane {
  stanje: StanjeKvara;
}