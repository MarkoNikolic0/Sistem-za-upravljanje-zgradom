import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { pokreniEfekat } from '../../../../testiranje/efekti';
import { glasanje, SADA, zaDanaU } from '../../../../testiranje/podaci';
import { tokenZa } from '../../../../testiranje/sesija';
import { AuthStore } from '../../auth/sesija/auth-store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { GlasanjeService } from '../glasanje-service';
import { CekaGlasActions, CekaGlasApiActions } from './ceka-glas-actions';
import { cekaGlasRok, cekaGlasUcitaj } from './ceka-glas-effects';
import { cekaGlasFeature } from './ceka-glas-reducer';

describe('čeka glas', () => {
  afterEach(() => vi.useRealTimers());

  describe('učitavanje', () => {
    let authStore: InstanceType<typeof AuthStore>;
    let lista: () => unknown;
    let efekat: ReturnType<typeof pokreniEfekat>;

    beforeEach(() => {
      vi.setSystemTime(SADA);
      TestBed.configureTestingModule({ providers: [provideHttpClient()] });
      authStore = TestBed.inject(AuthStore);
      lista = vi.fn(() =>
        of({
          stavke: [
            glasanje({ id: 1, rok: zaDanaU(5) }),
            glasanje({ id: 2, rok: zaDanaU(2), mojGlas: 4 }),
            glasanje({ id: 3, rok: zaDanaU(3) }),
          ],
          ukupno: 3,
        }),
      );
      efekat = pokreniEfekat((akcije) =>
        cekaGlasUcitaj(akcije, authStore, { lista } as unknown as GlasanjeService, document),
      );
    });

    it('pamti da ima glasanja za glas i najbliži rok među njima', () => {
      authStore.postaviToken(tokenZa('stanar'));
      efekat.posalji(VezaActions.povezan());
      expect(efekat.izlaz).toEqual([
        CekaGlasApiActions.ucitano({ ima: true, sledeciRok: Date.parse(zaDanaU(3)) }),
      ]);
    });

    it('serviser ne glasa, pa se ništa ne učitava', () => {
      authStore.postaviToken(tokenZa('serviser'));
      efekat.posalji(CekaGlasActions.glasanjaPromenjena());
      expect(lista).not.toHaveBeenCalled();
    });

    it('učitava se i na novo glasanje, ali ne na drugu notifikaciju', () => {
      authStore.postaviToken(tokenZa('upravnik'));
      const stigla = (tip: 'glasanje_novo' | 'kvar_status') =>
        VezaActions.stigla({
          notifikacija: { id: 1, tip, tekst: '', link: null, procitano: false, datumKreiranja: '' },
          naStranici: false,
        });
      efekat.posalji(stigla('kvar_status'));
      efekat.posalji(stigla('glasanje_novo'));
      expect(lista).toHaveBeenCalledOnce();
    });
  });

  it('kad istekne najbliži rok, glasanja se učitavaju ponovo', () => {
    vi.useFakeTimers({ now: SADA });
    const efekat = pokreniEfekat((akcije) => cekaGlasRok(akcije));
    efekat.posalji(CekaGlasApiActions.ucitano({ ima: true, sledeciRok: SADA.getTime() + 60_000 }));
    vi.advanceTimersByTime(60_000);
    expect(efekat.izlaz).toEqual([]);
    vi.advanceTimersByTime(1_000);
    expect(efekat.izlaz).toEqual([CekaGlasActions.rokIstekao()]);
  });

  it('odjava zaustavlja čekanje roka i briše stanje', () => {
    vi.useFakeTimers({ now: SADA });
    const efekat = pokreniEfekat((akcije) => cekaGlasRok(akcije));
    efekat.posalji(CekaGlasApiActions.ucitano({ ima: true, sledeciRok: SADA.getTime() + 1_000 }));
    efekat.posalji(VezaActions.zaustavi());
    vi.advanceTimersByTime(5_000);
    expect(efekat.izlaz).toEqual([]);

    const ima = cekaGlasFeature.reducer(
      undefined,
      CekaGlasApiActions.ucitano({ ima: true, sledeciRok: null }),
    );
    expect(cekaGlasFeature.reducer(ima, VezaActions.zaustavi()).ima).toBe(false);
  });
});
