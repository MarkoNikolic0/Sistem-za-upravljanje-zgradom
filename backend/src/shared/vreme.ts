export const MS_PO_DANU = 24 * 60 * 60 * 1000;

export const VREMENSKA_ZONA = 'Europe/Belgrade';

export const POCETAK_DANA = `date_trunc('day', now() AT TIME ZONE '${VREMENSKA_ZONA}') AT TIME ZONE '${VREMENSKA_ZONA}'`;

export function danaDo(datum: Date, sada = new Date()) {
  const dan = (d: Date) =>
    Date.parse(d.toLocaleDateString('en-CA', { timeZone: VREMENSKA_ZONA }));
  return Math.round((dan(datum) - dan(sada)) / MS_PO_DANU);
}

const DAN = new Intl.DateTimeFormat('sr-Latn-RS', {
  timeZone: VREMENSKA_ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'numeric',
});
const SAT = new Intl.DateTimeFormat('sr-Latn-RS', {
  timeZone: VREMENSKA_ZONA,
  hour: '2-digit',
  minute: '2-digit',
});

export function danISat(datum: Date) {
  return `${DAN.format(datum)} u ${SAT.format(datum)}`;
}
