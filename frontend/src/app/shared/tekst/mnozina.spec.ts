import { oblik, uMnozini } from './mnozina';

describe('množina', () => {
  it.each([
    [1, '1 stan'],
    [2, '2 stana'],
    [4, '4 stana'],
    [5, '5 stanova'],
    [11, '11 stanova'],
    [12, '12 stanova'],
    [21, '21 stan'],
    [22, '22 stana'],
    [0, '0 stanova'],
  ])('%i → %s', (broj, tekst) => {
    expect(uMnozini(broj, 'stan', 'stana', 'stanova')).toBe(tekst);
  });

  it('oblik vraća samo reč', () => {
    expect(oblik(3, 'glas', 'glasa', 'glasova')).toBe('glasa');
  });
});
