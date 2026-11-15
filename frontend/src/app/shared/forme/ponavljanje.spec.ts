import { NIJE_PRAZNO } from './nije-prazno';
import { imaPonavljanja } from './ponavljanje';

describe('imaPonavljanja', () => {
  it('ne broji prazne vrednosti', () => {
    expect(imaPonavljanja([1, 2, null, null, ''])).toBe(false);
    expect(imaPonavljanja(['a', 'b', 'a'])).toBe(true);
  });

  it('NIJE_PRAZNO odbija tekst od samih razmaka', () => {
    expect(NIJE_PRAZNO.test('  ')).toBe(false);
    expect(NIJE_PRAZNO.test(' a ')).toBe(true);
  });
});
