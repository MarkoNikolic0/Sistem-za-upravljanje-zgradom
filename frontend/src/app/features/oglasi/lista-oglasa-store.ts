import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { withRequestStatus } from '../../shared/stanje/with-request-status';
import { withPaginacija } from '../../shared/liste/with-paginacija';
import { ucitavanjeStrane } from '../../shared/liste/ucitavanje-strane';
import { Oglas, VrstaOglasa } from './oglas-models';
import { OglasService } from './oglas-service';
import { OGLASA_PO_STRANI } from './pravila-oglasa';
import { withAkcije } from '../../shared/stanje/with-akcije';
import { zgradaIzAdrese } from '../zgrade/zgrade-korisnika';

interface ListaOglasaState {
  oglasi: Oglas[];
  vrsta: VrstaOglasa | null;
  zgradaId: number | null;
}

export const ListaOglasaStore = signalStore(
  withState<ListaOglasaState>(() => ({
    oglasi: [],
    vrsta: null,
    zgradaId: zgradaIzAdrese(),
  })),
  withRequestStatus(),
  withAkcije(),
  withPaginacija(OGLASA_PO_STRANI),
  withMethods((store, oglasService = inject(OglasService)) => {
    const { ucitaj, promeniStranu, odPrveStrane } = ucitavanjeStrane(
      store,
      (strana) =>
        oglasService.lista({
          vrsta: store.vrsta(),
          zgradaId: store.zgradaId(),
          ...strana,
        }),
      (oglasi) => ({ oglasi }),
      'Oglasi trenutno ne mogu da se učitaju.',
    );

    function zameni(oglas: Oglas): void {
      patchState(store, { oglasi: store.oglasi().map((o) => (o.id === oglas.id ? oglas : o)) });
    }

    return {
      ucitaj,
      promeniVrstu(vrsta: VrstaOglasa | null): void {
        odPrveStrane({ vrsta });
      },
      promeniZgradu(zgradaId: number | null): void {
        odPrveStrane({ zgradaId });
      },
      promeniStranu,
      obrisi(id: number): Promise<boolean> {
        return store.jednom(`obrisi-${id}`, () =>
          store.izvrsi(
            async () => {
              await firstValueFrom(oglasService.obrisi(id));
              ucitaj();
            },
            'Oglas je obrisan.',
            'Oglas nije obrisan. Pokušaj ponovo.',
            ucitaj,
          ),
        );
      },
      sakrij(id: number, razlog: string): Promise<boolean> {
        return store.jednom(`sakrij-${id}`, () =>
          store.izvrsi(
            async () => zameni(await firstValueFrom(oglasService.sakrij(id, razlog))),
            'Oglas je sakriven. Autor vidi razlog, a ostali stanari ga više ne vide.',
            'Oglas nije sakriven. Pokušaj ponovo.',
            ucitaj,
          ),
        );
      },
      obnovi(id: number): Promise<boolean> {
        return store.jednom(`obnovi-${id}`, () =>
          store.izvrsi(
            async () => zameni(await firstValueFrom(oglasService.obnovi(id))),
            'Oglas je obnovljen i ponovo ga vide svi stanari.',
            'Oglas nije obnovljen. Pokušaj ponovo.',
            ucitaj,
          ),
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
