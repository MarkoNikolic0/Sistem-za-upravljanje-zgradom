import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { Observable, of } from 'rxjs';
import type { Mock } from 'vitest';
import { kvar } from '../../../../testiranje/podaci';
import { Stranica } from '../../../shared/liste/stranica';
import { kvarEvents } from '../kvar-events';
import { KomentarKvara } from '../kvar-models';
import { KomentariKvaraService } from './komentari-kvara-service';
import { KomentariKvaraStore } from './komentari-kvara-store';

const korisnik = { id: 1, ime: 'Ana', prezime: 'Anić', uloga: 'stanar' as const };
const komentar = (id: number): KomentarKvara => ({
  id,
  tekst: `Komentar ${id}`,
  datumKreiranja: '2026-06-10T10:00:00.000Z',
  korisnik,
});
const strana = (...ids: number[]) =>
  of<Stranica<KomentarKvara>>({ stavke: ids.map(komentar), ukupno: ids.length });

describe('KomentariKvaraStore', () => {
  let store: InstanceType<typeof KomentariKvaraStore>;
  let komentari: Mock<() => Observable<Stranica<KomentarKvara>>>;
  let dodaj: Mock<() => Observable<KomentarKvara>>;
  let obrisi: Mock<() => Observable<void>>;

  const ids = () => store.komentari().map((k) => k.id);

  beforeEach(() => {
    komentari = vi.fn(() => strana(5, 3));
    dodaj = vi.fn();
    obrisi = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      providers: [
        KomentariKvaraStore,
        { provide: KomentariKvaraService, useValue: { komentari, dodaj, obrisi } },
      ],
    });
    store = TestBed.inject(KomentariKvaraStore);
    store.ucitaj(7);
  });

  it('osvežavanje i slanje istog komentara ga ne dupliraju, a redosled ostaje po id-ju', async () => {
    komentari.mockReturnValue(strana(9, 8, 6, 5));
    store.osveziNove();
    expect(ids()).toEqual([3, 5, 6, 8, 9]);

    dodaj.mockReturnValue(of(komentar(9)));
    await store.dodaj('Komentar 9');
    expect(ids()).toEqual([3, 5, 6, 8, 9]);

    dodaj.mockReturnValue(of(komentar(10)));
    await store.dodaj('Komentar 10');
    expect(ids()).toEqual([3, 5, 6, 8, 9, 10]);
  });

  it('obrisan komentar se ne vraća iz osvežavanja koje ga još sadrži', async () => {
    await store.obrisi(5);
    expect(ids()).toEqual([3]);
    komentari.mockReturnValue(strana(6, 5, 3));
    store.osveziNove();
    expect(ids()).toEqual([3, 6]);
  });

  it('osvežavanje ne dodaje komentare starije od učitanih', () => {
    komentari.mockReturnValue(strana(6, 5, 3, 2));
    store.osveziNove();
    expect(ids()).toEqual([3, 5, 6]);
  });

  it('razlog promene statusa iz izmenjenog kvara se dodaje jednom', () => {
    const izmenjen = kvar({
      id: 7,
      istorija: [
        {
          id: 1,
          status: 'u_toku',
          datum: '2026-06-10T11:00:00.000Z',
          korisnik,
          komentar: { id: 6, tekst: 'Nije rešeno' },
        },
      ],
    });
    const dispatcher = TestBed.inject(Dispatcher);
    dispatcher.dispatch(kvarEvents.azuriran({ kvar: izmenjen, prethodni: null }));
    dispatcher.dispatch(kvarEvents.azuriran({ kvar: izmenjen, prethodni: null }));
    expect(ids()).toEqual([3, 5, 6]);
  });
});
