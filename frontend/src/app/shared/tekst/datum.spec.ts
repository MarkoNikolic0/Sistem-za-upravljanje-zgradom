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

  it('danaDo broji kalendarske dane u Srbiji, ne 24 sata', () => {
    const sada = new Date('2026-06-10T12:00:00+02:00');
    expect(danaDo('2026-06-10T23:59:00+02:00', sada)).toBe(0);
    expect(danaDo('2026-06-11T00:01:00+02:00', sada)).toBe(1);
    expect(danaDo('2026-06-09T23:00:00+02:00', sada)).toBe(-1);
    expect(danaDo(new Date('2026-06-20T00:00:00+02:00'), sada)).toBe(10);
  });

  it('danaDo ne greši pri prelasku na letnje računanje vremena', () => {
    expect(danaDo('2026-03-30T00:00:00+02:00', new Date('2026-03-28T12:00:00+01:00'))).toBe(2);
    expect(danaDo('2026-10-26T00:00:00+01:00', new Date('2026-10-24T12:00:00+02:00'))).toBe(2);
  });

  it('danaDo broji dane po vremenu u Srbiji, kao server', () => {
    const sada = new Date('2026-06-10T21:30:00Z');
    expect(danaDo('2026-06-10T22:30:00Z', sada)).toBe(1);
    expect(danaDo('2026-06-10T21:45:00Z', sada)).toBe(0);
    expect(danaDo('2026-06-13T10:00:00Z', sada)).toBe(3);
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
