import { StanjeKvara, StatusKvara } from '../shared/enums/kvar.enums.js';

export const STATUSI_PO_STANJU: Record<StanjeKvara, StatusKvara[]> = {
  [StanjeKvara.AKTIVNI]: [
    StatusKvara.PRIJAVLJEN,
    StatusKvara.PRIHVACEN,
    StatusKvara.DODELJEN,
    StatusKvara.U_TOKU,
    StatusKvara.RESEN,
  ],
  [StanjeKvara.ZAVRSENI]: [StatusKvara.ZATVOREN, StatusKvara.ODBIJEN],
};

export const DANA_ZA_POTVRDU = 7;
export const MS_PO_DANU = 24 * 60 * 60 * 1000;
