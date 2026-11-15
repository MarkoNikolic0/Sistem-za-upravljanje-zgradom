import { formatirajTelefon } from './telefon';

describe('formatirajTelefon', () => {
  it('formatira srpski broj u domaćem obliku', () => {
    expect(formatirajTelefon('+381641234567')).toBe('064 1234567');
  });

  it('neispravan broj vraća neizmenjen', () => {
    expect(formatirajTelefon('nije broj')).toBe('nije broj');
  });
});
