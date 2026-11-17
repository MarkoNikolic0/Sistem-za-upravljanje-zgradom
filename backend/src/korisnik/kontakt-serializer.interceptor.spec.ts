import { StreamableFile } from '@nestjs/common';
import { Korisnik } from './korisnik.entity.js';
import { korisniciUOdgovoru } from './kontakt-serializer.interceptor.js';

const korisnik = (id: number) => Object.assign(new Korisnik(), { id });

describe('korisniciUOdgovoru', () => {
  it('nalazi korisnike u ugnežđenim objektima i nizovima stranice', () => {
    const autor = korisnik(1);
    const serviser = korisnik(2);
    const odgovor = {
      stavke: [
        { id: 10, autor, prilozi: [] },
        { id: 11, kvar: { korisnik: autor, serviser } },
      ],
      ukupno: 2,
    };
    expect(korisniciUOdgovoru(odgovor)).toEqual([autor, serviser]);
  });

  it('ne upada u petlju i preskače datume, fajlove i bafere', () => {
    const autor = korisnik(1);
    const oglas: Record<string, unknown> = { id: 5, autor, datum: new Date() };
    oglas.ja = oglas;
    const odgovor = [
      oglas,
      Buffer.from('fajl'),
      new StreamableFile(Buffer.from('pdf')),
      null,
      'tekst',
      3,
    ];
    expect(korisniciUOdgovoru(odgovor)).toEqual([autor]);
  });

  it('obične objekte sa poljem email ne smatra korisnicima', () => {
    expect(
      korisniciUOdgovoru({ id: 1, ime: 'Pera', email: 'pera@example.com' }),
    ).toEqual([]);
    expect(korisniciUOdgovoru(undefined)).toEqual([]);
  });
});
