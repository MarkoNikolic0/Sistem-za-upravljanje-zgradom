import { ProfileResponse } from '../profile/profile-models';
import { upravljaZgradom, zgradeIzProfila } from './zgrade-korisnika';

const alfa = { id: 1, naziv: 'Alfa', adresa: 'Ulica 1' };
const beta = { id: 2, naziv: 'Beta', adresa: 'Ulica 2' };
const gama = { id: 3, naziv: 'Gama', adresa: 'Ulica 3' };

function profil(izmene: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    id: 10,
    ime: 'Nikola',
    prezime: 'Ilić',
    email: 'nikola@example.com',
    telefon: '+381641234502',
    uloga: 'upravnik',
    kreiranDatum: '2026-01-01T00:00:00Z',
    upravlja: [],
    stanovi: [],
    ...izmene,
  };
}

describe('zgradeIzProfila', () => {
  it('spaja zgrade kojima upravlja i u kojima stanuje, bez ponavljanja i po nazivu', () => {
    const p = profil({
      upravlja: [gama, alfa],
      stanovi: [
        { id: 7, broj: '7', sprat: 2, vlasnik: true, zgrada: alfa },
        { id: 8, broj: '3', sprat: 1, vlasnik: false, zgrada: beta },
      ],
    });
    expect(zgradeIzProfila(p).map((z) => z.id)).toEqual([1, 2, 3]);
  });
});

describe('upravljaZgradom', () => {
  it('upravnik upravlja svakom svojom zgradom, a tuđom ne', () => {
    const p = profil({ upravlja: [alfa, beta] });
    expect(upravljaZgradom(p, 1)).toBe(true);
    expect(upravljaZgradom(p, 2)).toBe(true);
    expect(upravljaZgradom(p, 3)).toBe(false);
    expect(upravljaZgradom(p, null)).toBe(false);
  });

  it('admin upravlja svakom zgradom', () => {
    expect(upravljaZgradom(profil({ uloga: 'admin' }), 3)).toBe(true);
  });
});
