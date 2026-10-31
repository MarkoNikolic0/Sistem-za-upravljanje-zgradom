export interface KontaktZgrade {
  id: number;
  naziv: string;
  uloga: string;
  telefon: string;
}

export type KontaktRequest = Omit<KontaktZgrade, 'id'>;

export interface HitnaSluzba {
  broj: string;
  naziv: string;
  ikonica: string;
}

export const HITNE_SLUZBE: HitnaSluzba[] = [
  { broj: '192', naziv: 'Policija', ikonica: 'pi pi-shield' },
  { broj: '193', naziv: 'Vatrogasci', ikonica: 'pi pi-exclamation-triangle' },
  { broj: '194', naziv: 'Hitna pomoć', ikonica: 'pi pi-heart' },
];

export const PREDLOZI_ULOGA = [
  'Upravnik zgrade',
  'Domar',
  'Servis lifta',
  'Vodovod',
  'Elektrodistribucija',
  'Vodoinstalater',
  'Električar',
  'Grejanje',
  'Interfon',
  'Čišćenje',
];
