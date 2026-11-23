import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom, forkJoin } from 'rxjs';
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

    let redniBroj = 0;
    const izmenjeno = new Map<number, number>();

    async function sopstvena<T>(id: number, akcija: () => Promise<T>): Promise<T> {
      izmenjeno.set(id, ++redniBroj);
      try {
        return await akcija();
      } finally {
        izmenjeno.set(id, ++redniBroj);
      }
    }

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
      async osveziOglase(ids: number[]): Promise<void> {
        const naListi = ids.filter((id) => store.oglasi().some((o) => o.id === id));
        if (naListi.length === 0) {
          return;
        }
        const pocetak = redniBroj;
        try {
          const novi = await firstValueFrom(
            forkJoin(naListi.map((id) => oglasService.procitaj(id))),
          );
          novi.filter((o) => (izmenjeno.get(o.id) ?? 0) <= pocetak).forEach((o) => zameni(o));
        } catch (err) {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            ucitaj();
          }
        }
      },
      obrisi(id: number): Promise<boolean> {
        return store.jednom(`obrisi-${id}`, () =>
          sopstvena(id, () =>
            store.izvrsi(
              async () => {
                await firstValueFrom(oglasService.obrisi(id));
                ucitaj();
              },
              'Oglas je obrisan.',
              'Oglas nije obrisan. Pokušaj ponovo.',
              ucitaj,
            ),
          ),
        );
      },
      sakrij(id: number, razlog: string): Promise<boolean> {
        return store.jednom(`sakrij-${id}`, () =>
          sopstvena(id, () =>
            store.izvrsi(
              async () => zameni(await firstValueFrom(oglasService.sakrij(id, razlog))),
              'Oglas je sakriven. Autor vidi razlog, a ostali stanari ga više ne vide.',
              'Oglas nije sakriven. Pokušaj ponovo.',
              ucitaj,
            ),
          ),
        );
      },
      obnovi(id: number): Promise<boolean> {
        return store.jednom(`obnovi-${id}`, () =>
          sopstvena(id, () =>
            store.izvrsi(
              async () => zameni(await firstValueFrom(oglasService.obnovi(id))),
              'Oglas je obnovljen i ponovo ga vide svi stanari.',
              'Oglas nije obnovljen. Pokušaj ponovo.',
              ucitaj,
            ),
          ),
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
