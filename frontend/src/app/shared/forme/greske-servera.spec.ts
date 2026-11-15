import { HttpErrorResponse } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { greskaPolja, oznaciGreskuPolja, porukaServera, prvaGreskaPolja } from './greske-servera';

const greska = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('greške servera', () => {
  const polja = greska(400, { greske: { email: 'Zauzet', ime: 'Prazno' }, message: 'Neispravno' });

  it('greskaPolja i prvaGreskaPolja čitaju samo odgovor 400', () => {
    expect(greskaPolja(polja, 'ime')).toBe('Prazno');
    expect(greskaPolja(polja, 'telefon')).toBeUndefined();
    expect(prvaGreskaPolja(polja)).toBe('Zauzet');
    expect(greskaPolja(greska(409, { greske: { ime: 'x' } }), 'ime')).toBeUndefined();
    expect(prvaGreskaPolja(greska(400, null))).toBeUndefined();
  });

  it('porukaServera vraća samo tekstualnu poruku', () => {
    expect(porukaServera(polja)).toBe('Neispravno');
    expect(porukaServera(greska(400, { message: ['a', 'b'] }))).toBeUndefined();
    expect(porukaServera(greska(0, null))).toBeUndefined();
  });

  it('oznaciGreskuPolja označi prvo polje po zadatom redosledu', () => {
    const kontrole = { ime: new FormControl(''), email: new FormControl('') };
    expect(oznaciGreskuPolja(polja, kontrole, ['ime', 'email'])).toBe('ime');
    expect(kontrole.ime.errors).toEqual({ server: 'Prazno' });
    expect(kontrole.ime.touched).toBe(true);
    expect(kontrole.email.errors).toBeNull();
    expect(oznaciGreskuPolja(greska(500, null), kontrole, ['email'])).toBeUndefined();
  });
});
