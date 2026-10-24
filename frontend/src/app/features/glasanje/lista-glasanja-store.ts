import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, Observable, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/with-request-status';
import { jePraznaStrana, withPaginacija } from '../../shared/with-paginacija';
import { withAkcije } from '../../shared/with-akcije';
import { porukaServera } from '../../shared/greske-servera';
import { Glasanje, StanjeGlasanja } from './glasanje-models';
import { GlasanjeService } from './glasanje-service';

const GLASANJA_PO_STRANI = 10;

interface ListaGlasanjaState {
  glasanja: Glasanje[];
  stanje: StanjeGlasanja;
  zgradaId: number | null;
  glasanjeUToku: number | null;
  greskaGlasa: { id: number; tekst: string } | null;
  najava: string;
}

export const ListaGlasanjaStore = signalStore(
  withState<ListaGlasanjaState>({
    glasanja: [],
    stanje: 'aktivna',
    zgradaId: null,
    glasanjeUToku: null,
    greskaGlasa: null,
    najava: '',
  }),
  withRequestStatus(),
  withAkcije(),
  withPaginacija(GLASANJA_PO_STRANI),
  withMethods((store, glasanjeService = inject(GlasanjeService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, setPending())),
        switchMap(() =>
          glasanjeService
            .lista({
              stanje: store.stanje(),
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
                  patchState(store, { glasanja: stavke, ukupno }, setFulfilled());
                },
                error: () => patchState(store, setError('Ankete trenutno ne mogu da se učitaju.')),
              }),
            ),
        ),
      ),
    );

    // Glas menja samo jednu karticu, pa uspeh i greška ostaju u njoj (bez poruke iznad liste).
    // Vraća false kad je poruka iznad liste, da bi komponenta prebacila fokus na nju.
    async function promeniGlas(
      id: number,
      poziv: () => Observable<Glasanje>,
      najava: string,
    ): Promise<boolean> {
      patchState(store, { glasanjeUToku: id, greskaGlasa: null, najava: '', poruka: null });
      try {
        const glasanje = await firstValueFrom(poziv());
        patchState(store, {
          glasanja: store.glasanja().map((g) => (g.id === id ? glasanje : g)),
          najava,
        });
        return true;
      } catch (err) {
        const greska = err instanceof HttpErrorResponse ? err : null;
        // Anketa je u međuvremenu završena, obrisana ili više nije dostupna
        if (greska && [403, 404, 409].includes(greska.status)) {
          patchState(store, {
            poruka: { tip: 'greska', tekst: porukaServera(greska) ?? 'Glas nije zabeležen.' },
          });
          ucitaj();
          return false;
        }
        patchState(store, {
          greskaGlasa: { id, tekst: 'Glas nije zabeležen. Proveri vezu i pokušaj ponovo.' },
        });
        return true;
      } finally {
        patchState(store, { glasanjeUToku: null });
      }
    }

    return {
      ucitaj,
      promeniStanje(stanje: StanjeGlasanja): void {
        patchState(store, { stanje, strana: 1, poruka: null });
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
      glasaj(glasanje: Glasanje, opcijaId: number): Promise<boolean> {
        const opcija = glasanje.opcije.find((o) => o.id === opcijaId);
        return promeniGlas(
          glasanje.id,
          () => glasanjeService.glasaj(glasanje.id, opcijaId),
          `Glas za „${opcija?.tekst}“ je zabeležen.`,
        );
      },
      povuciGlas(glasanje: Glasanje): Promise<boolean> {
        return promeniGlas(
          glasanje.id,
          () => glasanjeService.povuciGlas(glasanje.id),
          'Glas je povučen.',
        );
      },
      zatvori(id: number): Promise<boolean> {
        return store.izvrsi(
          async () => {
            await firstValueFrom(glasanjeService.zatvori(id));
            ucitaj();
          },
          'Anketa je zatvorena. Rezultati su u Završenim.',
          'Anketa nije zatvorena. Pokušaj ponovo.',
          ucitaj,
        );
      },
      obrisi(id: number): Promise<boolean> {
        return store.izvrsi(
          async () => {
            await firstValueFrom(glasanjeService.obrisi(id));
            ucitaj();
          },
          'Anketa je obrisana.',
          'Anketa nije obrisana. Pokušaj ponovo.',
          ucitaj,
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => store.ucitaj(),
  }),
);
