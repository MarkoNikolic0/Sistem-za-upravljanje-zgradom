import { TestBed } from '@angular/core/testing';
import { signalStore, withMethods, withState } from '@ngrx/signals';
import { Observable, of, throwError } from 'rxjs';
import { withRequestStatus } from '../stanje/with-request-status';
import { Stranica, UpitStrane } from './stranica';
import { ucitavanjeStrane } from './ucitavanje-strane';
import { withPaginacija } from './with-paginacija';

describe('ucitavanjeStrane', () => {
  let odgovor: (upit: UpitStrane & { vrsta: string }) => Observable<Stranica<number>>;

  const TestStore = signalStore(
    withState({ brojevi: [] as number[], vrsta: 'sve' }),
    withRequestStatus(),
    withPaginacija(2),
    withMethods((store) =>
      ucitavanjeStrane(
        store,
        (strana) => odgovor({ vrsta: store.vrsta(), ...strana }),
        (brojevi) => ({ brojevi }),
        'Nije učitano.',
      ),
    ),
  );

  let store: InstanceType<typeof TestStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestStore] });
    store = TestBed.inject(TestStore);
  });

  it('upisuje stavke i ukupan broj', () => {
    odgovor = () => of({ stavke: [1, 2], ukupno: 5 });
    store.ucitaj();
    expect(store.brojevi()).toEqual([1, 2]);
    expect(store.ukupno()).toBe(5);
    expect(store.isFulfilled()).toBe(true);
  });

  it('prazna strana posle brisanja vraća na prethodnu', () => {
    odgovor = ({ strana }) =>
      of(strana === 3 ? { stavke: [], ukupno: 4 } : { stavke: [3, 4], ukupno: 4 });
    store.promeniStranu(3);
    expect(store.strana()).toBe(2);
    expect(store.brojevi()).toEqual([3, 4]);
  });

  it('promena filtera kreće od prve strane', () => {
    const upiti: unknown[] = [];
    odgovor = (upit) => {
      upiti.push(upit);
      return of({ stavke: [], ukupno: 0 });
    };
    store.promeniStranu(1);
    store.odPrveStrane({ vrsta: 'nove' });
    expect(upiti.at(-1)).toEqual({ vrsta: 'nove', strana: 1, poStrani: 2 });
  });

  it('greška daje poruku', () => {
    odgovor = () => throwError(() => new Error());
    store.ucitaj();
    expect(store.error()).toBe('Nije učitano.');
  });
});
