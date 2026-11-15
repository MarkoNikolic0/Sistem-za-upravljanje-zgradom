import { prikazBroja } from './prikaz-broja';

describe('prikazBroja', () => {
  it('do 99 prikazuje broj, posle 99+', () => {
    expect(prikazBroja(0)).toBe('0');
    expect(prikazBroja(99)).toBe('99');
    expect(prikazBroja(100)).toBe('99+');
  });
});
