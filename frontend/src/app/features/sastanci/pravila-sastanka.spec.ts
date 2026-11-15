import { FormControl, FormGroup } from '@angular/forms';
import { SADA, sastanak, zaDanaU } from '../../../testiranje/podaci';
import { VrstaSastanka } from './sastanak-models';
import {
  imaKvorum,
  kadaJe,
  najranijiDan,
  nazivZapisnika,
  poceo,
  poMesecima,
  predlozenTermin,
  razliciteOdluke,
  rokPoziva,
  tacaka,
} from './pravila-sastanka';

function formaTermina(vrsta: VrstaSastanka, pocetak: Date | null, hitno = false) {
  return new FormGroup({
    vrsta: new FormControl(vrsta),
    pocetak: new FormControl(pocetak),
    hitno: new FormControl(hitno),
  });
}

describe('pravila sastanka', () => {
  beforeEach(() => vi.setSystemTime(SADA));
  afterEach(() => vi.useRealTimers());

  it('kadaJe i tacaka', () => {
    expect(kadaJe(zaDanaU(0, 20))).toBe('danas');
    expect(kadaJe(zaDanaU(-3))).toBe('pre 3 dana');
    expect(tacaka(1)).toBe('1 tačka');
    expect(tacaka(3)).toBe('3 tačke');
    expect(tacaka(5)).toBe('5 tačaka');
  });

  it('skupština bez hitnosti može najranije za tri dana, ostalo od danas', () => {
    expect(najranijiDan('skupstina', false)).toEqual(new Date(2026, 5, 13));
    expect(najranijiDan('skupstina', true)).toEqual(new Date(2026, 5, 10));
    expect(najranijiDan('zbor', false)).toEqual(new Date(2026, 5, 10));
  });

  it('predlog termina je u 18 časova, a sutra ako je to vreme danas prošlo', () => {
    expect(predlozenTermin('zbor', false)).toEqual(new Date(2026, 5, 10, 18));
    vi.setSystemTime(new Date(2026, 5, 10, 19));
    expect(predlozenTermin('zbor', false)).toEqual(new Date(2026, 5, 11, 18));
  });

  it('rok poziva: prošlost, manje od tri dana za skupštinu, hitna i zbor bez roka', () => {
    const bezStarog = rokPoziva(() => null);
    expect(bezStarog(formaTermina('zbor', null))).toBeNull();
    expect(bezStarog(formaTermina('zbor', new Date(2026, 5, 10, 11)))).toEqual({ proslost: true });
    expect(bezStarog(formaTermina('skupstina', new Date(2026, 5, 12, 18)))).toEqual({
      rokPoziva: true,
    });
    expect(bezStarog(formaTermina('skupstina', new Date(2026, 5, 13, 18)))).toBeNull();
    expect(bezStarog(formaTermina('skupstina', new Date(2026, 5, 11, 18), true))).toBeNull();
    expect(bezStarog(formaTermina('zbor', new Date(2026, 5, 11, 18)))).toBeNull();
  });

  it('rok poziva se ne proverava kad se termin, vrsta i hitnost nisu menjali', () => {
    const stari = { vrsta: 'skupstina' as const, pocetak: new Date(2026, 5, 11, 18), hitno: false };
    const pravilo = rokPoziva(() => stari);
    expect(pravilo(formaTermina('skupstina', new Date(2026, 5, 11, 18)))).toBeNull();
    expect(pravilo(formaTermina('skupstina', new Date(2026, 5, 11, 19)))).toEqual({
      rokPoziva: true,
    });
  });

  it('ista odluka ne sme uz dve tačke skupštine', () => {
    const forma = (vrsta: VrstaSastanka, odluke: (number | null)[]) =>
      new FormGroup({
        vrsta: new FormControl(vrsta),
        tacke: new FormControl(odluke.map((odlukaId) => ({ odlukaId }))),
      });
    expect(razliciteOdluke(forma('skupstina', [1, null, null, 2]))).toBeNull();
    expect(razliciteOdluke(forma('skupstina', [1, 1]))).toEqual({ isteOdluke: true });
    expect(razliciteOdluke(forma('zbor', [1, 1]))).toBeNull();
  });

  it('grupisanje po mesecima čuva redosled', () => {
    const jun = sastanak({ id: 1, pocetak: new Date(2026, 5, 20).toISOString() });
    const jul = sastanak({ id: 2, pocetak: new Date(2026, 6, 2).toISOString() });
    const jun2 = sastanak({ id: 3, pocetak: new Date(2026, 5, 25).toISOString() });
    expect(poMesecima([jun, jul, jun2])).toEqual([
      { mesec: 'jun 2026.', sastanci: [jun, jun2] },
      { mesec: 'jul 2026.', sastanci: [jul] },
    ]);
  });

  it('počeo, naziv zapisnika i kvorum', () => {
    expect(poceo({ pocetak: zaDanaU(0, 11) })).toBe(true);
    expect(poceo({ pocetak: zaDanaU(0, 13) })).toBe(false);
    expect(nazivZapisnika({ vrsta: 'zbor', pocetak: new Date(2026, 2, 12).toISOString() })).toBe(
      'Zapisnik sa zbora stanara, 12. mart 2026.',
    );
    expect(imaKvorum({ ukupno: 20, prag: 11, najavljeno: 15, prisutno: 11 })).toBe(true);
    expect(imaKvorum({ ukupno: 20, prag: 11, najavljeno: 15, prisutno: null })).toBe(false);
  });
});
