export type Uloga = 'stanar' | 'upravnik' | 'serviser' | 'admin';

export const NAZIVI_ULOGA: Record<Uloga, string> = {
  stanar: 'Stanar',
  upravnik: 'Upravnik',
  serviser: 'Serviser',
  admin: 'Administrator',
};

export interface KorisnikOsnovno {
  id: number;
  ime: string;
  prezime: string;
  uloga: Uloga;
}

export interface Kontakt {
  email: string;
  telefon: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface KorisnikResponse {
  id: number;
  ime: string;
  prezime: string;
  email: string;
  telefon: string;
  uloga: Uloga;
  kreiranDatum: string;
}

export interface RegisterRequest {
  ime: string;
  prezime: string;
  email: string;
  telefon: string;
  lozinka: string;
}

export interface ChangePasswordRequest {
  trenutnaLozinka: string;
  novaLozinka: string;
}
