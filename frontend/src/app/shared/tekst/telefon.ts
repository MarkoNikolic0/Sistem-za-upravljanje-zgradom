import { parsePhoneNumberWithError } from 'libphonenumber-js/min';

export function formatirajTelefon(telefon: string): string {
  try {
    return parsePhoneNumberWithError(telefon).formatNational();
  } catch {
    return telefon;
  }
}
