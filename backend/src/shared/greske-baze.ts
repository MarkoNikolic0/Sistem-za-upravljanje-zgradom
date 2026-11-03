import { QueryFailedError } from 'typeorm';

export function jeDupliUnos(greska: unknown): boolean {
  return (
    greska instanceof QueryFailedError &&
    'code' in greska.driverError &&
    greska.driverError.code === '23505'
  );
}

// Red na koji upis pokazuje (npr. zgrada) je obrisan u međuvremenu
export function jeNepostojecaVeza(greska: unknown): boolean {
  return (
    greska instanceof QueryFailedError &&
    'code' in greska.driverError &&
    greska.driverError.code === '23503'
  );
}
