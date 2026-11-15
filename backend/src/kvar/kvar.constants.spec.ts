import { Prioritet, StatusKvara } from '../shared/enums/kvar.enums.js';
import { MS_PO_DANU } from '../shared/vreme.js';
import {
  jeZavrsen,
  najkasnijiDolazak,
  rokResavanja,
} from './kvar.constants.js';

const prijava = new Date('2026-03-10T08:00:00Z');
const posle = (dana: number, od = prijava) =>
  new Date(od.getTime() + dana * MS_PO_DANU);

describe('rokResavanja', () => {
  it.each([
    [Prioritet.HITNO, 2],
    [Prioritet.SREDNJE, 7],
    [Prioritet.NISKO, 21],
  ])('%s kvar ima rok od %i dana', (prioritet, dana) => {
    expect(rokResavanja(prijava, prioritet)).toEqual(posle(dana));
  });
});

describe('najkasnijiDolazak', () => {
  it('dok rok nije blizu, dolazak je najkasnije do roka', () => {
    const rok = posle(7);
    expect(najkasnijiDolazak(rok, prijava)).toEqual(rok);
  });

  it('kad je rok blizu ili prošao, serviser ima dva dana od sada', () => {
    const sada = posle(10);
    expect(najkasnijiDolazak(posle(7), sada)).toEqual(posle(2, sada));
  });
});

describe('jeZavrsen', () => {
  it.each([StatusKvara.ZATVOREN, StatusKvara.ODBIJEN, StatusKvara.POVUCEN])(
    '%s je završen',
    (status) => {
      expect(jeZavrsen(status)).toBe(true);
    },
  );

  it.each([
    StatusKvara.PRIJAVLJEN,
    StatusKvara.PRIHVACEN,
    StatusKvara.DODELJEN,
    StatusKvara.U_TOKU,
    StatusKvara.RESEN,
  ])('%s nije završen', (status) => {
    expect(jeZavrsen(status)).toBe(false);
  });
});
