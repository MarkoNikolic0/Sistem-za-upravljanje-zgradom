import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { kvar } from '../../../testiranje/podaci';
import { Stranica } from '../../shared/liste/stranica';
import { kvarEvents } from './kvar-events';
import { Kvar } from './kvar-models';
import { KvarService } from './kvar-service';
import { ListaKvarovaStore } from './lista-kvarova-store';

describe('ListaKvarovaStore', () => {
  let store: InstanceType<typeof ListaKvarovaStore>;
  let lista: Mock<() => Observable<Stranica<Kvar>>>;
  let dispatcher: Dispatcher;

  const strana = (stavke: Kvar[], ukupno = stavke.length) => of<Stranica<Kvar>>({ stavke, ukupno });

  beforeEach(() => {
    lista = vi.fn<() => Observable<Stranica<Kvar>>>(() =>
      strana([kvar({ id: 1 }), kvar({ id: 2 })], 12),
    );
    TestBed.configureTestingModule({
      providers: [ListaKvarovaStore, { provide: KvarService, useValue: { lista } }],
    });
    store = TestBed.inject(ListaKvarovaStore);
    dispatcher = TestBed.inject(Dispatcher);
  });

  it('prvo otvaranje učitava listu, ponovno ne', () => {
    store.prikaziListu();
    store.prikaziListu();
    expect(lista).toHaveBeenCalledOnce();
    expect(lista).toHaveBeenCalledWith({
      stanje: 'aktivni',
      kategorija: null,
      prioritet: null,
      zgradaId: null,
      strana: 1,
      poStrani: 10,
    });
    expect(store.kvarovi().map((k) => k.id)).toEqual([1, 2]);
    expect(store.ukupno()).toBe(12);
    expect(store.isFulfilled()).toBe(true);
  });

  it('promena filtera vraća na prvu stranu', () => {
    store.promeniStranu(2);
    store.promeniKategoriju('lift');
    expect(lista).toHaveBeenLastCalledWith(
      expect.objectContaining({ kategorija: 'lift', strana: 1 }),
    );
    store.promeniStranu(2);
    store.promeniStanje('zavrseni');
    expect(lista).toHaveBeenLastCalledWith(
      expect.objectContaining({ stanje: 'zavrseni', kategorija: 'lift', strana: 1 }),
    );
    store.ponistiFiltere();
    expect(lista).toHaveBeenLastCalledWith(
      expect.objectContaining({ stanje: 'zavrseni', kategorija: null, prioritet: null }),
    );
  });

  it('prazna strana posle brisanja vraća na prethodnu', () => {
    lista.mockReturnValueOnce(strana([], 10));
    store.promeniStranu(2);
    expect(lista).toHaveBeenCalledTimes(2);
    expect(store.strana()).toBe(1);
    expect(store.kvarovi()).toHaveLength(2);
  });

  it('greška pri učitavanju daje poruku', () => {
    lista.mockReturnValueOnce(throwError(() => new Error('mreža')));
    store.ucitaj();
    expect(store.error()).toBe('Kvarovi trenutno ne mogu da se učitaju.');
  });

  it('novi zahtev otkazuje stari, pa se prikazuje samo poslednji odgovor', () => {
    const spor = new Subject<Stranica<Kvar>>();
    lista.mockReturnValueOnce(spor);
    store.promeniKategoriju('lift');
    store.promeniKategoriju('struja');
    spor.next({ stavke: [kvar({ id: 99 })], ukupno: 1 });
    expect(store.kvarovi().map((k) => k.id)).toEqual([1, 2]);
  });

  it('prijava novog kvara vraća filtere i učitava listu ako je otvorena', () => {
    dispatcher.dispatch(kvarEvents.prijavljen(kvar({ id: 3 })));
    expect(lista).not.toHaveBeenCalled();

    store.promeniPrioritet('hitno');
    lista.mockClear();
    dispatcher.dispatch(kvarEvents.prijavljen(kvar({ id: 3 })));
    expect(lista).toHaveBeenCalledOnce();
    expect(lista).toHaveBeenCalledWith(expect.objectContaining({ prioritet: null, strana: 1 }));
  });

  it('izmena kvara na strani menja red bez učitavanja, a izlazak iz filtera učitava', () => {
    store.prikaziListu();
    lista.mockClear();
    dispatcher.dispatch(kvarEvents.azuriran(kvar({ id: 2, status: 'u_toku' })));
    expect(store.kvarovi()[1].status).toBe('u_toku');
    expect(lista).not.toHaveBeenCalled();

    dispatcher.dispatch(kvarEvents.azuriran(kvar({ id: 2, status: 'zatvoren' })));
    expect(lista).toHaveBeenCalledOnce();
  });
});
