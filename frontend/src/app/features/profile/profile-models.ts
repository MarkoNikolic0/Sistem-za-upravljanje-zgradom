import { KorisnikResponse } from '../auth/auth-models';
import { StanOsnovno, ZgradaOsnovno } from '../zgrade/zgrada-models';

export interface StanKorisnika extends StanOsnovno {
  vlasnik: boolean;
  zgrada: ZgradaOsnovno;
}

export interface ProfileResponse extends KorisnikResponse {
  upravlja: ZgradaOsnovno[];
  stanovi: StanKorisnika[];
}

export interface UpdateProfileRequest {
  ime?: string;
  prezime?: string;
  telefon?: string;
}
