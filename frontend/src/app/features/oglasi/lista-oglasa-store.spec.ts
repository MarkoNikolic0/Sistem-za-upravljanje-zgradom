import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { oglas } from '../../../testiranje/podaci';
import { Stranica } from '../../shared/liste/stranica';
import { ListaOglasaStore } from './lista-oglasa-store';
import { Oglas } from './oglas-models';
import { OglasService } from './oglas-service';

describe('ListaOglasaStore osvežavanje na promenu', () => {
  let store: InstanceType<typeof ListaOglasaStore>;
  let lista: Mock<() => Observable<Stranica<Oglas>>>;
  let procitaj: Mock<(id: number) => Observable<Oglas>>;
  let sakrij: Mock<(id: number) => Observable<Oglas>>;

  beforeEach(() => {
    lista = vi.fn(() => of({ stavke: [oglas({ id: 1 }), oglas({ id: 2 })], ukupno: 2 }));
    procitaj = vi.fn((id: number) => of(oglas({ id, naslov: `Izmenjen ${id}` })));
    sakrij = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ListaOglasaStore,
        { provide: OglasService, useValue: { lista, procitaj, sakrij } },
      ],
    });
    store = TestBed.inject(ListaOglasaStore);
    TestBed.tick();
  });

  it('zameni samo izmenjen oglas sa liste, bez učitavanja cele liste', async () => {
    await store.osveziOglase([1, 50]);

    expect(procitaj).toHaveBeenCalledExactlyOnceWith(1);
    expect(store.oglasi().map((o) => o.naslov)).toEqual(['Izmenjen 1', oglas().naslov]);
    expect(lista).toHaveBeenCalledOnce();
  });

  it('obrisan ili sakriven oglas (404) ponovo učitava listu', async () => {
    procitaj.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    await store.osveziOglase([2]);
    expect(lista).toHaveBeenCalledTimes(2);
  });

  it('ne prepisuje oglas koji je korisnik sakrio dok se osvežavanje učitavalo', async () => {
    const odgovor = new Subject<Oglas>();
    procitaj.mockReturnValueOnce(odgovor);
    const osvezavanje = store.osveziOglase([1]);
    sakrij.mockReturnValueOnce(of(oglas({ id: 1, naslov: 'Sakriven' })));
    await store.sakrij(1, 'Neprikladno');

    odgovor.next(oglas({ id: 1, naslov: 'Staro' }));
    odgovor.complete();
    await osvezavanje;

    expect(store.oglasi()[0].naslov).toBe('Sakriven');
  });
});
