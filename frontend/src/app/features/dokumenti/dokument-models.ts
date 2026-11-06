import { PravilaFajlova } from '../../shared/fajlovi/fajlovi';

export type KategorijaDokumenta =
  'pravila' | 'zapisnik' | 'odluka' | 'odrzavanje' | 'ugovor' | 'ostalo';

export interface DokumentZgrade {
  id: number;
  naziv: string;
  kategorija: KategorijaDokumenta;
  samoVlasnici: boolean;
  tip: string;
  velicina: number;
  datumOtpremanja: string;
  url: string;
}

export type DokumentRequest = Pick<DokumentZgrade, 'naziv' | 'kategorija' | 'samoVlasnici'>;

export interface OpisKategorije {
  kategorija: KategorijaDokumenta;
  naziv: string;
  opis: string;
  ikonica: string;
  samoVlasnici: boolean;
}

export const KATEGORIJE_DOKUMENATA: OpisKategorije[] = [
  {
    kategorija: 'pravila',
    naziv: 'Pravila i kućni red',
    opis: 'Pravila vlasnika, kućni red, uputstva',
    ikonica: 'pi pi-book',
    samoVlasnici: false,
  },
  {
    kategorija: 'zapisnik',
    naziv: 'Zapisnici',
    opis: 'Zapisnici sa sednica skupštine',
    ikonica: 'pi pi-file-edit',
    samoVlasnici: true,
  },
  {
    kategorija: 'odluka',
    naziv: 'Odluke',
    opis: 'Potpisane odluke skupštine',
    ikonica: 'pi pi-verified',
    samoVlasnici: true,
  },
  {
    kategorija: 'odrzavanje',
    naziv: 'Održavanje',
    opis: 'Program održavanja, izveštaj upravnika, atesti',
    ikonica: 'pi pi-wrench',
    samoVlasnici: false,
  },
  {
    kategorija: 'ugovor',
    naziv: 'Ugovori',
    opis: 'Upravnik, servisi, čišćenje, osiguranje',
    ikonica: 'pi pi-briefcase',
    samoVlasnici: true,
  },
  {
    kategorija: 'ostalo',
    naziv: 'Ostalo',
    opis: 'Sve što ne spada u ostale',
    ikonica: 'pi pi-folder',
    samoVlasnici: false,
  },
];

export function opisKategorije(kategorija: KategorijaDokumenta): OpisKategorije {
  return KATEGORIJE_DOKUMENATA.find((k) => k.kategorija === kategorija)!;
}

export const PRAVILA_DOKUMENTA: PravilaFajlova = {
  tipovi: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  opisTipova: 'PDF, JPG, PNG ili WEBP',
  maksMb: 10,
  maksBroj: 1,
  vlasnik: 'Dokument',
  mnozina: 'fajl',
};

export const MAKS_NAZIVA_DOKUMENTA = 120;
export const DOKUMENATA_NA_POCETNOJ = 2;
export const DOKUMENATA_PO_STRANI = 50;
export const OSVEZI_LINKOVE_MS = 50 * 60_000;
