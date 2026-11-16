export interface Stranica<T> {
  stavke: T[];
  ukupno: number;
}

export interface UpitStrane {
  strana: number;
  poStrani: number;
}

export function uZgradi(zgradaId: number | null): { zgradaId?: number } {
  return zgradaId === null ? {} : { zgradaId };
}
