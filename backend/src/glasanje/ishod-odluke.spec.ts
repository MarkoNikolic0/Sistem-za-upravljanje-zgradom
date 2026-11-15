import { IshodOdluke, VecinaOdluke } from '../shared/enums/glasanje.enums.js';
import { ishodOdluke, pragoviOdluke } from './ishod-odluke.js';

const { OBICNA, DVE_TRECINE } = VecinaOdluke;
const { USVOJENA, ODBIJENA, NEMA_KVORUMA } = IshodOdluke;

describe('pragoviOdluke', () => {
  it('obična većina se računa od onih koji su glasali', () => {
    expect(pragoviOdluke(OBICNA, 12, 20)).toEqual({
      kvorum: 11,
      potrebnoZa: 7,
    });
  });

  it('dvotrećinska većina se računa od svih stanova zgrade', () => {
    expect(pragoviOdluke(DVE_TRECINE, 12, 20)).toEqual({
      kvorum: 11,
      potrebnoZa: 14,
    });
  });

  it('dve trećine se zaokružuju naviše', () => {
    expect(pragoviOdluke(DVE_TRECINE, 0, 10).potrebnoZa).toBe(7);
    expect(pragoviOdluke(DVE_TRECINE, 0, 9).potrebnoZa).toBe(6);
  });
});

describe('ishodOdluke', () => {
  it.each([
    [OBICNA, 10, 10, 20, NEMA_KVORUMA],
    [OBICNA, 6, 11, 20, USVOJENA],
    [OBICNA, 5, 11, 20, ODBIJENA],
    [OBICNA, 6, 12, 20, ODBIJENA],
    [OBICNA, 7, 12, 20, USVOJENA],
    [DVE_TRECINE, 13, 20, 20, ODBIJENA],
    [DVE_TRECINE, 14, 14, 20, USVOJENA],
    [DVE_TRECINE, 10, 10, 20, NEMA_KVORUMA],
    [OBICNA, 0, 0, 0, NEMA_KVORUMA],
  ])(
    '%s: za %i, glasalo %i od %i daje %s',
    (vecina, za, glasalo, ukupno, ishod) => {
      expect(ishodOdluke(vecina, za, glasalo, ukupno)).toBe(ishod);
    },
  );

  it('polovina stanova nije kvorum', () => {
    expect(ishodOdluke(OBICNA, 5, 5, 10)).toBe(NEMA_KVORUMA);
    expect(ishodOdluke(OBICNA, 6, 6, 10)).toBe(USVOJENA);
  });

  it('izjednačen broj glasova ne usvaja odluku', () => {
    expect(ishodOdluke(OBICNA, 4, 8, 10)).toBe(ODBIJENA);
  });
});
