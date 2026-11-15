import { tokenZa } from '../../../../testiranje/sesija';
import { procitajJwtPayload } from './jwt-payload';

describe('procitajJwtPayload', () => {
  it('čita podatke iz tokena, i sa našim slovima u emailu', () => {
    expect(procitajJwtPayload(tokenZa('upravnik', 7))).toMatchObject({
      sub: 7,
      uloga: 'upravnik',
      email: 'đorđe.šćekić@example.com',
      sid: 'sesija-7',
    });
  });

  it('token bez drugog dela je neispravan', () => {
    expect(() => procitajJwtPayload('samo-jedan-deo')).toThrow('Neispravan JWT');
  });
});
