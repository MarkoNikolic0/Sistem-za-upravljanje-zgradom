import { VrstaOglasa } from './oglas-models';
import { PravilaFajlova } from '../../shared/fajlovi';
import { zaDana } from '../../shared/datum';

export const OGLASA_PO_STRANI = 10;

export const DANA_VAZENJA = 30;

export const PRAVILA_PRILOGA: PravilaFajlova = {
  tipovi: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  opisTipova: 'PDF, JPG, PNG ili WEBP',
  maksMb: 10,
  maksBroj: 5,
  vlasnik: 'Oglas',
  mnozina: 'priloga',
};

const VRSTE_SA_ROKOM: VrstaOglasa[] = ['prodaja', 'trazim', 'izgubljeno'];

export function predlozenRok(vrsta: VrstaOglasa | null): Date | null {
  if (vrsta === null || !VRSTE_SA_ROKOM.includes(vrsta)) {
    return null;
  }
  return zaDana(DANA_VAZENJA);
}
