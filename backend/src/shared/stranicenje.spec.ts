import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  MAKS_PO_STRANI,
  MAKS_STRANA,
  StranicenjeDto,
  stranicenje,
  velicinaStrane,
} from './stranicenje.js';

describe('stranicenje', () => {
  it('prva strana počinje od početka', () => {
    expect(stranicenje({ strana: 1, poStrani: 20 })).toEqual({
      skip: 0,
      take: 20,
    });
  });

  it('preskače prethodne strane', () => {
    expect(stranicenje({ strana: 3, poStrani: 10 })).toEqual({
      skip: 20,
      take: 10,
    });
  });

  it('ograničava veličinu strane i po njoj računa preskok', () => {
    expect(velicinaStrane(1000)).toBe(MAKS_PO_STRANI);
    expect(stranicenje({ strana: 2, poStrani: 1000 })).toEqual({
      skip: MAKS_PO_STRANI,
      take: MAKS_PO_STRANI,
    });
  });
});

describe('StranicenjeDto', () => {
  const greske = (strana: unknown) =>
    validateSync(plainToInstance(StranicenjeDto, { strana })).map(
      (g) => g.property,
    );

  it('prihvata poslednju dozvoljenu stranu', () => {
    expect(greske(String(MAKS_STRANA))).toEqual([]);
  });

  it('odbija stranu posle poslednje dozvoljene', () => {
    expect(greske(String(MAKS_STRANA + 1))).toEqual(['strana']);
  });
});
