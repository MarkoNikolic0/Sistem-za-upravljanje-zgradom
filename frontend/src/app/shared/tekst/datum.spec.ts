import { FormControl } from '@angular/forms';
import { SADA } from '../../../testiranje/podaci';
import { danaDo, formatRoka, krajDana, rokNijeProsao, zaDana } from './datum';

describe('datum', () => {
  beforeEach(() => vi.setSystemTime(SADA));
  afterEach(() => vi.useRealTimers());

  it('zaDana vraća ponoć posle zadatog broja dana', () => {
    expect(zaDana(3)).toEqual(new Date(2026, 5, 13));
    expect(zaDana(0, new Date(2026, 11, 31, 23, 59))).toEqual(new Date(2026, 11, 31));
    expect(zaDana(1, new Date(2026, 11, 31))).toEqual(new Date(2027, 0, 1));
  });

  it('danaDo broji kalendarske dane, ne 24 sata', () => {
    expect(danaDo(new Date(2026, 5, 10, 23, 59))).toBe(0);
    expect(danaDo(new Date(2026, 5, 11, 0, 1))).toBe(1);
    expect(danaDo(new Date(2026, 5, 9, 23, 0))).toBe(-1);
    expect(danaDo(new Date(2026, 5, 20).toISOString())).toBe(10);
  });

  it('danaDo ne greši pri prelasku na letnje računanje vremena', () => {
    expect(danaDo(new Date(2026, 2, 30), new Date(2026, 2, 28, 12))).toBe(2);
    expect(danaDo(new Date(2026, 9, 26), new Date(2026, 9, 24, 12))).toBe(2);
  });

  it('krajDana je poslednja milisekunda istog dana', () => {
    expect(krajDana(new Date(2026, 5, 10, 8))).toEqual(new Date(2026, 5, 10, 23, 59, 59, 999));
  });

  it('formatRoka prikazuje godinu samo kad nije tekuća', () => {
    expect(formatRoka(new Date(2026, 8, 1).toISOString())).toBe('d. MMM');
    expect(formatRoka(new Date(2027, 0, 5).toISOString())).toBe('d. MMM y.');
  });

  it('rokNijeProsao dozvoljava danas i budućnost, a ne juče', () => {
    const polje = new FormControl<Date | null>(null);
    expect(rokNijeProsao(polje)).toBeNull();
    polje.setValue(new Date(2026, 5, 10));
    expect(rokNijeProsao(polje)).toBeNull();
    polje.setValue(new Date(2026, 5, 9));
    expect(rokNijeProsao(polje)).toEqual({ proslost: true });
  });
});
