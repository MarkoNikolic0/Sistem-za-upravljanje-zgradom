import { IsNull, Not } from 'typeorm';

export const POTVRDJEN_EMAIL = { emailPotvrdjen: Not(IsNull()) };

export const AKTIVAN_KORISNIK = {
  deaktiviran: IsNull(),
  ...POTVRDJEN_EMAIL,
};
