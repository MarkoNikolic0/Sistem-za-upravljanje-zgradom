import { Oglas } from './oglas.entity.js';

export const DANA_VAZENJA = 30;

export function istekao(oglas: Oglas, sada = new Date()) {
  return oglas.vaziDo !== null && oglas.vaziDo <= sada;
}

export const PORUKA_SAKRIVEN =
  'Oglas je sakriven, pa više ne može da se menja.';

export const MAKS_PRILOGA_PO_OGLASU = 5;
export const MAKS_NAZIV_PRILOGA = 255;
