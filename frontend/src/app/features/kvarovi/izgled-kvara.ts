import { KategorijaKvara, StatusKvara } from './kvar-models';
import { StanjeRoka } from './pravila-kvara';

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

// Odbijen i povučen kvar nisu korak popravke, pa nemaju traku napretka
export function predjenoKoraka(status: StatusKvara): number | null {
  const i = KORACI_KVARA.indexOf(status);
  return i === -1 ? null : i + 1;
}

export const OZNAKE_ROKA: Record<StanjeRoka, string> = {
  prekoracen: 'Rok prekoračen',
  danas: 'Rok ističe danas',
  sutra: 'Rok ističe sutra',
};
