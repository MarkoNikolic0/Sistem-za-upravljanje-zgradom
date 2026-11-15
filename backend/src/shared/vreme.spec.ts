import { danaDo, danISat } from './vreme.js';

describe('danaDo', () => {
  const sada = new Date('2026-03-10T12:00:00+01:00');

  it('isti dan je nula', () => {
    expect(danaDo(new Date('2026-03-10T23:30:00+01:00'), sada)).toBe(0);
  });

  it('broji kalendarske dane, ne po 24 sata', () => {
    expect(danaDo(new Date('2026-03-11T00:05:00+01:00'), sada)).toBe(1);
    expect(danaDo(new Date('2026-03-17T08:00:00+01:00'), sada)).toBe(7);
  });

  it('prošli dani su negativni', () => {
    expect(danaDo(new Date('2026-03-09T23:59:00+01:00'), sada)).toBe(-1);
  });

  it('dan se računa po beogradskom vremenu', () => {
    expect(danaDo(new Date('2026-03-10T23:30:00Z'), sada)).toBe(1);
  });

  it('prelazak na letnje vreme ne kvari broj dana', () => {
    const pre = new Date('2026-03-28T12:00:00+01:00');
    const posle = new Date('2026-03-30T12:00:00+02:00');
    expect(danaDo(posle, pre)).toBe(2);
  });
});

describe('danISat', () => {
  it('ispisuje dan, datum i sat po beogradskom vremenu', () => {
    const tekst = danISat(new Date('2026-03-10T17:05:00Z'));
    expect(tekst).toMatch(/^utorak, 10\. ?3\. u 18:05$/);
  });
});
