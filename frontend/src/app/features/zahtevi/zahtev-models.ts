import { UpitStrane } from '../../shared/stranica';
import { StanOsnovno, ZgradaOsnovno } from '../zgrade/zgrada-models';

export type StatusZahteva = 'na_cekanju' | 'prihvacen' | 'odbijen';

export const NAZIVI_STATUSA_ZAHTEVA: Record<StatusZahteva, string> = {
  na_cekanju: 'Na čekanju',
  prihvacen: 'Prihvaćen',
  odbijen: 'Odbijen',
};

export interface ZahtevResponse {
  id: number;
  status: StatusZahteva;
  datumPodnosenjaZahteva: string;
  stan: StanOsnovno & { zgrada: ZgradaOsnovno };
}

export interface CreateZahtevRequest {
  stanId: number;
}

export interface PodnosilacZahteva {
  id: number;
  ime: string;
  prezime: string;
  email: string;
  telefon: string;
}

export interface ZahtevUpravnika extends ZahtevResponse {
  korisnik: PodnosilacZahteva;
}

export interface StranicaZahteva {
  stavke: ZahtevUpravnika[];
  ukupno: number;
}

export interface UpitZahteva extends UpitStrane {
  status?: StatusZahteva;
}

export interface ObradaZahtevaRequest {
  status: 'prihvacen' | 'odbijen';
  vlasnik?: boolean;
}

export type FilterZahteva = 'na_cekanju' | 'svi';
