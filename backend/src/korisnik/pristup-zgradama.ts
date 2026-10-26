export interface PristupZgradama {
  stanuje: number[];
  poseduje: number[];
  vlasnickiStanovi: { id: number; zgradaId: number }[];
  zgrade: number[] | null;
  upravlja: number[] | null;
}

export function sadrzi(zgrade: number[] | null, zgradaId: number) {
  return zgrade === null || zgrade.includes(zgradaId);
}

export function samoZgrada(zgrade: number[] | null, zgradaId?: number) {
  if (zgradaId === undefined) {
    return zgrade;
  }
  return sadrzi(zgrade, zgradaId) ? [zgradaId] : [];
}
