import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { EMPTY, firstValueFrom, forkJoin, Observable, pipe, switchMap, timer } from 'rxjs';
import { withRequestStatus } from '../../shared/stanje/with-request-status';
import { withPaginacija } from '../../shared/liste/with-paginacija';
import { ucitavanjeStrane } from '../../shared/liste/ucitavanje-strane';
import { withAkcije } from '../../shared/stanje/with-akcije';
import { porukaServera } from '../../shared/forme/greske-servera';
import { Store } from '@ngrx/store';
import { Glasanje, StanjeGlasanja } from './glasanje-models';
import { CekaGlasActions } from './ceka-glas-store/ceka-glas-actions';
import { GlasanjeService } from './glasanje-service';
import { zgradaIzAdrese } from '../zgrade/zgrade-korisnika';
import { cekanjeDoOsvezavanja, rokProsao } from './pravila-glasanja';

const GLASANJA_PO_STRANI = 10;

export type IshodGlasa = 'zabelezen' | 'odbijen' | 'bez-veze';

interface ListaGlasanjaState {
  glasanja: Glasanje[];
  stanje: StanjeGlasanja;
  zgradaId: number | null;
  glasoviUToku: number[];
  greskaGlasa: { id: number; tekst: string } | null;
  najava: string;
}

export const ListaGlasanjaStore = signalStore(
  withState<ListaGlasanjaState>(() => ({
    glasanja: [],
    stanje: 'aktivna',
    zgradaId: zgradaIzAdrese(),
    glasoviUToku: [],
    greskaGlasa: null,
    najava: '',
  })),
  withRequestStatus(),
  withAkcije(),
  withPaginacija(GLASANJA_PO_STRANI),
  withMethods((store, glasanjeService = inject(GlasanjeService), globalniStore = inject(Store)) => {
    const { ucitaj, promeniStranu, odPrveStrane } = ucitavanjeStrane(
      store,
      (strana) =>
        glasanjeService.lista({
          stanje: store.stanje(),
          zgradaId: store.zgradaId(),
          ...strana,
        }),
      (glasanja) => ({ glasanja }),
      'Glasanja trenutno ne mogu da se učitaju.',
    );

    const osveziIstekla = rxMethod<Glasanje[]>(
      pipe(
        switchMap((glasanja) => {
          const cekanje = cekanjeDoOsvezavanja(glasanja);
          return cekanje === null ? EMPTY : timer(cekanje);
        }),
        switchMap(() => {
          const sada = Date.now();
          const istekla = store.glasanja().filter((g) => rokProsao(g, sada));
          return forkJoin(istekla.map((g) => glasanjeService.procitaj(g.id))).pipe(
            tapResponse({
              next: (nova) => {
                const poId = new Map(nova.map((g) => [g.id, g]));
                patchState(store, {
                  glasanja: store.glasanja().map((g) => poId.get(g.id) ?? g),
                });
              },
              error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                  ucitaj();
                }
              },
            }),
          );
        }),
      ),
    );

    async function promeniGlas(
      id: number,
      poziv: () => Observable<Glasanje>,
      najava: string,
    ): Promise<IshodGlasa> {
      patchState(store, {
        glasoviUToku: [...store.glasoviUToku(), id],
        greskaGlasa: null,
        najava: '',
        poruka: null,
      });
      try {
        const glasanje = await firstValueFrom(poziv());
        patchState(store, {
          glasanja: store.glasanja().map((g) => (g.id === id ? glasanje : g)),
          najava,
        });
        globalniStore.dispatch(CekaGlasActions.glasanjaPromenjena());
        return 'zabelezen';
      } catch (err) {
        const greska = err instanceof HttpErrorResponse ? err : null;
        if (greska && [403, 404, 409].includes(greska.status)) {
          patchState(store, {
            poruka: { tip: 'greska', tekst: porukaServera(greska) ?? 'Glas nije zabeležen.' },
          });
          ucitaj();
          return 'odbijen';
        }
        patchState(store, {
          greskaGlasa: { id, tekst: 'Glas nije zabeležen. Proveri vezu i pokušaj ponovo.' },
        });
        return 'bez-veze';
      } finally {
        patchState(store, { glasoviUToku: store.glasoviUToku().filter((g) => g !== id) });
      }
    }

    return {
      ucitaj,
      osveziIstekla,
      promeniStanje(stanje: StanjeGlasanja): void {
        patchState(store, { stanje, strana: 1, poruka: null });
        ucitaj();
      },
      promeniZgradu(zgradaId: number | null): void {
        odPrveStrane({ zgradaId });
      },
      promeniStranu,
      glasaj(glasanje: Glasanje, opcijaId: number): Promise<IshodGlasa> {
        const opcija = glasanje.opcije.find((o) => o.id === opcijaId);
        return promeniGlas(
          glasanje.id,
          () => glasanjeService.glasaj(glasanje.id, opcijaId),
          `Glas za „${opcija?.tekst}“ je zabeležen.`,
        );
      },
      povuciGlas(glasanje: Glasanje): Promise<IshodGlasa> {
        return promeniGlas(
          glasanje.id,
          () => glasanjeService.povuciGlas(glasanje.id),
          'Glas je povučen.',
        );
      },
      zatvori(id: number): Promise<boolean> {
        return store.jednom(`zatvori-${id}`, () =>
          store.izvrsi(
            async () => {
              await firstValueFrom(glasanjeService.zatvori(id));
              globalniStore.dispatch(CekaGlasActions.glasanjaPromenjena());
              ucitaj();
            },
            'Anketa je zatvorena. Rezultati su u Završenim.',
            'Anketa nije zatvorena. Pokušaj ponovo.',
            ucitaj,
          ),
        );
      },
      obrisi(glasanje: Glasanje): Promise<boolean> {
        const naziv = glasanje.vrsta === 'odluka' ? 'Odluka' : 'Anketa';
        return store.jednom(`obrisi-${glasanje.id}`, () =>
          store.izvrsi(
            async () => {
              await firstValueFrom(glasanjeService.obrisi(glasanje.id));
              globalniStore.dispatch(CekaGlasActions.glasanjaPromenjena());
              ucitaj();
            },
            `${naziv} je obrisana.`,
            `${naziv} nije obrisana. Pokušaj ponovo.`,
            ucitaj,
          ),
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => {
      store.ucitaj();
      store.osveziIstekla(store.glasanja);
    },
  }),
);
