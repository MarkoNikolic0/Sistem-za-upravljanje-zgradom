import { KorisnikResponse } from '../auth/auth-models';

export interface ZgradaOsnovno {
  id: number;
  naziv: string;
  adresa: string;
}

export interface StanKorisnika {
  id: number;
  broj: string;
  sprat: number;
  vlasnik: boolean;
  zgrada: ZgradaOsnovno;
}

export interface ProfileResponse extends KorisnikResponse {
  zgrada: ZgradaOsnovno | null;
  stanovi: StanKorisnika[];
}

export interface UpdateProfileRequest {
  ime?: string;
  prezime?: string;
  telefon?: string;
}
