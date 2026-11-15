import { idIzAdrese, jeIspravanId } from './ispravan-id';

describe('id iz adrese', () => {
  it('mora biti ceo pozitivan broj', () => {
    expect(idIzAdrese(undefined)).toBeUndefined();
    expect(idIzAdrese('5')).toBe(5);
    expect(jeIspravanId(5)).toBe(true);
    expect(jeIspravanId(idIzAdrese('0')!)).toBe(false);
    expect(jeIspravanId(idIzAdrese('2.5')!)).toBe(false);
    expect(jeIspravanId(idIzAdrese('abc')!)).toBe(false);
    expect(jeIspravanId(idIzAdrese('-3')!)).toBe(false);
  });
});
