import { QueryFailedError } from 'typeorm';

export function jeDupliUnos(greska: unknown): boolean {
  return (
    greska instanceof QueryFailedError &&
    'code' in greska.driverError &&
    greska.driverError.code === '23505'
  );
}
