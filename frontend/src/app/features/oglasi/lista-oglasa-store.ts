import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/with-request-status';
import { jePraznaStrana, withPaginacija } from '../../shared/with-paginacija';
import { Oglas, VrstaOglasa } from './oglas-models';
import { OglasService } from './oglas-service';
import { OGLASA_PO_STRANI } from './pravila-oglasa';
import { withAkcije } from '../../shared/with-akcije';

interface ListaOglasaState {
  oglasi: Oglas[];
  vrsta: VrstaOglasa | null;
  zgradaId: number | null;
}

export const ListaOglasaStore = signalStore(
  withState<ListaOglasaState>({
    oglasi: [],
    vrsta: null,
    zgradaId: null,
  }),
  withRequestStatus(),
  withAkcije(),
  withPaginacija(OGLASA_PO_STRANI),
  withMethods((store, oglasService = inject(OglasService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap(() =>
          oglasService
            .lista({
              vrsta: store.vrsta(),
              zgradaId: store.zgradaId(),
              strana: store.strana(),
              poStrani: store.poStrani,
            })
            .pipe(
              tapResponse({
                next: ({ stavke, ukupno }) => {
                  if (jePraznaStrana(stavke, store.strana())) {
                    patchState(store, { strana: store.strana() - 1 });
                    ucitaj();
                    return;
                  }
                  patchState(store, { oglasi: stavke, ukupno }, setFulfilled());
                },
                error: () => patchState(store, setError('Oglasi trenutno ne mogu da se učitaju.')),
              }),
            ),
        ),
      ),
    );

    function zameni(oglas: Oglas): void {
      patchState(store, { oglasi: store.oglasi().map((o) => (o.id === oglas.id ? oglas : o)) });
    }

    return {
      ucitaj,
      promeniVrstu(vrsta: VrstaOglasa | null): void {
        patchState(store, { vrsta, strana: 1 });
        ucitaj();
      },
      promeniZgradu(zgradaId: number | null): void {
        patchState(store, { zgradaId, strana: 1 });
        ucitaj();
      },
      promeniStranu(strana: number): void {
        patchState(store, { strana });
        ucitaj();
      },
      obrisi(id: number): Promise<boolean> {
        return store.izvrsi(
          async () => {
            await firstValueFrom(oglasService.obrisi(id));
            ucitaj();
          },
          'Oglas je obrisan.',
          'Oglas nije obrisan. Pokušaj ponovo.',
          ucitaj,
        );
      },
      sakrij(id: number, razlog: string): Promise<boolean> {
        return store.izvrsi(
          async () => zameni(await firstValueFrom(oglasService.sakrij(id, razlog))),
          'Oglas je sakriven. Autor vidi razlog, a ostali stanari ga više ne vide.',
          'Oglas nije sakriven. Pokušaj ponovo.',
          ucitaj,
        );
      },
      obnovi(id: number): Promise<boolean> {
        return store.izvrsi(
          async () => zameni(await firstValueFrom(oglasService.obnovi(id))),
          'Oglas je obnovljen i ponovo ga vide svi stanari.',
          'Oglas nije obnovljen. Pokušaj ponovo.',
          ucitaj,
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
