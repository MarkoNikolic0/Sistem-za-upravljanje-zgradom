import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { Observable, of, Subject } from 'rxjs';
import type { Mock } from 'vitest';
import { kvar } from '../../../testiranje/podaci';
import { DetaljKvaraStore } from './detalj-kvara-store';
import { kvarEvents } from './kvar-events';
import { KvarDetalj, StanjePracenja } from './kvar-models';
import { KvarService } from './kvar-service';

describe('DetaljKvaraStore', () => {
  let store: InstanceType<typeof DetaljKvaraStore>;
  let nadjiKvar: Mock<() => Observable<KvarDetalj>>;
  let prihvati: Mock<() => Observable<KvarDetalj>>;
  let prati: Mock<() => Observable<StanjePracenja>>;
  let postaviPrioritet: Mock<() => Observable<KvarDetalj>>;
  const azurirani: { kvar: KvarDetalj; prethodni: KvarDetalj | null }[] = [];

  beforeEach(() => {
    azurirani.length = 0;
    nadjiKvar = vi.fn(() => of(kvar({ id: 7, status: 'prijavljen', smeDaPrati: true })));
    prihvati = vi.fn();
    prati = vi.fn(() => of({ pratim: true, brojPratilaca: 2 }));
    postaviPrioritet = vi.fn(() => of(kvar({ id: 7, status: 'prihvacen', prioritet: 'hitno' })));
    TestBed.configureTestingModule({
      providers: [
        DetaljKvaraStore,
        { provide: KvarService, useValue: { nadjiKvar, prihvati, prati, postaviPrioritet } },
      ],
    });
    store = TestBed.inject(DetaljKvaraStore);
    TestBed.inject(Events)
      .on(kvarEvents.azuriran)
      .subscribe(({ payload }) => azurirani.push(payload));
    store.ucitaj(7);
  });

  it('dok akcija traje, ponovljen klik ne šalje novi zahtev', () => {
    const odgovor = new Subject<KvarDetalj>();
    prihvati.mockReturnValue(odgovor);
    store.prihvati();
    store.prihvati();
    expect(prihvati).toHaveBeenCalledOnce();

    odgovor.next(kvar({ id: 7, status: 'prihvacen' }));
    odgovor.complete();
    expect(store.porukaAkcije()).toMatchObject({ tip: 'uspeh', tekst: 'Kvar je prihvaćen.' });
    expect(azurirani.at(-1)).toMatchObject({
      kvar: { status: 'prihvacen' },
      prethodni: { status: 'prijavljen' },
    });
  });

  it('druga akcija dok prva traje čeka red i izvrši se posle nje', () => {
    const odgovor = new Subject<KvarDetalj>();
    prihvati.mockReturnValue(odgovor);
    store.prihvati();
    store.postaviPrioritet('hitno');
    expect(store.kvar()?.prioritet).toBe('srednje');

    odgovor.next(kvar({ id: 7, status: 'prihvacen' }));
    odgovor.complete();
    expect(store.kvar()).toMatchObject({ status: 'prihvacen', prioritet: 'hitno' });
    expect(store.akcijaUToku()).toBe(false);

    prihvati.mockReturnValue(of(kvar({ id: 7, status: 'prihvacen' })));
    store.prihvati();
    expect(prihvati).toHaveBeenCalledTimes(2);
  });

  it('odgovor praćenja ne vraća stariji prikaz kad se kvar u međuvremenu osveži', () => {
    const odgovor = new Subject<StanjePracenja>();
    prati.mockReturnValue(odgovor);
    store.prati();
    nadjiKvar.mockReturnValue(of(kvar({ id: 7, status: 'resen' })));
    store.osvezi(7);

    odgovor.next({ pratim: true, brojPratilaca: 2 });
    odgovor.complete();
    expect(store.kvar()).toMatchObject({ status: 'resen', pratim: true, brojPratilaca: 2 });
  });

  it('praćenje koristi odgovor servera bez novog učitavanja kvara', () => {
    nadjiKvar.mockClear();
    store.prati();
    expect(prati).toHaveBeenCalledWith(7);
    expect(nadjiKvar).not.toHaveBeenCalled();
    expect(store.kvar()).toMatchObject({ id: 7, pratim: true, brojPratilaca: 2 });
  });
});
