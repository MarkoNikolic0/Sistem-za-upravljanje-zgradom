export const MS_PO_DANU = 24 * 60 * 60 * 1000;

export const VREMENSKA_ZONA = 'Europe/Belgrade';

export const POCETAK_DANA = `date_trunc('day', now() AT TIME ZONE '${VREMENSKA_ZONA}') AT TIME ZONE '${VREMENSKA_ZONA}'`;

// Broj kalendarskih dana po beogradskom vremenu od danas do datuma
export function danaDo(datum: Date, sada = new Date()) {
  const dan = (d: Date) =>
    Date.parse(d.toLocaleDateString('en-CA', { timeZone: VREMENSKA_ZONA }));
  return Math.round((dan(datum) - dan(sada)) / MS_PO_DANU);
}
