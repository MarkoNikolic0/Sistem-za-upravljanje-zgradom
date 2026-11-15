import { pragKvoruma } from './kvorum.js';

describe('pragKvoruma', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 2],
    [10, 6],
    [11, 6],
    [20, 11],
  ])('za %i stanova traži više od polovine: %i', (ukupno, prag) => {
    expect(pragKvoruma(ukupno)).toBe(prag);
  });
});
