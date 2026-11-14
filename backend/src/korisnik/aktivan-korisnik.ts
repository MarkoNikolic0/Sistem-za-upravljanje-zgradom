import { IsNull, Not } from 'typeorm';

export const AKTIVAN_KORISNIK = {
  deaktiviran: IsNull(),
  emailPotvrdjen: Not(IsNull()),
};
