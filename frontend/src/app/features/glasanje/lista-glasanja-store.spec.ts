import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { glasanje, SADA } from '../../../testiranje/podaci';
import { Stranica } from '../../shared/liste/stranica';
import { Glasanje } from './glasanje-models';
import { GlasanjeService } from './glasanje-service';
import { ListaGlasanjaStore } from './lista-glasanja-store';

const SAT_MS = 60 * 60 * 1000;

describe('ListaGlasanjaStore', () => {
  let store: InstanceType<typeof ListaGlasanjaStore>;
  let lista: Mock<() => Observable<Stranica<Glasanje>>>;
  let glasaj: Mock<(id: number) => Observable<Glasanje>>;
  let procitaj: Mock<(id: number) => Observable<Glasanje>>;
  let zatvori: Mock<(id: number) => Observable<Glasanje>>;

  const pokreni = (stavke: Glasanje[]) => {
    lista = vi.fn(() => of({ stavke, ukupno: stavke.length }));
    TestBed.configureTestingModule({
      providers: [
        ListaGlasanjaStore,
        { provide: GlasanjeService, useValue: { lista, glasaj, procitaj, zatvori } },
        { provide: Store, useValue: { dispatch: vi.fn() } },
      ],
    });
    store = TestBed.inject(ListaGlasanjaStore);
    TestBed.tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SADA);
    glasaj = vi.fn();
    procitaj = vi.fn();
    zatvori = vi.fn(() => of(glasanje()));
  });

  afterEach(() => vi.useRealTimers());

  it('glas na jednoj kartici ne zaključava druge', async () => {
    pokreni([glasanje({ id: 1 }), glasanje({ id: 2 })]);
    const prvi = new Subject<Glasanje>();
    const drugi = new Subject<Glasanje>();
    glasaj.mockReturnValueOnce(prvi).mockReturnValueOnce(drugi);

    const ishodPrvog = store.glasaj(store.glasanja()[0], 5);
    const ishodDrugog = store.glasaj(store.glasanja()[1], 6);
    expect(store.glasoviUToku()).toEqual([1, 2]);

    prvi.next(glasanje({ id: 1, mojGlas: 5 }));
    prvi.complete();
    expect(await ishodPrvog).toBe('zabelezen');
    expect(store.glasoviUToku()).toEqual([2]);

    drugi.next(glasanje({ id: 2, mojGlas: 6 }));
    drugi.complete();
    expect(await ishodDrugog).toBe('zabelezen');
    expect(store.glasoviUToku()).toEqual([]);
    expect(store.glasanja().map((g) => g.mojGlas)).toEqual([5, 6]);
  });

  it('bez veze glas ostaje nezabeležen uz grešku na kartici, a odbijen osvežava listu', async () => {
    pokreni([glasanje({ id: 1 })]);
    glasaj.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(await store.glasaj(store.glasanja()[0], 5)).toBe('bez-veze');
    expect(store.greskaGlasa()?.id).toBe(1);
    expect(lista).toHaveBeenCalledOnce();

    glasaj.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { message: 'Glasanje je završeno.' } }),
      ),
    );
    expect(await store.glasaj(store.glasanja()[0], 5)).toBe('odbijen');
    expect(store.poruka()).toEqual({ tip: 'greska', tekst: 'Glasanje je završeno.' });
    expect(lista).toHaveBeenCalledTimes(2);
  });

  it('kad rok prođe, kartica se osvežava na mestu', () => {
    const rok = new Date(SADA.getTime() + SAT_MS).toISOString();
    pokreni([
      glasanje({ id: 1, rok }),
      glasanje({ id: 2, rok: new Date(SADA.getTime() + 5 * SAT_MS).toISOString() }),
    ]);
    procitaj.mockReturnValueOnce(of(glasanje({ id: 1, rok, zavrseno: true, smeDaGlasa: false })));

    vi.advanceTimersByTime(SAT_MS - 1);
    expect(procitaj).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    TestBed.tick();

    expect(procitaj).toHaveBeenCalledExactlyOnceWith(1);
    expect(store.glasanja().map((g) => g.zavrseno)).toEqual([true, false]);
    expect(lista).toHaveBeenCalledOnce();
  });

  it('obrisano glasanje posle roka ponovo učitava listu', () => {
    pokreni([glasanje({ id: 1, rok: new Date(SADA.getTime() + SAT_MS).toISOString() })]);
    procitaj.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    vi.advanceTimersByTime(SAT_MS + 1_000);
    expect(lista).toHaveBeenCalledTimes(2);
  });

  it('bez veze posle roka lista ostaje, a kad server još ne zatvori glasanje, pokušava ponovo', () => {
    const rok = new Date(SADA.getTime() + SAT_MS).toISOString();
    pokreni([glasanje({ id: 1, rok })]);
    procitaj
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of(glasanje({ id: 1, rok })))
      .mockReturnValueOnce(of(glasanje({ id: 1, rok, zavrseno: true })));

    vi.advanceTimersByTime(SAT_MS + 1_000);
    expect(lista).toHaveBeenCalledOnce();
    expect(store.glasanja()).toHaveLength(1);
    expect(store.error()).toBeNull();

    store.osveziIstekla([...store.glasanja()]);
    TestBed.tick();
    vi.advanceTimersByTime(30_000);
    TestBed.tick();
    vi.advanceTimersByTime(30_000);
    TestBed.tick();
    expect(procitaj).toHaveBeenCalledTimes(3);
    expect(store.glasanja()[0].zavrseno).toBe(true);
  });

  it('ponovljen klik na Zatvori šalje jedan zahtev', async () => {
    pokreni([glasanje({ id: 1, smeDaZatvori: true })]);
    const odgovor = new Subject<Glasanje>();
    zatvori.mockReturnValueOnce(odgovor);
    const prvi = store.zatvori(1);
    expect(await store.zatvori(1)).toBe(false);
    odgovor.next(glasanje());
    odgovor.complete();
    expect(await prvi).toBe(true);
    expect(zatvori).toHaveBeenCalledOnce();
  });
});

