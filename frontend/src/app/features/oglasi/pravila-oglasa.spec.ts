import { oglas, SADA, zaDanaU } from '../../../testiranje/podaci';
import { jeNov, predlozenRok } from './pravila-oglasa';

describe('pravila oglasa', () => {
  beforeEach(() => vi.setSystemTime(SADA));
  afterEach(() => vi.useRealTimers());

  it('rok od 30 dana se predlaže samo za prodaju, traženje i izgubljeno', () => {
    expect(predlozenRok('prodaja')).toEqual(new Date(2026, 6, 10));
    expect(predlozenRok('trazim')).toEqual(new Date(2026, 6, 10));
    expect(predlozenRok('izgubljeno')).toEqual(new Date(2026, 6, 10));
    expect(predlozenRok('obavestenje')).toBeNull();
    expect(predlozenRok(null)).toBeNull();
  });

  describe('jeNov', () => {
    const otvoreno = zaDanaU(-2);
    const nov = oglas({ datumKreiranja: zaDanaU(-1), autor: { ...oglas().autor, id: 7 } });

    it('tuđ vidljiv oglas objavljen posle poslednjeg otvaranja je nov', () => {
      expect(jeNov(nov, otvoreno, 3)).toBe(true);
    });

    it('nije nov: svoj, sakriven, istekao, stariji ili kad lista nije otvarana', () => {
      expect(jeNov(nov, otvoreno, 7)).toBe(false);
      expect(jeNov({ ...nov, datumSakrivanja: zaDanaU(0) }, otvoreno, 3)).toBe(false);
      expect(jeNov({ ...nov, isteklo: true }, otvoreno, 3)).toBe(false);
      expect(jeNov({ ...nov, datumKreiranja: zaDanaU(-3) }, otvoreno, 3)).toBe(false);
      expect(jeNov(nov, null, 3)).toBe(false);
    });
  });
});
