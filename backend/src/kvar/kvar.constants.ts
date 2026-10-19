import {
  Prioritet,
  StanjeKvara,
  StatusKvara,
} from '../shared/enums/kvar.enums.js';
import { MS_PO_DANU } from '../shared/vreme.js';

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

export const DANA_ZA_RESAVANJE: Record<Prioritet, number> = {
  [Prioritet.HITNO]: 2,
  [Prioritet.SREDNJE]: 7,
  [Prioritet.NISKO]: 21,
};

export function rokResavanja(datumPrijave: Date, prioritet: Prioritet): Date {
  return new Date(
    datumPrijave.getTime() + DANA_ZA_RESAVANJE[prioritet] * MS_PO_DANU,
  );
}
