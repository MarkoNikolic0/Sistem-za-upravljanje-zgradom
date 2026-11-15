import { FormControl } from '@angular/forms';
import { SADA } from '../../../testiranje/podaci';
import { StatusKvara } from './kvar-models';
import {
  dolazakUBuducnosti,
  jeHitan,
  jeZavrsen,
  najkasnijiDolazak,
  pratiRok,
  stanjeRoka,
} from './pravila-kvara';

const SVI: StatusKvara[] = [
  'prijavljen',
  'prihvacen',
  'dodeljen',
  'u_toku',
  'resen',
  'zatvoren',
  'odbijen',
  'povucen',
];

describe('pravila kvara', () => {
  beforeEach(() => vi.setSystemTime(SADA));
  afterEach(() => vi.useRealTimers());

  it('završen je samo zatvoren, odbijen i povučen kvar', () => {
    expect(SVI.filter(jeZavrsen)).toEqual(['zatvoren', 'odbijen', 'povucen']);
  });

  it('rok se prati dok serviser nije rešio kvar', () => {
    expect(SVI.filter(pratiRok)).toEqual(['prijavljen', 'prihvacen', 'dodeljen', 'u_toku']);
  });

  it('hitan je samo hitan kvar koji nije završen', () => {
    expect(jeHitan({ prioritet: 'hitno', status: 'u_toku' })).toBe(true);
    expect(jeHitan({ prioritet: 'hitno', status: 'zatvoren' })).toBe(false);
    expect(jeHitan({ prioritet: 'srednje', status: 'prijavljen' })).toBe(false);
  });

  it('stanjeRoka: prekoračen, danas, sutra ili ništa', () => {
    const rok = (d: Date) => d.toISOString();
    expect(stanjeRoka('dodeljen', rok(new Date(2026, 5, 10, 11)))).toBe('prekoracen');
    expect(stanjeRoka('dodeljen', rok(new Date(2026, 5, 10, 18)))).toBe('danas');
    expect(stanjeRoka('dodeljen', rok(new Date(2026, 5, 11, 9)))).toBe('sutra');
    expect(stanjeRoka('dodeljen', rok(new Date(2026, 5, 13)))).toBeNull();
    expect(stanjeRoka('resen', rok(new Date(2026, 5, 1)))).toBeNull();
  });

  it('najkasniji dolazak je rok, ali ne raniji od roka za hitan kvar', () => {
    expect(najkasnijiDolazak(new Date(2026, 5, 20).toISOString())).toEqual(new Date(2026, 5, 20));
    expect(najkasnijiDolazak(new Date(2026, 5, 9).toISOString())).toEqual(
      new Date(2026, 5, 12, 12),
    );
  });

  it('dolazak servisera mora biti u budućnosti', () => {
    const polje = new FormControl<Date | null>(null);
    expect(dolazakUBuducnosti(polje)).toBeNull();
    polje.setValue(new Date(2026, 5, 10, 12, 30));
    expect(dolazakUBuducnosti(polje)).toBeNull();
    polje.setValue(new Date(2026, 5, 10, 12, 0));
    expect(dolazakUBuducnosti(polje)).toEqual({ proslost: true });
  });
});
