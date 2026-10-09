import { UpitStrane } from '../../shared/stranica';
import { Kontakt, KorisnikOsnovno } from '../auth/auth-models';
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

export interface ZahtevUpravnika extends ZahtevResponse {
  korisnik: KorisnikOsnovno & Kontakt;
}

export interface UpitZahteva extends UpitStrane {
  status?: StatusZahteva;
}

export interface ObradaZahtevaRequest {
  status: 'prihvacen' | 'odbijen';
  vlasnik?: boolean;
}

export type FilterZahteva = 'na_cekanju' | 'svi';
