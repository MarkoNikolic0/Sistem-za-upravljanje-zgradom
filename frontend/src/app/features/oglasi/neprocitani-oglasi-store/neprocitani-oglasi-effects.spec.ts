import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import { pokreniEfekat } from '../../../../testiranje/efekti';
import { tokenZa } from '../../../../testiranje/sesija';
import { Uloga } from '../../auth/auth-models';
import { AuthStore } from '../../auth/sesija/auth-store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { OglasService } from '../oglas-service';
import {
  NeprocitaniOglasiActions,
  NeprocitaniOglasiApiActions,
} from './neprocitani-oglasi-actions';
import { neprocitaniOglasi } from './neprocitani-oglasi-effects';

const DO = '2026-06-10T10:00:00.000Z';

describe('neprocitani oglasi efekat', () => {
  let authStore: InstanceType<typeof AuthStore>;
  let listaOtvorena: BehaviorSubject<boolean>;
  let service: { brojNeprocitanih: () => unknown; procitajSve: () => unknown };
  let efekat: ReturnType<typeof pokreniEfekat>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    authStore = TestBed.inject(AuthStore);
    listaOtvorena = new BehaviorSubject(false);
    service = {
      brojNeprocitanih: vi.fn(() => of({ broj: 3, procitanoDo: DO })),
      procitajSve: vi.fn(() => of(undefined)),
    };
    const store = { select: () => listaOtvorena } as unknown as Store;
    efekat = pokreniEfekat((akcije) =>
      neprocitaniOglasi(akcije, store, authStore, service as unknown as OglasService),
    );
  });

  const prijavi = (uloga: Uloga) => authStore.postaviToken(tokenZa(uloga));

  it('serviser i admin ne prate oglase', () => {
    prijavi('serviser');
    efekat.posalji(VezaActions.povezan());
    prijavi('admin');
    efekat.posalji(VezaActions.novOglas());
    expect(service.brojNeprocitanih).not.toHaveBeenCalled();
  });

  it('nov oglas dok lista nije otvorena samo menja broj', () => {
    prijavi('stanar');
    efekat.posalji(VezaActions.novOglas());
    expect(efekat.izlaz).toEqual([NeprocitaniOglasiApiActions.brojUcitan({ broj: 3 })]);
    expect(service.procitajSve).not.toHaveBeenCalled();
  });

  it('otvaranje liste označava sve kao pročitano bez osvežavanja liste', () => {
    prijavi('upravnik');
    efekat.posalji(NeprocitaniOglasiActions.listaOtvorena());
    expect(efekat.izlaz).toEqual([
      NeprocitaniOglasiApiActions.oznaceniProcitani({ procitanoDo: DO, osveziListu: false }),
    ]);
  });

  it('nov oglas dok je lista otvorena označava pročitano i osvežava listu', () => {
    prijavi('stanar');
    listaOtvorena.next(true);
    efekat.posalji(VezaActions.novOglas());
    expect(efekat.izlaz).toEqual([
      NeprocitaniOglasiApiActions.oznaceniProcitani({ procitanoDo: DO, osveziListu: true }),
    ]);
  });
});
