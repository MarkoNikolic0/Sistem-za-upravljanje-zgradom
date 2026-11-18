import { inject } from '@angular/core';
import { signalStore, withMethods, withState } from '@ngrx/signals';
import { Events, on, withEventHandlers, withReducer } from '@ngrx/signals/events';
import { filter, tap } from 'rxjs';
import { withRequestStatus } from '../../shared/stanje/with-request-status';
import { kvarEvents } from './kvar-events';
import { KategorijaKvara, Kvar, PrioritetKvara, StanjeKvara } from './kvar-models';
import { KvarService } from './kvar-service';
import { jeZavrsen, KVAROVA_PO_STRANI } from './pravila-kvara';
import { withPaginacija } from '../../shared/liste/with-paginacija';
import { ucitavanjeStrane } from '../../shared/liste/ucitavanje-strane';
import { zgradaIzAdrese } from '../zgrade/zgrade-korisnika';

interface ListaKvarovaState {
  kvarovi: Kvar[];
  stanje: StanjeKvara;
  kategorija: KategorijaKvara | null;
  prioritet: PrioritetKvara | null;
  zgradaId: number | null;
}

export const ListaKvarovaStore = signalStore(
  withState<ListaKvarovaState>(() => ({
    kvarovi: [],
    stanje: 'aktivni',
    kategorija: null,
    prioritet: null,
    zgradaId: zgradaIzAdrese(),
  })),
  withRequestStatus(),
  withPaginacija(KVAROVA_PO_STRANI),
  withMethods((store, kvarService = inject(KvarService)) => {
    const { ucitaj, promeniStranu, odPrveStrane } = ucitavanjeStrane(
      store,
      (strana) =>
        kvarService.lista({
          stanje: store.stanje(),
          kategorija: store.kategorija(),
          prioritet: store.prioritet(),
          zgradaId: store.zgradaId(),
          ...strana,
        }),
      (kvarovi) => ({ kvarovi }),
      'Kvarovi trenutno ne mogu da se učitaju.',
    );

    return {
      ucitaj,
      prikaziListu(): void {
        if (store.requestStatus() === 'idle') {
          ucitaj();
        }
      },
      promeniStanje(stanje: StanjeKvara): void {
        odPrveStrane({ stanje });
      },
      promeniKategoriju(kategorija: KategorijaKvara | null): void {
        odPrveStrane({ kategorija });
      },
      promeniPrioritet(prioritet: PrioritetKvara | null): void {
        odPrveStrane({ prioritet });
      },
      ponistiFiltere(): void {
        odPrveStrane({ kategorija: null, prioritet: null });
      },
      promeniZgradu(zgradaId: number | null): void {
        odPrveStrane({ zgradaId });
      },
      promeniStranu,
    };
  }),
  withReducer(
    // Novi kvar mora da se vidi, pa se filteri vraćaju na početne
    on(kvarEvents.prijavljen, () => ({
      stanje: 'aktivni' as const,
      kategorija: null,
      prioritet: null,
      strana: 1,
    })),
    on(kvarEvents.azuriran, ({ payload: { kvar } }, { kvarovi }) => ({
      kvarovi: kvarovi.map((k) => (k.id === kvar.id ? kvar : k)),
    })),
  ),
  withEventHandlers((store, events = inject(Events)) => ({
    posleNovogKvara$: events.on(kvarEvents.prijavljen).pipe(
      filter(() => store.requestStatus() !== 'idle'),
      tap(() => store.ucitaj()),
    ),
    posleIzmeneKvara$: events.on(kvarEvents.azuriran).pipe(
      filter(({ payload: { kvar, prethodni } }) => {
        if (store.requestStatus() === 'idle') {
          return false;
        }
        const uFilteru = (k: Kvar) =>
          jeZavrsen(k.status) === (store.stanje() === 'zavrseni') &&
          (store.kategorija() ?? k.kategorija) === k.kategorija &&
          (store.prioritet() ?? k.prioritet) === k.prioritet;
        if (prethodni) {
          return uFilteru(prethodni) !== uFilteru(kvar);
        }
        return !(store.kvarovi().some((k) => k.id === kvar.id) && uFilteru(kvar));
      }),
      tap(() => store.ucitaj()),
    ),
  })),
);
