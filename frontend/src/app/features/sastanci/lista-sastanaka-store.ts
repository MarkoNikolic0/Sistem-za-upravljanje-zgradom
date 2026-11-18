import { inject } from '@angular/core';
import { signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { withRequestStatus } from '../../shared/stanje/with-request-status';
import { withPaginacija } from '../../shared/liste/with-paginacija';
import { ucitavanjeStrane } from '../../shared/liste/ucitavanje-strane';
import { Sastanak, StanjeSastanka } from './sastanak-models';
import { SastanakService } from './sastanak-service';
import { zgradaIzAdrese } from '../zgrade/zgrade-korisnika';

const SASTANAKA_PO_STRANI = 10;

interface ListaSastanakaState {
  sastanci: Sastanak[];
  stanje: StanjeSastanka;
  zgradaId: number | null;
}

export const ListaSastanakaStore = signalStore(
  withState<ListaSastanakaState>(() => ({
    sastanci: [],
    stanje: 'predstojeci',
    zgradaId: zgradaIzAdrese(),
  })),
  withRequestStatus(),
  withPaginacija(SASTANAKA_PO_STRANI),
  withMethods((store, sastanakService = inject(SastanakService)) => {
    const { ucitaj, promeniStranu, odPrveStrane } = ucitavanjeStrane(
      store,
      (strana) =>
        sastanakService.lista({
          stanje: store.stanje(),
          zgradaId: store.zgradaId(),
          ...strana,
        }),
      (sastanci) => ({ sastanci }),
      'Sastanci trenutno ne mogu da se učitaju.',
    );

    return {
      ucitaj,
      promeniStanje(stanje: StanjeSastanka): void {
        odPrveStrane({ stanje });
      },
      promeniZgradu(zgradaId: number | null): void {
        odPrveStrane({ zgradaId });
      },
      promeniStranu,
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
