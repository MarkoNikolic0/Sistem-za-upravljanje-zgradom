export type Uloga = 'stanar' | 'upravnik' | 'serviser' | 'admin';

export interface LoginResponse {
  accessToken: string;
}

export interface KorisnikResponse {
  id: number;
  ime: string;
  prezime: string;
  email: string;
  uloga: Uloga;
  kreiranDatum: string;
}
