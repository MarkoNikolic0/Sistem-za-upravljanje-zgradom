import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { pokreniEfekat } from '../../../../testiranje/efekti';
import { Notifikacija } from '../notifikacija-models';
import { NotifikacijaService } from '../notifikacija-service';
import { NotifikacijeActions, NotifikacijeApiActions, VezaActions } from './notifikacije-actions';
import {
  neprocitane,
  prikaziToast,
  procitaj,
  procitajSve,
  ucitajStarije,
} from './notifikacije-effects';

const notifikacija = (id: number, procitano = false): Notifikacija => ({
  id,
  tip: 'kvar_status',
  tekst: `Obaveštenje ${id}`,
  link: `/kvarovi/${id}`,
  procitano,
  datumKreiranja: '2026-06-10T10:00:00.000Z',
});

describe('notifikacije efekti', () => {
  it('broj neprocitanih se učitava po povezivanju i novoj notifikaciji, ali ne kad je na stranici', () => {
    const service = { neprocitane: vi.fn(() => of({ broj: 2, linkovi: {} })) };
    const { posalji, izlaz } = pokreniEfekat((a) =>
      neprocitane(a, service as unknown as NotifikacijaService),
    );
    posalji(VezaActions.povezan());
    posalji(VezaActions.stigla({ notifikacija: notifikacija(1), naStranici: true }));
    posalji(VezaActions.stigla({ notifikacija: notifikacija(2), naStranici: false }));
    expect(service.neprocitane).toHaveBeenCalledTimes(2);
    expect(izlaz).toEqual([
      NotifikacijeApiActions.neprocitaneUcitane({ broj: 2, linkovi: {} }),
      NotifikacijeApiActions.neprocitaneUcitane({ broj: 2, linkovi: {} }),
    ]);
  });

  it('greška pri učitavanju broja ne prekida efekat', () => {
    const service = {
      neprocitane: vi
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('mreža')))
        .mockReturnValueOnce(of({ broj: 1, linkovi: {} })),
    };
    const { posalji, izlaz } = pokreniEfekat((a) =>
      neprocitane(a, service as unknown as NotifikacijaService),
    );
    posalji(VezaActions.povezan());
    posalji(VezaActions.povezan());
    expect(izlaz).toEqual([NotifikacijeApiActions.neprocitaneUcitane({ broj: 1, linkovi: {} })]);
  });

  it('pročitana notifikacija se ne šalje serveru ponovo', () => {
    const service = { procitaj: vi.fn(() => of(undefined)) };
    const { posalji, izlaz } = pokreniEfekat((a) =>
      procitaj(a, service as unknown as NotifikacijaService),
    );
    posalji(NotifikacijeActions.procitaj({ notifikacija: notifikacija(1, true) }));
    posalji(NotifikacijeActions.procitaj({ notifikacija: notifikacija(2) }));
    expect(service.procitaj).toHaveBeenCalledExactlyOnceWith(2);
    expect(izlaz).toEqual([NotifikacijeApiActions.procitana({ notifikacija: notifikacija(2) })]);
  });

  it('pročitaj sve ignoriše ponovljen klik dok zahtev traje i javlja grešku', () => {
    const odgovor = new Subject<void>();
    const service = {
      procitajSve: vi
        .fn()
        .mockReturnValueOnce(odgovor)
        .mockReturnValueOnce(throwError(() => new Error('mreža'))),
    };
    const { posalji, izlaz } = pokreniEfekat((a) =>
      procitajSve(a, service as unknown as NotifikacijaService),
    );
    posalji(NotifikacijeActions.procitajSve());
    posalji(NotifikacijeActions.procitajSve());
    odgovor.next();
    odgovor.complete();
    posalji(NotifikacijeActions.procitajSve());
    expect(service.procitajSve).toHaveBeenCalledTimes(2);
    expect(izlaz).toEqual([
      NotifikacijeApiActions.procitaneSve(),
      NotifikacijeApiActions.procitajSveNeuspelo(),
    ]);
  });

  it('starija se traže od poslednje prikazane i odbacuju kad se lista zatvori', () => {
    const odgovor = new Subject<{ stavke: Notifikacija[]; ukupno: number }>();
    const service = { notifikacije: vi.fn(() => odgovor) };
    const store = {
      select: vi
        .fn()
        .mockReturnValueOnce(of([notifikacija(9), notifikacija(4)]))
        .mockReturnValueOnce(of(true)),
    };
    const { posalji, izlaz } = pokreniEfekat((a) =>
      ucitajStarije(a, store as unknown as Store, service as unknown as NotifikacijaService),
    );
    posalji(NotifikacijeActions.ucitajStarije());
    expect(service.notifikacije).toHaveBeenCalledWith(true, 4);
    posalji(NotifikacijeActions.listaZatvorena());
    odgovor.next({ stavke: [notifikacija(3)], ukupno: 1 });
    expect(izlaz).toEqual([]);
  });

  it('toast se ne prikazuje na stranici obaveštenja, a na stranici notifikacije nema link', () => {
    const messageService = { add: vi.fn() };
    const router = { url: '/kvarovi/1' };
    const { posalji } = pokreniEfekat((a) =>
      prikaziToast(a, messageService as unknown as MessageService, router as Router),
    );
    posalji(VezaActions.stigla({ notifikacija: notifikacija(1), naStranici: true }));
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...notifikacija(1), link: null } }),
    );
    router.url = '/notifikacije';
    posalji(VezaActions.stigla({ notifikacija: notifikacija(2), naStranici: false }));
    expect(messageService.add).toHaveBeenCalledOnce();
  });
});
