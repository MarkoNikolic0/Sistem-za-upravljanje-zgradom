import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
import { porukaServera, prvaGreskaPolja } from '../../shared/greske-servera';
import { Oglas, PorukaOglasa, VrstaOglasa } from './oglas-models';
import { OglasService } from './oglas-service';
import { OGLASA_PO_STRANI } from './pravila-oglasa';

interface ListaOglasaState {
  oglasi: Oglas[];
  vrsta: VrstaOglasa | null;
  zgradaId: number | null;
  poruka: PorukaOglasa | null;
  akcijaUToku: boolean;
}

export const ListaOglasaStore = signalStore(
  withState<ListaOglasaState>({
    oglasi: [],
    vrsta: null,
    zgradaId: null,
    poruka: null,
    akcijaUToku: false,
  }),
  withRequestStatus(),
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

    // Vraća da li je akcija uspela
    async function izvrsi(
      akcija: () => Promise<void>,
      uspeh: string,
      neuspeh: string,
    ): Promise<boolean> {
      patchState(store, { akcijaUToku: true, poruka: null });
      try {
        await akcija();
        patchState(store, { poruka: { tip: 'uspeh', tekst: uspeh } });
        return true;
      } catch (err) {
        const greska = err instanceof HttpErrorResponse ? err : null;
        patchState(store, {
          poruka: {
            tip: 'greska',
            tekst: (greska && (prvaGreskaPolja(greska) ?? porukaServera(greska))) ?? neuspeh,
          },
        });
        // Oglas je u međuvremenu obrisan ili sakriven → prikazati kako je sada
        if (greska?.status === 404 || greska?.status === 409) {
          ucitaj();
        }
        return false;
      } finally {
        patchState(store, { akcijaUToku: false });
      }
    }

    return {
      ucitaj,
      prikaziPoruku(poruka: PorukaOglasa): void {
        patchState(store, { poruka });
      },
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
        return izvrsi(
          async () => {
            await firstValueFrom(oglasService.obrisi(id));
            ucitaj();
          },
          'Oglas je obrisan.',
          'Oglas nije obrisan. Pokušaj ponovo.',
        );
      },
      sakrij(id: number, razlog: string): Promise<boolean> {
        return izvrsi(
          async () => {
            const oglas = await firstValueFrom(oglasService.sakrij(id, razlog));
            patchState(store, { oglasi: store.oglasi().map((o) => (o.id === id ? oglas : o)) });
          },
          'Oglas je sakriven. Autor vidi razlog, a ostali stanari ga više ne vide.',
          'Oglas nije sakriven. Pokušaj ponovo.',
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
