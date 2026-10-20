import {
  Prioritet,
  StanjeKvara,
  StatusKvara,
} from '../shared/enums/kvar.enums.js';
import { MS_PO_DANU } from '../shared/vreme.js';

export const OTVORENI_STATUSI = [
  StatusKvara.PRIJAVLJEN,
  StatusKvara.PRIHVACEN,
  StatusKvara.DODELJEN,
  StatusKvara.U_TOKU,
];

export const STATUSI_PO_STANJU: Record<StanjeKvara, StatusKvara[]> = {
  [StanjeKvara.AKTIVNI]: [...OTVORENI_STATUSI, StatusKvara.RESEN],
  [StanjeKvara.ZAVRSENI]: [
    StatusKvara.ZATVOREN,
    StatusKvara.ODBIJEN,
    StatusKvara.POVUCEN,
  ],
};

export function jeZavrsen(status: StatusKvara): boolean {
  return STATUSI_PO_STANJU[StanjeKvara.ZAVRSENI].includes(status);
}

export const MAKS_SLICNIH = 5;

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

export function najkasnijiDolazak(rok: Date, sada = new Date()): Date {
  const kaoHitno = rokResavanja(sada, Prioritet.HITNO);
  return rok > kaoHitno ? rok : kaoHitno;
}