describe('ListaGlasanjaStore osvežavanje na promenu', () => {
  let store: InstanceType<typeof ListaGlasanjaStore>;
  let lista: Mock<() => Observable<Stranica<Glasanje>>>;
  let glasaj: Mock<(id: number) => Observable<Glasanje>>;
  let procitaj: Mock<(id: number) => Observable<Glasanje>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SADA);
    lista = vi.fn(() => of({ stavke: [glasanje({ id: 1 }), glasanje({ id: 2 })], ukupno: 2 }));
    glasaj = vi.fn();
    procitaj = vi.fn((id: number) => of(glasanje({ id, pitanje: `Novo ${id}` })));
    TestBed.configureTestingModule({
      providers: [
        ListaGlasanjaStore,
        { provide: GlasanjeService, useValue: { lista, glasaj, procitaj } },
        { provide: Store, useValue: { dispatch: vi.fn() } },
      ],
    });
    store = TestBed.inject(ListaGlasanjaStore);
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  it('ponovo učita samo promenjene kartice sa liste, bez cele liste', async () => {
    await store.osveziGlasanja([2, 99]);

    expect(procitaj).toHaveBeenCalledExactlyOnceWith(2);
    expect(store.glasanja().map((g) => g.pitanje)).toEqual([glasanje().pitanje, 'Novo 2']);
    expect(lista).toHaveBeenCalledOnce();
  });

  it('ne pita server za glasanja kojih nema na listi', async () => {
    await store.osveziGlasanja([99]);
    expect(procitaj).not.toHaveBeenCalled();
  });

  it('ne prepisuje karticu na kojoj je sopstveni glas krenuo dok se osvežavanje učitavalo', async () => {
    const odgovor = new Subject<Glasanje>();
    procitaj.mockReturnValueOnce(odgovor);
    const osvezavanje = store.osveziGlasanja([1]);
    glasaj.mockReturnValueOnce(of(glasanje({ id: 1, mojGlas: 5 })));
    await store.glasaj(store.glasanja()[0], 5);

    odgovor.next(glasanje({ id: 1, mojGlas: null, pitanje: 'Staro' }));
    odgovor.complete();
    await osvezavanje;

    expect(store.glasanja()[0].mojGlas).toBe(5);
  });

  it('obrisano glasanje (404) ponovo učitava listu', async () => {
    procitaj.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    await store.osveziGlasanja([1]);
    expect(lista).toHaveBeenCalledTimes(2);
  });
});
