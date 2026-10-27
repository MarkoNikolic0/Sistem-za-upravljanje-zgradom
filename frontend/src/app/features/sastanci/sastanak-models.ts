import { KorisnikOsnovno } from '../auth/auth-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { Glasanje } from '../glasanje/glasanje-models';
import { UpitStrane } from '../../shared/stranica';

export type VrstaSastanka = 'skupstina' | 'zbor';
export type StanjeSastanka = 'predstojeci' | 'odrzani';

export const MAKS_NASLOV = 200;
export const MAKS_OPIS = 1000;
export const MAKS_LOKACIJA = 200;
export const MAKS_TACKA = 200;
export const NAJVISE_TACAKA = 20;

export const VRSTE_SASTANKA: Record<VrstaSastanka, { naziv: string; opis: string }> = {
  skupstina: {
    naziv: 'Skupština',
    opis: 'Sednica skupštine stambene zajednice. Dolaze vlasnici, a uz tačku može da ide odluka za glasanje.',
  },
  zbor: {
    naziv: 'Zbor stanara',
    opis: 'Dogovor svih koji žive u zgradi, bez glasanja o odlukama.',
  },
};

export interface TackaDnevnogReda {
  id: number;
  redniBroj: number;
  naslov: string;
  opis: string | null;
  odluka?: Glasanje | null;
}

export interface Sastanak {
  id: number;
  vrsta: VrstaSastanka;
  naslov: string;
  opis: string | null;
  pocetak: string;
  lokacija: string;
  hitno: boolean;
  datumOtkazivanja: string | null;
  razlogOtkazivanja: string | null;
  zgrada: ZgradaOsnovno;
  organizator: KorisnikOsnovno | null;
  tacke: TackaDnevnogReda[];
  otkazan: boolean;
  smeDaMenja: boolean;
  smeDaOtkaze: boolean;
}

export interface SastanakRequest {
  vrsta: VrstaSastanka;
  naslov: string;
  opis?: string;
  pocetak: Date;
  lokacija: string;
  hitno: boolean;
  tacke: { naslov: string; odlukaId?: number }[];
}

export interface NoviSastanakRequest extends SastanakRequest {
  zgradaId: number;
}

export interface UpitSastanaka extends UpitStrane {
  stanje: StanjeSastanka;
  zgradaId: number | null;
}
