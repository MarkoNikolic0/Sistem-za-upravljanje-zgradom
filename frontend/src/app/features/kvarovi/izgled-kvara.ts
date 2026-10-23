import { KategorijaKvara, StatusKvara } from './kvar-models';

export const IKONICE_KATEGORIJA: Record<KategorijaKvara, string> = {
  vodovod: 'pi pi-wrench',
  struja: 'pi pi-bolt',
  lift: 'pi pi-arrows-v',
  grejanje: 'pi pi-sun',
  gradjevina: 'pi pi-building',
  stolarija: 'pi pi-hammer',
  ciscenje: 'pi pi-sparkles',
  ostalo: 'pi pi-ellipsis-h',
};

// Boja statusa kao CSS vrednost: tačka, traka i tok popravke koriste istu boju
export const BOJE_STATUSA: Record<StatusKvara, string> = {
  prijavljen: 'var(--color-tekst)',
  prihvacen: 'var(--color-info)',
  dodeljen: 'var(--color-info)',
  u_toku: 'var(--color-svetlo)',
  resen: 'var(--color-uspeh)',
  zatvoren: 'var(--color-utisano)',
  odbijen: 'var(--color-greska)',
  povucen: 'var(--color-utisano)',
};

export const KORACI_KVARA: StatusKvara[] = [
  'prijavljen',
  'prihvacen',
  'dodeljen',
  'u_toku',
  'resen',
  'zatvoren',
];

export function predjenoKoraka(status: StatusKvara): number {
  const i = KORACI_KVARA.indexOf(status);
  return i === -1 ? 1 : i + 1;
}
