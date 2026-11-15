import type { Korisnik } from '../korisnik/korisnik.entity.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import type { StanSaStanarima } from '../stanar-stana/stanovi-sa-stanarima.js';
import {
  type OdgovorStanara,
  pregledPrisustva,
  spisakPrisustva,
} from './prisustvo-sastanka.js';

const odgovor = (
  korisnikId: number,
  stanId: number,
  vlasnik: boolean,
  dolazi: boolean,
): OdgovorStanara => ({ korisnikId, stanId, vlasnik, dolazi });

describe('pregledPrisustva', () => {
  it('na skupštini broji samo vlasnike, a kvorum po stanovima', () => {
    const pregled = pregledPrisustva(
      {
        vrsta: VrstaSastanka.SKUPSTINA,
        ukupnoStanova: 10,
        odgovori: [
          odgovor(1, 101, true, true),
          odgovor(2, 101, true, true),
          odgovor(3, 102, true, false),
          odgovor(4, 103, false, true),
        ],
        prisutno: null,
      },
      3,
    );
    expect(pregled).toEqual({
      dolazi: 2,
      neDolazi: 1,
      mojOdgovor: false,
      kvorum: { ukupno: 10, prag: 6, najavljeno: 1, prisutno: null },
    });
  });

  it('vlasnik više stanova se broji jednom, a njegovi stanovi posebno', () => {
    const pregled = pregledPrisustva(
      {
        vrsta: VrstaSastanka.SKUPSTINA,
        ukupnoStanova: 4,
        odgovori: [odgovor(1, 101, true, true), odgovor(1, 102, true, true)],
        prisutno: 3,
      },
      1,
    );
    expect(pregled.dolazi).toBe(1);
    expect(pregled.kvorum).toEqual({
      ukupno: 4,
      prag: 3,
      najavljeno: 2,
      prisutno: 3,
    });
  });

  it('na zboru se broje svi stanari i nema kvoruma', () => {
    const pregled = pregledPrisustva(
      {
        vrsta: VrstaSastanka.ZBOR,
        ukupnoStanova: 10,
        odgovori: [odgovor(1, 101, true, true), odgovor(4, 103, false, true)],
        prisutno: null,
      },
      4,
    );
    expect(pregled).toEqual({
      dolazi: 2,
      neDolazi: 0,
      mojOdgovor: true,
      kvorum: null,
    });
  });

  it('ukućanin na skupštini nema svoj odgovor', () => {
    const pregled = pregledPrisustva(
      {
        vrsta: VrstaSastanka.SKUPSTINA,
        ukupnoStanova: 10,
        odgovori: [odgovor(4, 103, false, true)],
        prisutno: null,
      },
      4,
    );
    expect(pregled.mojOdgovor).toBeNull();
    expect(pregled.dolazi).toBe(0);
  });
});

describe('spisakPrisustva', () => {
  const stanar = (id: number, vlasnik: boolean) => ({
    id,
    vlasnik,
    korisnik: {
      id,
      ime: `Ime${id}`,
      prezime: 'Prezime',
      email: `stanar${id}@example.com`,
      telefon: '+381641234567',
    } as Korisnik,
  });
  const stanovi: StanSaStanarima[] = [
    {
      id: 101,
      broj: '1',
      sprat: 0,
      kvadratura: 50,
      stanari: [stanar(1, true), stanar(2, false)],
    },
    { id: 102, broj: '2', sprat: 0, kvadratura: 60, stanari: [] },
  ];

  it('na skupštini izostavlja ukućane i ne otkriva kontakt', () => {
    const spisak = spisakPrisustva(
      VrstaSastanka.SKUPSTINA,
      stanovi,
      new Map([[1, true]]),
      new Set([101]),
    );
    expect(spisak).toEqual([
      {
        id: 101,
        broj: '1',
        sprat: 0,
        prisutan: true,
        stanari: [
          {
            id: 1,
            ime: 'Ime1',
            prezime: 'Prezime',
            vlasnik: true,
            dolazi: true,
          },
        ],
      },
      { id: 102, broj: '2', sprat: 0, prisutan: false, stanari: [] },
    ]);
  });

  it('na zboru prikazuje sve stanare, bez odgovora kad ga nema', () => {
    const [prvi] = spisakPrisustva(
      VrstaSastanka.ZBOR,
      stanovi,
      new Map([[2, false]]),
      new Set(),
    );
    expect(prvi.stanari.map((s) => [s.id, s.dolazi])).toEqual([
      [1, null],
      [2, false],
    ]);
  });
});
