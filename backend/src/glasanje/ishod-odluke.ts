import { IshodOdluke, VecinaOdluke } from '../shared/enums/glasanje.enums.js';

export const ZA = 'Za';
export const ODGOVORI_ODLUKE = [ZA, 'Protiv', 'Uzdržan'];

export function ishodOdluke(
  vecina: VecinaOdluke,
  za: number,
  glasalo: number,
  ukupno: number,
): IshodOdluke {
  if (2 * glasalo <= ukupno) {
    return IshodOdluke.NEMA_KVORUMA;
  }
  const usvojena =
    vecina === VecinaOdluke.OBICNA ? 2 * za > glasalo : 3 * za >= 2 * ukupno;
  return usvojena ? IshodOdluke.USVOJENA : IshodOdluke.ODBIJENA;
}
