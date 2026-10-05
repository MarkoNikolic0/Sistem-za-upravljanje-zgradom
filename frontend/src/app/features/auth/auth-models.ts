export type Uloga = 'stanar' | 'upravnik' | 'serviser' | 'admin';

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
