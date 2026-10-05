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
