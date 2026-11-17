import { FormControl } from '@angular/forms';
import { glasanje, SADA, zaDanaU } from '../../../testiranje/podaci';
import { OpcijaGlasanja } from './glasanje-models';
import {
  cekaGlas,
  cekanjeDoRoka,
  detaljIshoda,
  glasaliSuvlasnici,
  istice,
  isticeUskoro,
  objavaOdluke,
  razliciteOpcije,
  sledeciRok,
  udeo,
  uProcentima,
  vodece,
} from './pravila-glasanja';

const opcija = (id: number, tekst: string, brojGlasova: number | null) =>
  ({ id, tekst, brojGlasova }) as OpcijaGlasanja;

const odluka = glasanje({
  vrsta: 'odluka',
  vecina: 'obicna',
  pitanje: 'Zamena lifta',
  brojGlasaca: 12,
  brojZa: 5,
  ukupnoGlasaca: 20,
  zavrseno: true,
  ishod: 'odbijena',
  pragovi: { kvorum: 11, potrebnoZa: 7 },
  opcije: [opcija(1, 'Za', 5), opcija(2, 'Protiv', 7)],
});

describe('pravila glasanja', () => {
  beforeEach(() => vi.setSystemTime(SADA));
  afterEach(() => vi.useRealTimers());

  it('istice i isticeUskoro računaju kalendarske dane', () => {
    expect(istice(zaDanaU(0, 23))).toBe('ističe danas');
    expect(istice(zaDanaU(1, 8))).toBe('ističe sutra');
    expect(istice(zaDanaU(5))).toBe('ističe za 5 dana');
    expect(isticeUskoro(zaDanaU(1, 23))).toBe(true);
    expect(isticeUskoro(zaDanaU(2))).toBe(false);
  });

  it('glas čeka samo onaj ko sme da glasa a nije glasao', () => {
    expect(cekaGlas(glasanje())).toBe(true);
    expect(cekaGlas(glasanje({ mojGlas: 3 }))).toBe(false);
    expect(cekaGlas(glasanje({ smeDaGlasa: false }))).toBe(false);
  });

  it('sledeći rok je najbliži budući, a čekanje traje do sekund posle njega', () => {
    const sada = SADA.getTime();
    const rokovi = [zaDanaU(-1), zaDanaU(3), zaDanaU(1)].map((rok) => glasanje({ rok }));
    expect(sledeciRok(rokovi, sada)).toBe(new Date(zaDanaU(1)).getTime());
    expect(sledeciRok([glasanje({ rok: zaDanaU(-1) })], sada)).toBeNull();
    expect(cekanjeDoRoka(sada + 5_000, sada)).toBe(6_000);
    expect(cekanjeDoRoka(sada + 60 * 86_400_000, sada)).toBe(2_147_483_647);
  });

  it('udeo i procenat ne dele nulom', () => {
    expect(udeo(0, 0)).toBe(0);
    expect(udeo(25, 20)).toBe(1);
    expect(uProcentima(udeo(1, 3))).toBe('33%');
  });

  it('vodeće su sve opcije sa najviše glasova, a bez glasova nijedna', () => {
    expect(
      vodece(glasanje({ opcije: [opcija(1, 'A', 3), opcija(2, 'B', 3), opcija(3, 'C', 1)] })),
    ).toEqual([1, 2]);
    expect(vodece(glasanje({ opcije: [opcija(1, 'A', 0), opcija(2, 'B', null)] }))).toEqual([]);
  });

  it('opcije ankete moraju da se razlikuju bez obzira na velika slova i razmake', () => {
    expect(razliciteOpcije(new FormControl(['Plava', 'Zelena'], { nonNullable: true }))).toBeNull();
    expect(razliciteOpcije(new FormControl(['Plava', ' plava '], { nonNullable: true }))).toEqual({
      iste: true,
    });
  });

  it('poruka o suvlasnicima za jedan i više stanova', () => {
    expect(glasaliSuvlasnici(['6'])).toBe('Za stan 6 je glasao suvlasnik.');
    expect(glasaliSuvlasnici(['6', '7', '9'])).toBe('Za stanove 6, 7 i 9 su glasali suvlasnici.');
  });

  it('detalj ishoda za kvorum, običnu i dvotrećinsku većinu', () => {
    expect(detaljIshoda(glasanje())).toBe('');
    expect(detaljIshoda({ ...odluka, ishod: 'nema_kvoruma' })).toBe(
      'Potrebno je da glasa najmanje 11 stanova.',
    );
    expect(detaljIshoda(odluka)).toBe('Za 5 od 12 glasova, potrebno 7.');
    expect(
      detaljIshoda({ ...odluka, vecina: 'dve_trecine', pragovi: { kvorum: 11, potrebnoZa: 14 } }),
    ).toBe('Za 5, potrebno 14 od 20 stanova.');
  });

  it('objava odluke ima naslov po ishodu i skraćuje dug naslov', () => {
    const objava = objavaOdluke(odluka, 100);
    expect(objava.naslov).toBe('Nije usvojena odluka: Zamena lifta');
    expect(objava.tekst).toBe(
      'Skupština stambene zajednice nije usvojila odluku: „Zamena lifta“.\n' +
        'Za 5, Protiv 7; glasalo je 12 od 20 stanova. ' +
        'Za usvajanje je bilo potrebno više od pola glasova Za.',
    );
    const kratka = objavaOdluke({ ...odluka, ishod: 'usvojena' }, 20);
    expect(kratka.naslov).toHaveLength(20);
    expect(kratka.naslov.endsWith('…')).toBe(true);
    expect(objavaOdluke({ ...odluka, ishod: 'nema_kvoruma' }, 100).tekst).toContain(
      'Potrebno je bilo najmanje 11 stanova.',
    );
  });
});
