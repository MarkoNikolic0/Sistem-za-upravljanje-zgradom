import { proveriOkruzenje } from './okruzenje.js';

describe('proveriOkruzenje', () => {
  const ispravno = {
    JWT_SECRET: 'a'.repeat(32),
    FRONTEND_URL: 'http://localhost:4200',
    PORT: '3000',
  };

  it('ispravno okruženje vraća nepromenjeno', () => {
    expect(proveriOkruzenje(ispravno)).toBe(ispravno);
  });

  it('bez ključa za JWT ili sa prekratkim ključem aplikacija ne kreće', () => {
    const { JWT_SECRET: _, ...bezKljuca } = ispravno;
    expect(() => proveriOkruzenje(bezKljuca)).toThrow('JWT_SECRET');
    expect(() =>
      proveriOkruzenje({ ...ispravno, JWT_SECRET: 'kratak' }),
    ).toThrow('JWT_SECRET');
  });

  it('adresa frontenda mora biti adresa sa protokolom', () => {
    const { FRONTEND_URL: _, ...bezAdrese } = ispravno;
    expect(() => proveriOkruzenje(bezAdrese)).toThrow('FRONTEND_URL');
    expect(() =>
      proveriOkruzenje({ ...ispravno, FRONTEND_URL: 'localhost:4200' }),
    ).toThrow('FRONTEND_URL');
  });
});
