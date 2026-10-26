import { IshodOdluke, VecinaOdluke } from '../shared/enums/glasanje.enums.js';

export const ZA = 'Za';
export const ODGOVORI_ODLUKE = [ZA, 'Protiv', 'Uzdržan'];

export interface PragoviOdluke {
  kvorum: number;
  potrebnoZa: number;
}

export function pragoviOdluke(
  vecina: VecinaOdluke,
  glasalo: number,
  ukupno: number,
): PragoviOdluke {
  return {
    kvorum: Math.floor(ukupno / 2) + 1,
    potrebnoZa:
      vecina === VecinaOdluke.OBICNA
        ? Math.floor(glasalo / 2) + 1
        : Math.ceil((2 * ukupno) / 3),
  };
}

export function ishodOdluke(
  vecina: VecinaOdluke,
  za: number,
  glasalo: number,
  ukupno: number,
): IshodOdluke {
  const { kvorum, potrebnoZa } = pragoviOdluke(vecina, glasalo, ukupno);
  if (glasalo < kvorum) {
    return IshodOdluke.NEMA_KVORUMA;
  }
  return za >= potrebnoZa ? IshodOdluke.USVOJENA : IshodOdluke.ODBIJENA;
}
