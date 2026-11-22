import {
  glasanje,
  kvar,
  oglas,
  pregled,
  SADA,
  sastanak,
  zaDanaU,
} from '../../../../testiranje/podaci';
import { PodaciDanas, predstoji, zaDanas } from './za-danas';

const prazno: PodaciDanas = {
  pregled: null,
  sastanci: [],
  glasanja: [],
  oglasi: [],
  zaPotvrdu: null,
};
const kljucevi = (podaci: Partial<PodaciDanas>) =>
  zaDanas({ ...prazno, ...podaci }).map((s) => s.kljuc);

describe('zaDanas', () => {
  beforeEach(() => vi.setSystemTime(SADA));
  afterEach(() => vi.useRealTimers());

  it('bez ičega nema stavki', () => {
    expect(zaDanas(prazno)).toEqual([]);
    expect(kljucevi({ pregled: pregled() })).toEqual([]);
  });

  it('upravniku ređa stavke od najvažnije', () => {
    expect(
      kljucevi({
        pregled: pregled({
          hitniKvarovi: 2,
          noviKvarovi: 3,
          zahteviNaCekanju: 1,
          neobjavljeneOdluke: 1,
          sastanakBezZapisnika: sastanak({ id: 4, vrsta: 'zbor', pocetak: zaDanaU(-3) }),
        }),
      }),
    ).toEqual(['hitni', 'zahtevi', 'novi', 'odluke', 'zapisnik']);
  });

  it('rešen kvar koji čeka potvrdu vodi na prvi takav kvar, sa brojem kad ih je više', () => {
    expect(kljucevi({ zaPotvrdu: { stavke: [], ukupno: 0 } })).toEqual([]);
    const [jedan] = zaDanas({
      ...prazno,
      zaPotvrdu: { stavke: [kvar({ id: 9, status: 'resen' })], ukupno: 1 },
    });
    expect(jedan).toMatchObject({
      kljuc: 'potvrda',
      oznaka: 'Čeka tvoju potvrdu',
      naslov: 'Curi slavina',
      putanja: ['/kvarovi', 9],
    });
    const [vise] = zaDanas({
      ...prazno,
      zaPotvrdu: { stavke: [kvar({ id: 9, status: 'resen' })], ukupno: 3 },
    });
    expect(vise.oznaka).toBe('3 kvara čekaju tvoju potvrdu');
  });

  it('tekst stavke koristi pravu množinu i putanju', () => {
    const [hitni] = zaDanas({ ...prazno, pregled: pregled({ hitniKvarovi: 2 }) });
    expect(hitni).toMatchObject({ naslov: '2 hitna kvara', putanja: ['/kvarovi'], hitno: true });
  });

  it('sastanak sutra je ispred glasanja, a sastanak za 6 dana iza', () => {
    const glas = glasanje({ rok: zaDanaU(4) });
    expect(
      kljucevi({ sastanci: [sastanak({ pocetak: zaDanaU(1, 18) })], glasanja: [glas] }),
    ).toEqual(['sastanak', 'glasanje']);
    expect(
      kljucevi({ sastanci: [sastanak({ pocetak: zaDanaU(6, 18) })], glasanja: [glas] }),
    ).toEqual(['glasanje', 'sastanak']);
  });

  it('sastanak koji je prošao ili je dalji od 7 dana se ne prikazuje', () => {
    expect(kljucevi({ sastanci: [sastanak({ pocetak: zaDanaU(0, 10) })] })).toEqual([]);
    expect(kljucevi({ sastanci: [sastanak({ pocetak: zaDanaU(8, 18) })] })).toEqual([]);
    const [s] = zaDanas({ ...prazno, sastanci: [sastanak({ pocetak: zaDanaU(0, 18) })] });
    expect(s.oznaka).toBe('Danas u 18:00');
  });

  it('glasanje: samo ona koja čekaju glas, sa brojem i rokom prvog', () => {
    const [stavka] = zaDanas({
      ...prazno,
      glasanja: [
        glasanje({ id: 1, rok: zaDanaU(1) }),
        glasanje({ id: 2, mojGlas: 5 }),
        glasanje({ id: 3, rok: zaDanaU(3) }),
      ],
    });
    expect(stavka).toMatchObject({ oznaka: '2 glasanja čekaju tvoj glas', opis: 'Ističe sutra' });
    expect(kljucevi({ glasanja: [glasanje({ smeDaGlasa: false })] })).toEqual([]);
  });

  it('obaveštenje: samo novije od 3 dana, važno je ispred ostalog', () => {
    const vazno = oglas({ vrsta: 'obavestenje', vazno: true, datumKreiranja: zaDanaU(-1) });
    expect(kljucevi({ oglasi: [vazno], pregled: pregled({ noviKvarovi: 1 }) })).toEqual([
      'obavestenje',
      'novi',
    ]);
    expect(
      kljucevi({ oglasi: [oglas({ vrsta: 'obavestenje', datumKreiranja: zaDanaU(-4) })] }),
    ).toEqual([]);
    expect(kljucevi({ oglasi: [oglas({ vrsta: 'prodaja' })] })).toEqual([]);
  });

  it('predstoji', () => {
    expect(predstoji({ pocetak: zaDanaU(0, 13) })).toBe(true);
    expect(predstoji({ pocetak: zaDanaU(0, 11) })).toBe(false);
  });
});
