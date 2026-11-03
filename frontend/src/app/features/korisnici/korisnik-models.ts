import type { KorisnikOsnovno, Uloga } from '../auth/auth-models';
import type { KategorijaKvara } from '../kvarovi/kvar-models';
import type { ZgradaOsnovno } from '../zgrade/zgrada-models';
import type { UpitStrane } from '../../shared/liste/stranica';

export interface KorisnikPretrage extends KorisnikOsnovno {
  email: string;
  zgrada: Pick<ZgradaOsnovno, 'id' | 'naziv'> | null;
}

export interface StanKorisnika {
  id: number;
  broj: string;
  vlasnik: boolean;
  zgrada: Pick<ZgradaOsnovno, 'id' | 'naziv'>;
}

export interface KorisnikSistema extends KorisnikPretrage {
  telefon: string;
  deaktiviran: string | null;
  stanovi: StanKorisnika[];
  specijalnosti: KategorijaKvara[];
}

export type StanjeNaloga = 'aktivni' | 'deaktivirani';

export type DodeljivaUloga = Extract<Uloga, 'stanar' | 'serviser'>;

export interface UpitKorisnika extends UpitStrane {
  pretraga?: string;
  uloga?: Uloga;
  stanje: StanjeNaloga;
}
