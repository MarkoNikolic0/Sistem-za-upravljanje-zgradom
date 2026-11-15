import { In } from 'typeorm';
import { AKTIVNA_ZGRADA } from '../zgrada/aktivna-zgrada.js';
import {
  type PristupZgradama,
  sadrzi,
  samoZgrada,
  uZgradama,
  zgradeVlasnika,
} from './pristup-zgradama.js';

const pristup = (polja: Partial<PristupZgradama>): PristupZgradama => ({
  stanuje: [],
  poseduje: [],
  vlasnickiStanovi: [],
  zgrade: [],
  upravlja: [],
  ...polja,
});

describe('pristup zgradama', () => {
  it('sadrzi proverava da li je zgrada među dozvoljenim', () => {
    expect(sadrzi([1, 2], 2)).toBe(true);
    expect(sadrzi([1, 2], 3)).toBe(false);
    expect(sadrzi([], 1)).toBe(false);
  });

  it('zgradeVlasnika spaja zgrade u kojima je vlasnik i kojima upravlja', () => {
    expect(
      zgradeVlasnika(
        pristup({ stanuje: [1, 2], poseduje: [2], upravlja: [3] }),
      ),
    ).toEqual([2, 3]);
    expect(zgradeVlasnika(pristup({ poseduje: [2], upravlja: [2] }))).toEqual([
      2,
    ]);
  });

  it('ukućanin bez vlasništva nema nijednu zgradu vlasnika', () => {
    expect(zgradeVlasnika(pristup({ stanuje: [1], zgrade: [1] }))).toEqual([]);
  });

  it('samoZgrada bez filtera vraća sve dozvoljene zgrade', () => {
    expect(samoZgrada([1, 2])).toEqual([1, 2]);
  });

  it('samoZgrada sužava na traženu zgradu samo ako je dozvoljena', () => {
    expect(samoZgrada([1, 2], 2)).toEqual([2]);
    expect(samoZgrada([1, 2], 3)).toEqual([]);
  });

  it('uZgradama uvek traži aktivnu zgradu', () => {
    expect(uZgradama(null)).toEqual({ zgrada: AKTIVNA_ZGRADA });
    expect(uZgradama([1, 2])).toEqual({
      zgrada: { ...AKTIVNA_ZGRADA, id: In([1, 2]) },
    });
  });

  it('uZgradama sa praznim spiskom ne poklapa nijednu zgradu', () => {
    expect(uZgradama([])).toEqual({
      zgrada: { ...AKTIVNA_ZGRADA, id: In([]) },
    });
  });
});
